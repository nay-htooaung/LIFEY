import { describe, expect, it } from 'vitest'
import { sseChunks, toGemini, translator, type OpenAiMsg } from './gemini'

const tools = [
  { function: { name: 'get_overview', description: 'Overview' } },
  { function: { name: 'propose_entry', description: 'Propose', parameters: { type: 'object', properties: { amount: { type: 'integer' } } } } },
]

describe('Gemini requests', () => {
  it('turns the conversation into alternating turns with signed calls and their results', () => {
    const msgs: OpenAiMsg[] = [
      { role: 'user', content: 'Lunch 980' },
      { role: 'assistant', content: null, tool_calls: [
        { id: 'call_0', function: { name: 'get_overview', arguments: '{}' }, extra_content: { google: { thought_signature: 'sig' } } },
        { id: 'call_1', function: { name: 'propose_entry', arguments: '{"amount":980}' } },
      ] },
      { role: 'tool', tool_call_id: 'call_0', content: '{"today":"2026-10-24"}' },
      { role: 'tool', tool_call_id: 'call_1', content: '[1,2]' },
      { role: 'user', content: '[app] applied' },
      // a call made by another model has no signature
      { role: 'assistant', content: null, tool_calls: [{ id: 'call_9', function: { name: 'get_overview', arguments: '' } }] },
    ]
    const body = toGemini('System', msgs, tools, 'gemini-3.8-flash')
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'System' }] })
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Lunch 980' }] },
      { role: 'model', parts: [
        { functionCall: { name: 'get_overview', args: {} }, thoughtSignature: 'sig' },
        { functionCall: { name: 'propose_entry', args: { amount: 980 } } },
      ] },
      // both results and the note after them form one user turn
      { role: 'user', parts: [
        { functionResponse: { name: 'get_overview', response: { today: '2026-10-24' } } },
        { functionResponse: { name: 'propose_entry', response: { result: [1, 2] } } },
        { text: '[app] applied' },
      ] },
      { role: 'model', parts: [{ functionCall: { name: 'get_overview', args: {} }, thoughtSignature: 'skip_thought_signature_validator' }] },
    ])
    expect(body.tools[0].functionDeclarations).toEqual([
      { name: 'get_overview', description: 'Overview' },
      { name: 'propose_entry', description: 'Propose', parametersJsonSchema: tools[1].function.parameters },
    ])
    expect(body.generationConfig.thinkingConfig).toEqual({ includeThoughts: true, thinkingLevel: 'low' })
    expect(toGemini('S', msgs, tools, 'gemini-2.5-flash').contents.at(-1)).toEqual({ role: 'model', parts: [{ functionCall: { name: 'get_overview', args: {} } }] })
    expect(toGemini('S', msgs, tools, 'gemini-2.5-flash').generationConfig.thinkingConfig).toEqual({ includeThoughts: true, thinkingBudget: 1024 })
    expect(toGemini('S', msgs, tools, 'gemini-3.8-flash', false).generationConfig).toEqual({ maxOutputTokens: 4000 })
  })
})

describe('Gemini photos', () => {
  it('sends a photo inline with its words', () => {
    const body = toGemini('S', [{ role: 'user', content: [
      { type: 'text', text: 'Log this receipt.' }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,QUJD' } },
    ] }], tools, 'gemini-3.6-flash')
    expect(body.contents).toEqual([{ role: 'user', parts: [{ text: 'Log this receipt.' }, { inlineData: { mimeType: 'image/jpeg', data: 'QUJD' } }] }])
  })
})

describe('Gemini replies', () => {
  it('becomes the app events: thinking, text and signed tool calls', () => {
    const t = translator()
    const parse = (s: string) => s.trim().split('\n\n').map((l) => JSON.parse(l.slice(6)))
    expect(parse(t({ candidates: [{ content: { parts: [{ text: '**Checking**', thought: true }, { text: 'Hi' }] } }] }))).toEqual([
      { choices: [{ delta: { thinking: '**Checking**' } }] },
      { choices: [{ delta: { content: 'Hi' } }] },
    ])
    const a = parse(t({ candidates: [{ content: { parts: [{ functionCall: { name: 'get_overview', args: {} }, thoughtSignature: 's1' }] } }] }))
    const b = parse(t({ candidates: [{ content: { parts: [{ functionCall: { name: 'list_entries', args: { month: '2026-10' } } }] } }] }))
    expect(a[0].choices[0].delta.tool_calls[0]).toEqual({
      index: 0, id: 'call_0', type: 'function', function: { name: 'get_overview', arguments: '{}' }, extra_content: { google: { thought_signature: 's1' } },
    })
    // calls keep counting across chunks
    expect(b[0].choices[0].delta.tool_calls[0]).toMatchObject({ index: 1, id: 'call_1', function: { arguments: '{"month":"2026-10"}' } })
    expect(parse(t({ error: { code: 429 } }))).toEqual([{ error: { code: 'model_busy' } }])
    expect(t({ candidates: [{ finishReason: 'STOP' }] })).toBe('')
  })
  it('reads the SSE stream across chunk boundaries', async () => {
    const text = 'data: {"candidates":[{"content":{"parts":[{"text":"He"}]}}]}\r\n\r\ndata: {"candidates":[{"content":{"parts":[{"text":"llo"}]}}]}\r\n\r\n'
    const enc = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < text.length; i += 9) c.enqueue(enc.encode(text.slice(i, i + 9)))
        c.close()
      },
    })
    const got: string[] = []
    for await (const ch of sseChunks(body)) got.push((ch.candidates![0].content!.parts![0] as { text: string }).text)
    expect(got).toEqual(['He', 'llo'])
  })
})

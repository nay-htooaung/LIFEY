// Talks to Gemini's native streaming API (streamGenerateContent), which sends text as it is written, and
// translates both ways so the app keeps speaking the OpenAI chat format it already reads:
//   app messages + tools  ->  Gemini contents + functionDeclarations
//   Gemini stream chunks  ->  `data: {"choices":[{"delta":...}]}` events
// Gemini 3 signs its function calls ("thought signatures"); they travel to the app in a call's extra_content and
// must come back on the same call.

export type UserPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
export interface OpenAiMsg {
  role: 'user' | 'assistant' | 'tool'
  /** A user message with a photo is a list of parts. */
  content: string | null | UserPart[]
  tool_calls?: { id: string; function: { name: string; arguments: string }; extra_content?: { google?: { thought_signature?: string } } }[]
  tool_call_id?: string
}
export interface OpenAiTool { function: { name: string; description: string; parameters?: unknown } }

type Part =
  | { text: string; thought?: boolean; thoughtSignature?: string }
  | { inlineData: { mimeType: string; data: string } }
  | { functionCall: { name: string; args: unknown }; thoughtSignature?: string }
  | { functionResponse: { name: string; response: Record<string, unknown> } }
interface Content { role: 'user' | 'model'; parts: Part[] }

const parse = (s: string): unknown => {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

/** The request body for streamGenerateContent. */
export function toGemini(system: string, messages: OpenAiMsg[], tools: readonly OpenAiTool[], model: string, thinking = true) {
  const gen3 = /^gemini-([3-9]|\d\d)/.test(model)
  const names = new Map<string, string>()
  const contents: Content[] = []
  const push = (role: Content['role'], parts: Part[]) => {
    if (!parts.length) return
    const last = contents.at(-1)
    // Gemini wants turns to alternate; consecutive ones of the same side are one turn
    if (last?.role === role) last.parts.push(...parts)
    else contents.push({ role, parts })
  }
  for (const m of messages) {
    if (m.role === 'user') {
      push('user', Array.isArray(m.content)
        ? m.content.map((p): Part => {
          if (p.type === 'text') return { text: p.text }
          // data:image/jpeg;base64,....
          const [, mimeType = 'image/jpeg', data = ''] = p.image_url.url.match(/^data:([^;]+);base64,(.*)$/) ?? []
          return { inlineData: { mimeType, data } }
        })
        : [{ text: m.content ?? '' }])
    }
    else if (m.role === 'assistant') {
      const parts: Part[] = typeof m.content === 'string' && m.content ? [{ text: m.content }] : []
      for (const [i, tc] of (m.tool_calls ?? []).entries()) {
        names.set(tc.id, tc.function.name)
        // Gemini 3 wants the first call of a step signed; a call another model made gets the documented stand-in
        const sig = tc.extra_content?.google?.thought_signature ?? (i === 0 && gen3 ? 'skip_thought_signature_validator' : undefined)
        parts.push({ functionCall: { name: tc.function.name, args: parse(tc.function.arguments || '{}') }, ...(sig ? { thoughtSignature: sig } : {}) })
      }
      push('model', parts)
    } else {
      const result = parse(typeof m.content === 'string' ? m.content : '')
      const response = result && typeof result === 'object' && !Array.isArray(result) ? (result as Record<string, unknown>) : { result }
      push('user', [{ functionResponse: { name: names.get(m.tool_call_id ?? '') ?? 'unknown', response } }])
    }
  }
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    tools: [{
      functionDeclarations: tools.map(({ function: f }) => ({
        name: f.name, description: f.description, ...(f.parameters ? { parametersJsonSchema: f.parameters } : {}),
      })),
    }],
    generationConfig: {
      maxOutputTokens: 4000,
      // think briefly and say what it is thinking about, so the wait shows progress
      ...(thinking ? { thinkingConfig: { includeThoughts: true, ...(gen3 ? { thinkingLevel: 'low' } : { thinkingBudget: 1024 }) } } : {}),
    },
  }
}

export interface Chunk {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]
  error?: { code?: number; message?: string; status?: string }
}

/** Turns Gemini's stream chunks into the app's events. Keeps count of tool calls across chunks. */
export function translator() {
  let calls = 0
  const ev = (delta: unknown) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
  return (chunk: Chunk): string => {
    if (chunk.error) return `data: ${JSON.stringify({ error: { code: chunk.error.code === 429 || chunk.error.code === 503 ? 'model_busy' : `model_${chunk.error.code ?? 'error'}` } })}\n\n`
    let out = ''
    for (const p of chunk.candidates?.[0]?.content?.parts ?? []) {
      if ('functionCall' in p) {
        const i = calls++
        out += ev({
          tool_calls: [{
            index: i, id: `call_${i}`, type: 'function',
            function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args ?? {}) },
            ...(p.thoughtSignature ? { extra_content: { google: { thought_signature: p.thoughtSignature } } } : {}),
          }],
        })
      } else if ('text' in p && p.text) {
        out += ev(p.thought ? { thinking: p.text } : { content: p.text })
      }
    }
    return out
  }
}

/** The `data:` payloads of an SSE stream, as text. */
export async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (value) buf += value
    const lines = buf.split(/\r?\n/)
    buf = done ? '' : (lines.pop() ?? '')
    for (const l of lines) if (l.startsWith('data:')) yield l.slice(5).trim()
    if (done) return
  }
}

/** Reads Gemini's `alt=sse` stream: one JSON chunk per `data:` line. */
export async function* sseChunks(body: ReadableStream<Uint8Array>): AsyncGenerator<Chunk> {
  for await (const data of sseLines(body)) {
    try {
      yield JSON.parse(data)
    } catch {
      /* a partial or odd line */
    }
  }
}

import { describe, expect, it } from 'vitest'
import { pickModels } from './models'

const m = (id: string, x: Partial<{ displayName: string; supportedGenerationMethods: string[]; inputTokenLimit: number }> = {}) =>
  ({ name: `models/${id}`, supportedGenerationMethods: ['generateContent'], ...x })

describe('assistant models', () => {
  const list = [
    m('gemini-3.6-flash', { displayName: 'Gemini 3.6 Flash', inputTokenLimit: 1048576 }),
    m('gemini-3.8-flash-lite', { displayName: 'Gemini 3.8 Flash-Lite' }),
    m('gemini-3.8-flash-preview-11-2026'),
    m('gemini-3.8-flash', { displayName: 'Gemini 3.8 Flash' }),
    m('gemini-3.1-pro-preview'),
    m('gemini-3.8-flash-image'),
    m('gemini-3.8-flash-tts'),
    m('gemini-flash-latest'),
    m('gemma-4-27b-it'),
    m('gemini-embedding-002', { supportedGenerationMethods: ['embedContent'] }),
    m('gemini-3.5-flash-live', { supportedGenerationMethods: ['bidiGenerateContent'] }),
  ]
  it('offers free Flash chat models, newest full Flash first', () => {
    expect(pickModels(list)).toEqual({
      models: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
        { id: 'gemini-3.8-flash-preview-11-2026', name: 'gemini-3.8-flash-preview-11-2026' },
        { id: 'gemini-3.8-flash-lite', name: 'Gemini 3.8 Flash-Lite' },
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', context: 1048576 },
      ],
      recommended: 'gemini-3.8-flash',
    })
  })
  it('recommends a preferred model when it is offered', () => {
    expect(pickModels(list, ['gemini-3.6-flash']).recommended).toBe('gemini-3.6-flash')
    expect(pickModels(list, ['gemini-3.1-pro-preview']).recommended).toBe('gemini-3.8-flash')
    expect(pickModels([])).toEqual({ models: [], recommended: null })
  })
})

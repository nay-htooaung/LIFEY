import { describe, expect, it } from 'vitest'
import { bareId, goModels, pickModels, providerOf } from './models'

describe('assistant models', () => {
  const catalogue = {
    'kimi-k3': { name: 'Kimi K3', tool_call: true, modalities: { input: ['text', 'image'] } },
    'glm-5.3': { name: 'GLM-5.3', tool_call: true, provider: { npm: '@ai-sdk/openai-compatible' } },
    'claude-haiku-5.5': { name: 'Claude Haiku 5.5', provider: { npm: '@ai-sdk/anthropic' } },
    'gpt-6-luna': { name: 'GPT 6 Luna', provider: { npm: '@ai-sdk/openai' } },
    'no-tools': { tool_call: false },
    'old': { status: 'deprecated' },
  }
  it('offers Go models that speak chat/completions and call tools', () => {
    const live = ['kimi-k3', 'glm-5.3', 'claude-haiku-5.5', 'gpt-6-luna', 'no-tools', 'old', 'new-one', 'grok-4.7']
    expect(goModels(live, catalogue)).toEqual([
      { id: 'go:kimi-k3', name: 'Kimi K3', provider: 'go', vision: true },
      { id: 'go:glm-5.3', name: 'GLM-5.3', provider: 'go', vision: false },
      // not in the catalogue yet: kept unless its name says another format
      { id: 'go:new-one', name: 'new-one', provider: 'go', vision: false },
    ])
  })
  it('lists both providers, preferred first', () => {
    const go = goModels(['glm-5.3', 'kimi-k3'], catalogue)
    expect(pickModels(go, ['gemini-3.6-flash'], ['go:kimi-k3', 'gemini:gemini-3.6-flash'])).toEqual({
      models: [
        { id: 'go:kimi-k3', name: 'Kimi K3', provider: 'go', vision: true },
        { id: 'gemini:gemini-3.6-flash', name: 'Gemini 3.6 Flash', provider: 'gemini', vision: true },
        { id: 'go:glm-5.3', name: 'GLM-5.3', provider: 'go', vision: false },
      ],
      recommended: 'go:kimi-k3',
    })
    // without Go, Gemini alone
    expect(pickModels([], ['gemini-3.6-flash'], ['go:kimi-k3']).recommended).toBe('gemini:gemini-3.6-flash')
    expect(pickModels([], [])).toEqual({ models: [], recommended: null })
  })
  it('reads the provider from the id', () => {
    expect([providerOf('go:kimi-k3'), providerOf('gemini:gemini-3.6-flash'), providerOf('kimi-k3')]).toEqual(['go', 'gemini', null])
    expect(bareId('gemini:gemini-3.6-flash')).toBe('gemini-3.6-flash')
  })
})

import { describe, expect, it } from 'vitest'
import { pickModels } from './models'

const free = { cost: { input: 0, output: 0 }, tool_call: true }
describe('assistant models', () => {
  const catalogue = {
    'big-pickle': { ...free, name: 'Big Pickle', reasoning: true, limit: { context: 200000 } },
    'mimo-free': { ...free, name: 'MiMo Free', limit: { context: 256000 } },
    'chat-free': { ...free, name: 'No tools', tool_call: false },
    'claude-free': { ...free, provider: { npm: '@ai-sdk/anthropic' } },
    'kimi-k3': { cost: { input: 0.6, output: 2.5 }, tool_call: true },
    'old-free': { ...free, status: 'deprecated' },
    'gone-free': free,
  }
  it('offers only free models that can call tools through chat/completions, best first', () => {
    const live = ['big-pickle', 'mimo-free', 'chat-free', 'claude-free', 'kimi-k3', 'old-free', 'new-free']
    expect(pickModels(live, catalogue)).toEqual({
      models: [
        { id: 'big-pickle', name: 'Big Pickle', context: 200000 },
        { id: 'mimo-free', name: 'MiMo Free', context: 256000 },
        // not in the catalogue yet: free by its name
        { id: 'new-free', name: 'new-free' },
      ],
      recommended: 'big-pickle',
    })
  })
  it('falls back to either list alone', () => {
    expect(pickModels(['kimi-k3', 'x-free'], null).models.map((m) => m.id)).toEqual(['x-free'])
    expect(pickModels(null, catalogue).models.map((m) => m.id)).toEqual(['big-pickle', 'mimo-free', 'gone-free'])
    expect(pickModels(null, null)).toEqual({ models: [], recommended: null })
  })
})

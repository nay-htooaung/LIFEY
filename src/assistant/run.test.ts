import { describe, expect, it } from 'vitest'
import type { Entry, PaymentMethod, Snapshot, Source } from '../domain/types'
import { buildEntry, readStream, runTool, streamAccumulator, trimHistory, within, type ApiMsg, type ToolCtx } from './run'

const src = (id: string, kind: Source['kind'], spaceId = 'me'): Source =>
  ({ id, spaceId, name: id, kind, openingBalance: 1000, createdOn: '2026-01-01', archived: false, fixed: false })
const visa: PaymentMethod = { id: 'visa', spaceId: 'me', name: 'Visa', kind: 'credit', sourceId: 'chk', creditLimit: null, limitSharedWith: null, closingDay: 15, paymentDay: 10, archived: false }
const lunch: Entry = {
  id: 'lunch', spaceId: 'me', kind: 'expense', amount: 1200, categoryId: 'food', methodId: 'visa', sourceId: null, toSourceId: null, fee: 0,
  occurredOn: '2026-10-20', name: 'Lunch', note: '', tags: [], repeat: 'none', repeatOf: null, createdBy: 'u1',
}
const snap = {
  me: { id: 'u1' }, spaces: [{ id: 'me', name: 'Me', kind: 'personal', memberIds: ['u1'] }, { id: 'home', name: 'Home', kind: 'household', memberIds: ['u1', 'u2'] }],
  sources: [src('chk', 'bank'), src('cash', 'cash'), src('pp', 'emoney')], methods: [visa],
  categories: [{ id: 'food', spaceId: 'me', name: 'Food', color: '', kind: 'expense', monthlyBudget: 0, sort: 0 }, { id: 'pay', spaceId: 'me', name: 'Pay', color: '', kind: 'income', monthlyBudget: 0, sort: 1 }],
  entries: [lunch, { ...lunch, id: 'rent', repeat: 'monthly' }], flows: [], profiles: {}, deletedSpaces: [],
} as unknown as Snapshot
const c = { snap, space: snap.spaces[0], today: '2026-10-23' }

describe('assistant proposals', () => {
  it('builds a new expense with defaults', () => {
    expect(buildEntry({ kind: 'expense', amount: 980, method_id: 'visa', category_id: 'food' }, undefined, c)).toMatchObject({
      spaceId: 'me', kind: 'expense', amount: 980, methodId: 'visa', sourceId: null, occurredOn: '2026-10-23', repeat: 'none',
    })
  })
  it('refuses what the app would refuse', () => {
    const bad = (a: Record<string, unknown>) => buildEntry({ kind: 'expense', amount: 500, method_id: 'visa', ...a }, undefined, c)
    expect(bad({ amount: 12.5 })).toMatch(/whole/)
    expect(bad({ amount: -3 })).toMatch(/positive/)
    expect(bad({ source_id: 'cash' })).toMatch(/exactly one/)
    expect(bad({ method_id: 'nope' })).toMatch(/unknown method/)
    expect(bad({ category_id: 'pay' })).toMatch(/for income/)
    expect(bad({ space_id: 'home', category_id: 'food' })).toMatch(/same space/)
    expect(bad({ date: '23/10' })).toMatch(/YYYY-MM-DD/)
    expect(buildEntry({ kind: 'income', amount: 1, method_id: 'visa' }, undefined, c)).toMatch(/source_id/)
    expect(buildEntry({ kind: 'transfer', amount: 1, source_id: 'chk', to_source_id: 'chk' }, undefined, c)).toMatch(/different/)
    expect(buildEntry({ kind: 'transfer', amount: 1, method_id: 'visa', to_source_id: 'cash' }, undefined, c)).toMatch(/e-money/)
  })
  it('lets a card charge e-money', () => {
    expect(buildEntry({ kind: 'transfer', amount: 3000, method_id: 'visa', to_source_id: 'pp' }, undefined, c)).toMatchObject({ methodId: 'visa', sourceId: null, toSourceId: 'pp', categoryId: null })
  })
  it('edits only the fields given, switching how it was paid', () => {
    expect(buildEntry({ source_id: 'pp' }, lunch, c)).toMatchObject({ amount: 1200, name: 'Lunch', methodId: null, sourceId: 'pp', categoryId: 'food' })
    expect(buildEntry({ amount: 1500 }, lunch, c)).toMatchObject({ amount: 1500, methodId: 'visa' })
  })
  it('puts proposals in the tray and leaves repeating entries alone', async () => {
    const ctx: ToolCtx = { ...c, repo: {} as ToolCtx['repo'], person: () => 'You', paidWith: () => 'Visa', seen: new Map() }
    const add = await runTool('propose_entry', '{"kind":"expense","amount":500,"source_id":"cash"}', ctx)
    expect(add.change).toMatchObject({ op: 'add', after: { amount: 500, sourceId: 'cash' } })
    expect((await runTool('propose_delete', '{"entry_id":"lunch"}', ctx)).change).toMatchObject({ op: 'delete', before: { id: 'lunch' } })
    const rent = await runTool('propose_edit', '{"entry_id":"rent","amount":1}', ctx)
    expect(rent.change).toBeUndefined()
    expect(rent.content).toMatch(/Edit schedule/)
    expect((await runTool('propose_entry', '{bad', ctx)).content).toMatch(/not valid JSON/)
  })
})

describe('assistant stream', () => {
  it('collects text and tool calls split across chunks', () => {
    const seen: string[] = []
    const acc = streamAccumulator((t) => seen.push(t))
    const ev = (delta: unknown) => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
    const all = ev({ content: 'Hel' }) + ev({ content: 'lo' }) +
      ev({ tool_calls: [{ index: 0, id: 'a', function: { name: 'list_', arguments: '{"mon' } }] }) +
      ev({ tool_calls: [{ index: 0, function: { name: 'entries', arguments: 'th":"2026-10"}' } }] }) +
      ev({ tool_calls: [{ index: 1, id: 'b', function: { name: 'get_overview', arguments: '' }, extra_content: { google: { thought_signature: 'sig' } } }] }) + 'data: [DONE]\n'
    // arbitrary chunk boundaries, even inside a line
    for (let i = 0; i < all.length; i += 7) acc.push(all.slice(i, i + 7))
    const out = acc.finish()
    expect(out.text).toBe('Hello')
    expect(seen).toEqual(['Hel', 'Hello'])
    expect(out.toolCalls).toEqual([
      { id: 'a', type: 'function', function: { name: 'list_entries', arguments: '{"month":"2026-10"}' } },
      // Gemini's thought signature goes back with the call
      { id: 'b', type: 'function', function: { name: 'get_overview', arguments: '' }, extra_content: { google: { thought_signature: 'sig' } } },
    ])
  })
  it('trims whole turns from the start', () => {
    const msgs: ApiMsg[] = [
      { role: 'user', content: '1' }, { role: 'assistant', content: null, tool_calls: [] }, { role: 'tool', tool_call_id: 'x', content: '' },
      { role: 'user', content: '2' }, { role: 'assistant', content: 'ok' },
    ]
    expect(trimHistory(msgs, 3)).toEqual(msgs.slice(3))
    expect(trimHistory(msgs, 10)).toBe(msgs)
  })
})

describe('assistant waits', () => {
  it('ends a stuck wait with its code', async () => {
    await expect(within(new Promise(() => {}), 10, 'session_timeout')).rejects.toMatchObject({ code: 'session_timeout' })
    await expect(within(Promise.resolve(1), 10, 'x')).resolves.toBe(1)
  })
  it('ends a stream that stops sending', async () => {
    const enc = new TextEncoder()
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n')) } })
    await expect(readStream(body, () => {}, 20)).rejects.toMatchObject({ code: 'stalled' })
  })
})

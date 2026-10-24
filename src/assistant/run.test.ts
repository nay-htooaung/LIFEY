import { describe, expect, it } from 'vitest'
import type { Entry, PaymentMethod, Snapshot, Source } from '../domain/types'
import { makeI18n } from '../i18n'
import type { SetupChange } from './setup'
import { buildEntry, dropOldPhotos, readStream, runTool, streamAccumulator, trimHistory, within, type ApiMsg, type ToolCtx } from './run'

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
  pots: [{ id: 'trip', spaceId: 'me', name: 'Trip', color: '#000', goal: 150000, monthly: 10000, sort: 1, archived: false }], potMoves: [],
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
    const ctx: ToolCtx = { ...c, repo: {} as ToolCtx['repo'], person: () => 'You', paidWith: () => 'Visa', seen: new Map(), t: makeI18n('en').t, tray: [] }
    const add = await runTool('propose_entry', '{"kind":"expense","amount":500,"source_id":"cash"}', ctx)
    expect(add.change).toMatchObject({ op: 'add', after: { amount: 500, sourceId: 'cash' } })
    expect((await runTool('propose_delete', '{"entry_id":"lunch"}', ctx)).change).toMatchObject({ op: 'delete', before: { id: 'lunch' } })
    const rent = await runTool('propose_edit', '{"entry_id":"rent","amount":1}', ctx)
    expect(rent.change).toBeUndefined()
    expect(rent.content).toMatch(/propose_schedule/)
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

describe('assistant photos', () => {
  it('sends only the newest photo again', () => {
    const photo = (text: string): ApiMsg => ({ role: 'user', content: [{ type: 'text', text }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AA' } }] })
    const msgs: ApiMsg[] = [photo('first'), { role: 'assistant', content: 'ok' }, photo('second'), { role: 'assistant', content: 'ok' }]
    const out = dropOldPhotos(msgs)
    expect(out[0]).toEqual({ role: 'user', content: 'first\n(a photo sent earlier)' })
    expect(out[2]).toBe(msgs[2])
  })
  it('tells which model answered', () => {
    const by: string[] = []
    const acc = streamAccumulator(() => {}, undefined, (id) => by.push(id))
    acc.push('data: {"answered_by":"gemini:gemini-3.6-flash"}\n\n')
    acc.finish()
    expect(by).toEqual(['gemini:gemini-3.6-flash'])
  })
})

describe('assistant setup proposals', () => {
  const t = makeI18n('ja').t
  const cash: Source = { ...src('cash0', 'cash'), fixed: true }
  const s2 = {
    ...snap, me: { id: 'u1', displayName: 'You', locale: 'ja', theme: 'midnight', avatar: null }, profiles: {},
    sources: [...snap.sources, cash], deletedSpaces: [{ id: 'old', name: 'Old', kind: 'household', ownerId: 'u1', memberIds: [] }],
    spaces: [...snap.spaces.map((x) => ({ ...x, ownerId: 'u1' })), { id: 'theirs', name: 'Theirs', kind: 'household', ownerId: 'u2', memberIds: ['u1', 'u2'] }],
  } as unknown as Snapshot
  const ctx = (tray: ToolCtx['tray'] = []): ToolCtx =>
    ({ snap: s2, space: s2.spaces[0], today: '2026-10-23', repo: {} as ToolCtx['repo'], person: (id) => id, paidWith: () => '', seen: new Map(), t, tray })
  /** A repo that records what is called. */
  const recorder = () => {
    const calls: string[] = []
    const repo = new Proxy({}, { get: (_, k: string) => async (...args: unknown[]) => { calls.push(`${k} ${JSON.stringify(args)}`); return `id-${calls.length}` } })
    return { calls, repo: repo as ToolCtx['repo'] }
  }

  it('creates a source, then an entry paid from it before it exists', async () => {
    const tray: ToolCtx['tray'] = []
    const made = await runTool('propose_source', '{"action":"create","name":"PayPay","kind":"emoney","opening_balance":3000}', ctx(tray))
    const { id } = JSON.parse(made.content)
    expect(id).toMatch(/^new:/)
    tray.push(made.change!)
    const entry = await runTool('propose_entry', JSON.stringify({ kind: 'expense', amount: 1088, source_id: id }), ctx(tray))
    expect(entry.change).toMatchObject({ op: 'add', after: { sourceId: id } })
    // without the tray the id means nothing
    expect((await runTool('propose_entry', JSON.stringify({ kind: 'expense', amount: 1, source_id: id }), ctx())).content).toMatch(/unknown source_id/)
    const { calls, repo } = recorder()
    const run = await (made.change as SetupChange).run(repo, (x) => x)
    expect(calls).toEqual(['addSource [{"spaceId":"me","name":"PayPay","kind":"emoney","openingBalance":3000}]'])
    expect(run.created).toBe('id-1')
    await run.undo!(repo)
    expect(calls[1]).toBe('setSourceArchived ["id-1",true]')
  })
  it('keeps the rules the app keeps', async () => {
    const say = async (tool: string, args: object) => (await runTool(tool, JSON.stringify(args), ctx())).content
    expect(await say('propose_source', { action: 'delete', source_id: 'cash0' })).toMatch(/cannot be deleted/)
    expect(await say('propose_source', { action: 'update', source_id: 'cash0', name: 'Wallet' })).toMatch(/keeps its name/)
    expect(await say('propose_source', { action: 'delete', source_id: 'chk' })).toMatch(/Visa/)
    expect(await say('propose_method', { action: 'create', name: 'Card', kind: 'credit', source_id: 'chk' })).toMatch(/closing_day/)
    expect(await say('propose_method', { action: 'delete', method_id: 'visa' })).toMatch(/proposed/)
    expect(await say('propose_space', { action: 'leave', space_id: 'home' })).toMatch(/owner cannot leave/)
    expect(await say('propose_space', { action: 'delete', space_id: 'theirs' })).toMatch(/only the owner/)
    expect(await say('propose_space', { action: 'delete', space_id: 'me' })).toMatch(/personal space/)
    expect(await say('propose_space', { action: 'restore', space_id: 'old' })).toMatch(/proposed/)
    expect(await say('propose_category', { action: 'update', category_id: 'food' })).toMatch(/nothing changes/)
    expect(await say('propose_profile', { theme: 'neon' })).toMatch(/theme must be/)
    // a cut-short call is told what is missing
    expect(await say('propose_category', { action: 'update' })).toMatch(/category_id is missing/)
    expect(await say('propose_edit', { amount: 5 })).toMatch(/entry_id is missing/)
  })
  it('describes each change for the tray, in the app language', async () => {
    const r = await runTool('propose_category', '{"action":"update","category_id":"food","monthly_budget":40000}', ctx())
    expect(r.change).toMatchObject({ op: 'setup', what: 'category', tone: 'edit', title: 'Food', detail: 'カテゴリ · 月の予算: ¥0 → ¥40,000' })
    const p = await runTool('propose_profile', '{"theme":"light","display_name":"Nay"}', ctx())
    expect((p.change as SetupChange).detail).toBe('プロフィール · 表示名: You → Nay · テーマ: midnight → light')
  })
  it('makes a pot and saves into it in one tray, and can take money out', async () => {
    const tray: ToolCtx['tray'] = []
    const made = await runTool('propose_pot', '{"action":"create","name":"Sofa","monthly":20000,"goal":120000}', ctx(tray))
    expect((made.change as SetupChange).detail).toBe('貯金 · 毎月の貯金 ¥20,000 · 目標額 ¥120,000')
    tray.push(made.change!)
    const { id } = JSON.parse(made.content)
    const put = await runTool('propose_pot_move', JSON.stringify({ pot_id: id, amount: 20000 }), ctx(tray))
    expect(put.change).toMatchObject({ what: 'pot_move', tone: 'add', title: 'Sofa' })
    const { calls, repo } = recorder()
    const ids = new Map<string, string>()
    const made2 = await (made.change as SetupChange).run(repo, (x) => x)
    ids.set(id, made2.created!)
    const put2 = await (put.change as SetupChange).run(repo, (x) => ids.get(x) ?? x)
    expect(calls[1]).toBe(`addPotMove [{"potId":"id-1","spaceId":"me","amount":20000,"occurredOn":"2026-10-23","note":""}]`)
    await put2.undo!(repo)
    expect(calls[2]).toBe('deletePotMove ["id-2"]')
    const out = await runTool('propose_pot_move', '{"pot_id":"trip","amount":-4000,"note":"Flight"}', ctx())
    expect((out.change as SetupChange).detail).toBe('¥4,000を取り崩す · 2026-10-23 · Flight')
    expect((await runTool('propose_pot_move', '{"pot_id":"trip","amount":0}', ctx())).content).toMatch(/positive to save/)
  })
  it('changes or stops a schedule from its next date', async () => {
    const stop = await runTool('propose_schedule', '{"entry_id":"rent","stop":true}', ctx())
    expect(stop.change).toMatchObject({ what: 'schedule', tone: 'delete' })
    const { calls, repo } = recorder()
    await (stop.change as SetupChange).run(repo, (x) => x)
    // rent started on 2026-10-20 and has happened: it ends, nothing new is added
    expect(calls.map((c) => c.split(' ')[0])).toEqual(['updateEntry'])
    const raise = await runTool('propose_schedule', '{"entry_id":"rent","amount":1300}', ctx())
    expect((raise.change as SetupChange).detail).toMatch(/2026-11-20 · ¥1,300/)
  })
})

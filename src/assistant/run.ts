// The assistant's tools, run in the app on the data the signed-in person can see, and the reply stream from
// /api/chat (worker/index.ts). The model only ever sees what these return.
import type { Change } from '../domain/changes'
import { monthKey } from '../domain/dates'
import { categorySpent, creditOutstanding, nextCardPayment, sourceBalance, upcoming } from '../domain/money'
import { asNew } from '../domain/recurring'
import type { Entry, NewEntry, Snapshot, Space } from '../domain/types'
import type { Repo } from '../data/repo'

export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string } }
export type ApiMsg =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

export interface ToolCtx {
  snap: Snapshot
  repo: Repo
  space: Space
  today: string
  /** Display names, for "who logged it". */
  person(id: string): string
  /** How an entry was paid, as the app shows it (other members' personal funds stay hidden). */
  paidWith(e: Entry): string
  /** Entries seen through list_entries, so proposals can refer to older months. */
  seen: Map<string, Entry>
}

/** What a tool call did: a result for the model, and a change for the tray when it proposed one. */
export interface ToolResult { content: string; change?: Change }

type Args = Record<string, unknown>
const MAX_RESULT = 14_000
const json = (x: unknown) => {
  const s = JSON.stringify(x)
  return s.length > MAX_RESULT ? s.slice(0, MAX_RESULT) + '…(cut)' : s
}
const err = (message: string): ToolResult => ({ content: json({ error: message }) })

let nextKey = 1

export async function runTool(name: string, rawArgs: string, c: ToolCtx): Promise<ToolResult> {
  let a: Args
  try {
    a = rawArgs.trim() ? JSON.parse(rawArgs) : {}
  } catch {
    return err('arguments are not valid JSON')
  }
  try {
    switch (name) {
      case 'get_overview': return { content: json(overview(c)) }
      case 'list_entries': return { content: json(await listEntries(a, c)) }
      case 'coming_up': return { content: json(comingUp(a, c)) }
      case 'propose_entry': {
        const r = buildEntry(a, undefined, c)
        if (typeof r === 'string') return err(r)
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'add', after: r } }
      }
      case 'propose_edit': {
        const before = findEntry(a.entry_id, c)
        if (typeof before === 'string') return err(before)
        const r = buildEntry(a, before, c)
        if (typeof r === 'string') return err(r)
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'edit', before, after: r } }
      }
      case 'propose_delete': {
        const before = findEntry(a.entry_id, c)
        if (typeof before === 'string') return err(before)
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'delete', before } }
      }
      default: return err(`unknown tool ${name}`)
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

function overview({ snap, space, today }: ToolCtx) {
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name
  return {
    today,
    current_space: space.id,
    spaces: snap.spaces.map((s) => ({ id: s.id, name: s.name, kind: s.kind === 'personal' ? 'personal' : 'shared', members: s.memberIds.length })),
    sources: snap.sources.filter((s) => !s.archived).map((s) => ({
      id: s.id, name: s.name, kind: s.kind, space: spaceName(s.spaceId), balance: sourceBalance(s, snap.methods, snap.flows, today),
    })),
    payment_methods: snap.methods.filter((m) => !m.archived).map((m) => {
      const next = m.kind === 'credit' ? nextCardPayment(m, snap.flows, today) : null
      return {
        id: m.id, name: m.name, kind: m.kind, space: spaceName(m.spaceId), paid_from: snap.sources.find((s) => s.id === m.sourceId)?.name,
        ...(m.kind === 'credit' ? { owed: creditOutstanding(m, snap.flows, today), next_payment: next } : {}),
      }
    }),
    categories: snap.categories.map((k) => ({
      id: k.id, name: k.name, kind: k.kind, space: spaceName(k.spaceId),
      ...(k.kind === 'expense' ? { budget: k.monthlyBudget, spent_this_month: categorySpent(snap.entries, k, today) } : {}),
    })),
  }
}

async function listEntries(a: Args, c: ToolCtx) {
  const month = String(a.month ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('month must be YYYY-MM')
  // this month and later are in the snapshot; earlier months are fetched
  const all = month >= monthKey(c.today) ? c.snap.entries.filter((e) => e.occurredOn.startsWith(month)) : await c.repo.loadMonth(month)
  const cat = new Map(c.snap.categories.map((k) => [k.id, k.name]))
  const text = typeof a.text === 'string' ? a.text.toLowerCase() : ''
  const rows = all
    .filter((e) => (!a.space_id || e.spaceId === a.space_id) && (!text || [e.name, e.note, cat.get(e.categoryId ?? '')].some((s) => s?.toLowerCase().includes(text))))
    .sort((x, y) => y.occurredOn.localeCompare(x.occurredOn))
  for (const e of rows) c.seen.set(e.id, e)
  return {
    month, count: rows.length,
    entries: rows.slice(0, 150).map((e) => ({
      id: e.id, date: e.occurredOn, kind: e.kind, amount: e.amount, ...(e.fee ? { fee: e.fee } : {}),
      name: e.name || undefined, note: e.note || undefined, category: cat.get(e.categoryId ?? ''), paid_with: c.paidWith(e),
      space: c.snap.spaces.find((s) => s.id === e.spaceId)?.name, by: c.person(e.createdBy),
      ...(e.repeat !== 'none' || e.repeatOf ? { repeating: true } : {}),
    })),
  }
}

function comingUp(a: Args, c: ToolCtx) {
  const spaceId = typeof a.space_id === 'string' ? a.space_id : c.space.id
  return upcoming(spaceId, c.snap, c.today).map((u) => ({ date: u.on, kind: u.kind, name: u.name, amount: u.amount }))
}

function findEntry(id: unknown, c: ToolCtx): Entry | string {
  const e = c.snap.entries.find((x) => x.id === id) ?? c.seen.get(String(id))
  if (!e) return 'entry not found; call list_entries for its month first'
  if (e.repeat !== 'none' || e.repeatOf) return 'this is a repeating entry; the person must change it with Edit schedule in the app'
  return e
}

const pick = <T,>(a: Args, k: string, fallback: T): T => (k in a && a[k] !== undefined ? (a[k] as T) : fallback)

/** A new or edited entry from the model's arguments, checked like the entry sheet does. A string is the error. */
export function buildEntry(a: Args, before: Entry | undefined, c: Pick<ToolCtx, 'snap' | 'space' | 'today'>): NewEntry | string {
  const { snap } = c
  const base: Partial<NewEntry> = before ? asNew(before) : { spaceId: c.space.id, occurredOn: c.today, fee: 0, name: '', note: '', tags: [], repeat: 'none', repeatOf: null }
  const kind = pick(a, 'kind', base.kind)
  const spaceId = pick(a, 'space_id', base.spaceId)
  const amount = pick(a, 'amount', base.amount)
  const date = pick(a, 'date', base.occurredOn)
  // switching kind drops the old way of paying unless new ones are given
  const keep = !('kind' in a) || a.kind === base.kind
  const methodId = pick<string | null>(a, 'method_id', keep && !('source_id' in a) ? (base.methodId ?? null) : null) || null
  const sourceId = pick<string | null>(a, 'source_id', keep && !('method_id' in a) ? (base.sourceId ?? null) : null) || null
  const toSourceId = kind === 'transfer' ? pick<string | null>(a, 'to_source_id', keep ? (base.toSourceId ?? null) : null) || null : null
  const categoryId = kind === 'transfer' ? null : pick<string | null>(a, 'category_id', keep ? (base.categoryId ?? null) : null) || null
  const fee = kind === 'transfer' ? pick(a, 'fee', base.fee ?? 0) : 0

  if (kind !== 'expense' && kind !== 'income' && kind !== 'transfer') return 'kind must be expense, income or transfer'
  if (!snap.spaces.some((s) => s.id === spaceId)) return 'unknown space_id'
  if (!Number.isInteger(amount) || (amount as number) <= 0) return 'amount must be a positive whole number of yen'
  if (!Number.isInteger(fee) || (fee as number) < 0) return 'fee must be a whole number of yen, 0 or more'
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'date must be YYYY-MM-DD'
  const method = methodId ? snap.methods.find((m) => m.id === methodId && !m.archived) : undefined
  const source = sourceId ? snap.sources.find((s) => s.id === sourceId && !s.archived) : undefined
  const to = toSourceId ? snap.sources.find((s) => s.id === toSourceId && !s.archived) : undefined
  if (methodId && !method) return 'unknown method_id'
  if (sourceId && !source) return 'unknown source_id'
  if (toSourceId && !to) return 'unknown to_source_id'
  if (categoryId) {
    const k = snap.categories.find((x) => x.id === categoryId)
    if (!k || k.spaceId !== spaceId) return 'category_id must be a category of the same space'
    if (k.kind !== kind) return `category is for ${k.kind}, not ${kind}`
  }
  if (kind === 'expense' && !!method === !!source) return 'an expense needs exactly one of method_id or source_id'
  if (kind === 'income' && (method || !source)) return 'income needs source_id (and no method_id)'
  if (kind === 'transfer') {
    if (!to) return 'a transfer needs to_source_id'
    if (method) {
      if (source) return 'a transfer leaves either a source or a credit card, not both'
      if (method.kind !== 'credit' || to.kind !== 'emoney') return 'only a credit card can charge an e-money source'
    } else if (!source) return 'a transfer needs source_id'
    else if (source.id === to.id) return 'a transfer needs two different sources'
  }
  return {
    spaceId: spaceId as string, kind, amount: amount as number, categoryId, methodId: kind === 'income' ? null : methodId, sourceId: method && kind !== 'income' ? null : sourceId,
    toSourceId, fee: fee as number, occurredOn: date,
    name: String(pick(a, 'name', base.name ?? '')).slice(0, 60), note: String(pick(a, 'note', base.note ?? '')).slice(0, 200),
    tags: base.tags ?? [], repeat: before?.repeat ?? 'none', repeatOf: before?.repeatOf ?? null,
  }
}

// ------------------------------------------------------------ the reply stream

export class ChatError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

/** Reads an OpenAI-style event stream: text as it arrives, and the tool calls once complete. */
export async function readStream(body: ReadableStream<Uint8Array>, onText: (text: string) => void): Promise<{ text: string; toolCalls: ToolCall[] }> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  const acc = streamAccumulator(onText)
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    acc.push(value)
  }
  return acc.finish()
}

/** The stream parser on its own, fed chunks of text. */
export function streamAccumulator(onText: (text: string) => void) {
  let buf = ''
  let text = ''
  const calls: ToolCall[] = []
  const line = (l: string) => {
    if (!l.startsWith('data:')) return
    const data = l.slice(5).trim()
    if (!data || data === '[DONE]') return
    let ev: { choices?: { delta?: { content?: string | null; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[]; error?: { message?: string } }
    try {
      ev = JSON.parse(data)
    } catch {
      return
    }
    if (ev.error) throw new ChatError('model')
    const delta = ev.choices?.[0]?.delta
    if (delta?.content) {
      text += delta.content
      onText(text)
    }
    for (const tc of delta?.tool_calls ?? []) {
      const i = tc.index ?? calls.length
      calls[i] ??= { id: '', type: 'function', function: { name: '', arguments: '' } }
      if (tc.id) calls[i].id = tc.id
      if (tc.function?.name) calls[i].function.name += tc.function.name
      if (tc.function?.arguments) calls[i].function.arguments += tc.function.arguments
    }
  }
  return {
    push(chunk: string) {
      buf += chunk
      const lines = buf.split(/\r?\n/)
      buf = lines.pop() ?? ''
      lines.forEach(line)
    },
    finish() {
      line(buf)
      buf = ''
      return { text, toolCalls: calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || `call_${i}` })) }
    },
  }
}

/** Keeps the conversation short enough to send: whole turns from the end, never splitting a tool call from its results. */
export function trimHistory(msgs: ApiMsg[], max = 60): ApiMsg[] {
  if (msgs.length <= max) return msgs
  const from = msgs.findIndex((m, i) => i >= msgs.length - max && m.role === 'user')
  return from < 0 ? msgs.slice(-max) : msgs.slice(from)
}

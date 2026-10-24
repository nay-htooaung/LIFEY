// The assistant's tools, run in the app on the data the signed-in person can see, and the reply stream from
// /api/chat (worker/index.ts). The model only ever sees what these return.
import type { Change } from '../domain/changes'
import { monthKey } from '../domain/dates'
import { categorySpent, creditOutstanding, nextCardPayment, potThisMonth, potTotal, sourceBalance, upcoming } from '../domain/money'
import { asNew, isTemplate } from '../domain/recurring'
import type { Entry, NewEntry, Repeat, Snapshot, Space } from '../domain/types'
import type { Repo } from '../data/repo'
import type { I18n } from '../i18n'
import { proposeCategory, proposeMethod, proposePot, proposePotMove, proposeProfile, proposeSchedule, proposeSource, proposeSpace, world, type Proposal } from './setup'

/** `extra_content` carries Gemini's thought signature, which must be sent back with the call. */
export interface ToolCall { id: string; type: 'function'; function: { name: string; arguments: string }; extra_content?: unknown }
/** A user message with a photo or a file is a list of parts, as in the OpenAI chat format. `file` (kept in the app,
 * never sent) names the file a text part holds. */
export type UserPart = { type: 'text'; text: string; file?: string } | { type: 'image_url'; image_url: { url: string } }
export type ApiMsg =
  | { role: 'user'; content: string | UserPart[] }
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
  t: I18n['t']
  /** The tray so far: later proposals may use what earlier ones create. */
  tray: Proposal[]
}

/** What a tool call did: a result for the model, and a change for the tray when it proposed one. */
export interface ToolResult { content: string; change?: Proposal }

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
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'add', after: r } satisfies Change }
      }
      case 'propose_edit': {
        const before = findEntry(a.entry_id, c)
        if (typeof before === 'string') return err(before)
        const r = buildEntry(a, before, c)
        if (typeof r === 'string') return err(r)
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'edit', before, after: r } satisfies Change }
      }
      case 'propose_delete': {
        const before = findEntry(a.entry_id, c)
        if (typeof before === 'string') return err(before)
        return { content: json({ proposed: true }), change: { key: `p${nextKey++}`, op: 'delete', before } satisfies Change }
      }
      case 'propose_schedule':
        return setup(proposeSchedule(a, { ...c, entries: [...c.snap.entries, ...c.seen.values()] }, (args, before) => buildEntry(args, before, c)))
      case 'propose_category': return setup(proposeCategory(a, c))
      case 'propose_source': return setup(proposeSource(a, c))
      case 'propose_method': return setup(proposeMethod(a, c))
      case 'propose_space': return setup(proposeSpace(a, c))
      case 'propose_profile': return setup(proposeProfile(a, c))
      case 'propose_pot': return setup(proposePot(a, c))
      case 'propose_pot_move': return setup(proposePotMove(a, c))
      default: return err(`unknown tool ${name}`)
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e))
  }
}

/** A setup proposal for the tray, and the placeholder id of what it creates for the model to use. */
const setup = (r: ReturnType<typeof proposeCategory>): ToolResult =>
  typeof r === 'string' ? err(r) : { content: json({ proposed: true, ...(r.draft ? { id: r.draft.id } : {}) }), change: r }

function overview({ snap, space, today, person }: ToolCtx) {
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name
  const sourceRow = (s: (typeof snap.sources)[number]) => ({
    id: s.id, name: s.name, kind: s.kind, space: spaceName(s.spaceId), balance: sourceBalance(s, snap.methods, snap.flows, today), ...(s.fixed ? { fixed: true } : {}),
  })
  const methodRow = (m: (typeof snap.methods)[number]) => ({
    id: m.id, name: m.name, kind: m.kind, space: spaceName(m.spaceId), paid_from: snap.sources.find((s) => s.id === m.sourceId)?.name,
    ...(m.kind === 'credit' ? {
      credit_limit: m.creditLimit, limit_shared_with: m.limitSharedWith, closing_day: m.closingDay, payment_day: m.paymentDay,
      owed: creditOutstanding(m, snap.flows, today), next_payment: nextCardPayment(m, snap.flows, today),
    } : {}),
  })
  return {
    today,
    current_space: space.id,
    me: { id: snap.me.id, display_name: snap.me.displayName, locale: snap.me.locale, theme: snap.me.theme, avatar: snap.me.avatar },
    spaces: snap.spaces.map((s) => ({
      id: s.id, name: s.name, kind: s.kind === 'personal' ? 'personal' : 'shared', tone: s.tone, owner: person(s.ownerId),
      i_own: s.ownerId === snap.me.id, ...(s.inviteCode ? { invite_code: s.inviteCode } : {}),
      members: s.memberIds.map((id) => ({ id, name: person(id) })),
    })),
    sources: snap.sources.filter((s) => !s.archived).map(sourceRow),
    payment_methods: snap.methods.filter((m) => !m.archived).map(methodRow),
    categories: snap.categories.map((k) => ({
      id: k.id, name: k.name, kind: k.kind, space: spaceName(k.spaceId), color: k.color,
      ...(k.kind === 'expense' ? { budget: k.monthlyBudget, spent_this_month: categorySpent(snap.entries, k, today) } : {}),
    })),
    savings_pots: snap.pots.filter((p) => !p.archived).map((p) => ({
      id: p.id, name: p.name, space: spaceName(p.spaceId), total: potTotal(p, snap.potMoves), goal: p.goal, monthly: p.monthly,
      saved_this_month: potThisMonth(p, snap.potMoves, today),
    })),
    deleted: {
      savings_pots: snap.pots.filter((p) => p.archived).map((p) => ({ id: p.id, name: p.name })),
      spaces: snap.deletedSpaces.map((s) => ({ id: s.id, name: s.name })),
      sources: snap.sources.filter((s) => s.archived).map((s) => ({ id: s.id, name: s.name })),
      payment_methods: snap.methods.filter((m) => m.archived).map((m) => ({ id: m.id, name: m.name })),
    },
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
      ...(isTemplate(e) ? { schedule: e.repeat } : e.repeatOf ? { copy_of_schedule: e.repeatOf } : {}),
    })),
  }
}

function comingUp(a: Args, c: ToolCtx) {
  const spaceId = typeof a.space_id === 'string' ? a.space_id : c.space.id
  return upcoming(spaceId, c.snap, c.today).map((u) => ({ date: u.on, kind: u.kind, name: u.name, amount: u.amount }))
}

function findEntry(id: unknown, c: ToolCtx): Entry | string {
  if (id === undefined || id === null || id === '') return 'entry_id is missing. Call again with every argument: entry_id and the fields that change.'
  const e = c.snap.entries.find((x) => x.id === id) ?? c.seen.get(String(id))
  if (!e) return 'entry not found; call list_entries for its month first'
  if (isTemplate(e)) return 'this is the first record of a repeating schedule; use propose_schedule'
  return e
}

const repeatOf = (v: unknown): Repeat => (['weekly', 'biweekly', 'monthly', 'yearly'].includes(v as string) ? (v as Repeat) : 'none')

const pick = <T,>(a: Args, k: string, fallback: T): T => (k in a && a[k] !== undefined ? (a[k] as T) : fallback)

/** A new or edited entry from the model's arguments, checked like the entry sheet does. A string is the error. */
export function buildEntry(a: Args, before: Entry | undefined, c: Pick<ToolCtx, 'snap' | 'space' | 'today'> & { tray?: Proposal[] }): NewEntry | string {
  // what the tray creates counts too, by its new:… id
  const snap = world({ snap: c.snap, tray: c.tray ?? [] })
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
    tags: base.tags ?? [], repeat: before ? before.repeat : repeatOf(a.repeat), repeatOf: before?.repeatOf ?? null,
  }
}

// ------------------------------------------------------------ the reply stream

export class ChatError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

/** Reads an OpenAI-style event stream: text as it arrives, and the tool calls once complete. */
/** Reads an OpenAI-style event stream: text as it arrives, and the tool calls once complete. Fails when nothing arrives for `stallMs`. */
export async function readStream(
  body: ReadableStream<Uint8Array>, onText: (text: string) => void, stallMs = 60_000, onThinking?: (thought: string) => void, onModel?: (id: string) => void,
): Promise<{ text: string; toolCalls: ToolCall[] }> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  const acc = streamAccumulator(onText, onThinking, onModel)
  for (;;) {
    let timer: ReturnType<typeof setTimeout> | undefined
    const stalled = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ChatError('stalled')), stallMs)
    })
    try {
      const { value, done } = await Promise.race([reader.read(), stalled])
      if (done) break
      acc.push(value)
    } catch (e) {
      void reader.cancel().catch(() => {})
      throw e
    } finally {
      clearTimeout(timer)
    }
  }
  return acc.finish()
}

/** `p`, or a ChatError with `code` after `ms`. */
export function within<T>(p: Promise<T>, ms: number, code: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([p, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ChatError(code)), ms)
  })]).finally(() => clearTimeout(timer))
}

/** The stream parser on its own, fed chunks of text. `onThinking` gets each summary of what the model is thinking about. */
export function streamAccumulator(onText: (text: string) => void, onThinking?: (thought: string) => void, onModel?: (id: string) => void) {
  let buf = ''
  let text = ''
  const calls: ToolCall[] = []
  const line = (l: string) => {
    if (!l.startsWith('data:')) return
    const data = l.slice(5).trim()
    if (!data || data === '[DONE]') return
    let ev: { choices?: { delta?: { content?: string | null; thinking?: string; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string }; extra_content?: unknown }[] } }[]; error?: { code?: string }; answered_by?: string }
    try {
      ev = JSON.parse(data)
    } catch {
      return
    }
    if (ev.error) throw new ChatError(ev.error.code ?? 'model')
    if (ev.answered_by) onModel?.(ev.answered_by)
    const delta = ev.choices?.[0]?.delta
    if (delta?.thinking) onThinking?.(delta.thinking)
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
      if (tc.extra_content) calls[i].extra_content = tc.extra_content
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

/** Only the newest photo or file is sent again; older ones become a note, so each request stays small. */
export function dropOldAttachments(msgs: ApiMsg[]): ApiMsg[] {
  const last = msgs.map((m) => m.role === 'user' && Array.isArray(m.content)).lastIndexOf(true)
  return msgs.map((m, i): ApiMsg => {
    if (m.role !== 'user' || !Array.isArray(m.content)) return m
    if (i === last) return m.content.some((p) => p.type === 'text' && p.file) ? { role: 'user', content: m.content.map((p) => (p.type === 'text' ? { type: 'text', text: p.text } : p)) } : m
    return { role: 'user', content: m.content.map((p) => (p.type === 'image_url' ? '(a photo sent earlier)' : p.file ? `(the file "${p.file}", sent earlier)` : p.text)).join('\n') }
  })
}

/** Gives each tool call left without a result (the reply was stopped) one saying so, as the next request needs. */
export function closeOpenCalls(msgs: ApiMsg[]): ApiMsg[] {
  const at = msgs.findLastIndex((m) => m.role === 'assistant' && !!m.tool_calls?.length)
  if (at < 0) return msgs
  const calls = (msgs[at] as Extract<ApiMsg, { role: 'assistant' }>).tool_calls!
  const answered = new Set(msgs.slice(at + 1).flatMap((m) => (m.role === 'tool' ? [m.tool_call_id] : [])))
  const open = calls.filter((c) => !answered.has(c.id))
  // results go straight after their calls, before any later message
  const end = at + 1 + msgs.slice(at + 1).findIndex((m) => m.role !== 'tool')
  const cut = end > at ? end : msgs.length
  return [...msgs.slice(0, cut), ...open.map((c): ApiMsg => ({ role: 'tool', tool_call_id: c.id, content: '{"error":"stopped by the person"}' })), ...msgs.slice(cut)]
}

/** Keeps the conversation short enough to send: whole turns from the end, never splitting a tool call from its results. */
export function trimHistory(msgs: ApiMsg[], max = 60): ApiMsg[] {
  if (msgs.length <= max) return msgs
  const from = msgs.findIndex((m, i) => i >= msgs.length - max && m.role === 'user')
  return from < 0 ? msgs.slice(-max) : msgs.slice(from)
}

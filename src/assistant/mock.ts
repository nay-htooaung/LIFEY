// Stand-in for the assistant until /api/chat exists: a few scripted replies built from the person's own data.
// The real one streams the same steps (messages, questions, proposed changes) from the model's tool calls.
import { addDays } from '../domain/dates'
import type { Change } from '../domain/changes'
import type { Day, Entry, NewEntry, Snapshot, Space } from '../domain/types'
import type { I18n } from '../i18n'
import { parseYen } from '../ui/bits'

export interface Choice { value: string; label: string }

export type Msg =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'ai'; text: string }
  /** What the assistant looked at, shown as a quiet line. */
  | { id: number; role: 'tool'; text: string }
  /** A question with choices; `answer` is set once one is picked. */
  | { id: number; role: 'ask'; text: string; options: Choice[]; answer?: string }
  /** Changes that were applied, with what Undo needs: the ids of the entries they added. */
  | { id: number; role: 'receipt'; changes: Change[]; added: string[]; undone?: boolean }

type Said = { role: 'ai' | 'tool'; text: string } | { role: 'ask'; text: string; options: Choice[] }
export type Step = { msg: Said } | { propose: Change[] }

/** What the assistant is waiting for after asking a question. */
export type Waiting = { kind: 'amount'; text: string } | { kind: 'paid'; draft: NewEntry } | null

interface Ctx { snap: Snapshot; space: Space; personal: Space; today: Day; t: I18n['t'] }

export type Intent = { kind: 'log' } | { kind: 'move'; from: string; to: string; amount: number } | { kind: 'fix'; edit: Entry; via: { methodId: string | null; sourceId: string | null }; remove: Entry }

export interface Suggestion { text: string; intent: Intent }

let nextKey = 1
const key = () => `c${nextKey++}`
const asNew = ({ id: _id, createdBy: _by, ...rest }: Entry): NewEntry => rest

/** Example requests, made from the person's own accounts and entries so they can be tried as they are. */
export function suggestions({ snap, space, personal, today, t }: Ctx): Suggestion[] {
  const out: Suggestion[] = [{ text: t('sugLog'), intent: { kind: 'log' } }]
  const banks = snap.sources.filter((s) => s.spaceId === personal.id && s.kind === 'bank' && !s.archived)
  if (banks.length > 1) out.push({ text: t('sugMove', { s: banks[1].name }), intent: { kind: 'move', from: banks[0].id, to: banks[1].id, amount: 30000 } })
  const mine = snap.entries
    .filter((e) => e.spaceId === space.id && e.kind === 'expense' && e.createdBy === snap.me.id && e.repeat === 'none' && !e.repeatOf && e.occurredOn <= today)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
  const edit = mine.find((e) => e.methodId)
  const remove = mine.find((e) => e !== edit)
  const other = snap.sources.find((s) => s.kind === 'emoney' && !s.archived && s.id !== edit?.sourceId && (s.spaceId === space.id || s.spaceId === personal.id))
  if (edit && remove && other) {
    out.push({
      text: t('sugFix', { a: label(edit), m: other.name, b: label(remove) }),
      intent: { kind: 'fix', edit, via: { methodId: null, sourceId: other.id }, remove },
    })
  }
  return out
}

const label = (e: Entry) => e.name || e.note || '—'

/** Ways to pay in this space: its own first, then my personal ones. */
function payOptions({ snap, space, personal }: Ctx): Choice[] {
  const rank = (spaceId: string) => (spaceId === space.id ? 0 : 1)
  const methods = snap.methods.filter((m) => !m.archived && (m.spaceId === space.id || m.spaceId === personal.id))
  const sources = snap.sources.filter((s) => !s.archived && s.kind === 'emoney' && (s.spaceId === space.id || s.spaceId === personal.id))
  return [...methods.map((m) => ({ value: `m:${m.id}`, label: m.name, r: rank(m.spaceId) })), ...sources.map((s) => ({ value: `s:${s.id}`, label: s.name, r: rank(s.spaceId) }))]
    .sort((a, b) => a.r - b.r)
    .slice(0, 5)
    .map(({ value, label }) => ({ value, label }))
}

/** "昨日のランチ 1,280円" → an expense draft without a payment method yet. */
function draftFrom(text: string, amount: number, { snap, space, today }: Ctx): NewEntry {
  const day = /一昨日|day before yesterday/i.test(text) ? addDays(today, -2) : /昨日|yesterday/i.test(text) ? addDays(today, -1) : today
  const name = text
    .replace(/[¥￥]?\s*[\d０-９][\d０-９,，]*\s*(円|yen)?/gi, ' ')
    .replace(/一昨日|昨日|今日|day before yesterday|yesterday|today/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(の|に|で|for)\s*/i, '')
    .slice(0, 60)
  const cat = snap.categories.filter((c) => c.spaceId === space.id && c.kind === 'expense').sort((a, b) => a.sort - b.sort)[0]
  return {
    spaceId: space.id, kind: 'expense', amount, categoryId: cat?.id ?? null, methodId: null, sourceId: null, toSourceId: null, fee: 0,
    occurredOn: day, name, note: '', tags: [], repeat: 'none', repeatOf: null,
  }
}

const amountIn = (text: string) => parseYen(text.match(/[\d０-９][\d０-９,，]*/)?.[0] ?? '')

/** One turn: the person's message (or picked choice) in, the assistant's steps out. */
export function mockTurn(input: { text: string; choice?: string; intent?: Intent }, waiting: Waiting, ctx: Ctx): { steps: Step[]; waiting: Waiting } {
  const { t, snap } = ctx
  const proposed: Step = { msg: { role: 'ai', text: t('aiProposed') } }

  if (waiting?.kind === 'paid' && input.choice) {
    const [k, id] = input.choice.split(':')
    const after = { ...waiting.draft, methodId: k === 'm' ? id : null, sourceId: k === 's' ? id : null }
    return { steps: [{ propose: [{ key: key(), op: 'add', after }] }, proposed], waiting: null }
  }

  const intent = input.intent ?? (amountIn(input.text) || waiting?.kind === 'amount' ? { kind: 'log' as const } : null)
  if (intent?.kind === 'move') {
    const after: NewEntry = {
      spaceId: ctx.personal.id, kind: 'transfer', amount: intent.amount, categoryId: null, methodId: null, sourceId: intent.from, toSourceId: intent.to,
      fee: 0, occurredOn: ctx.today, name: '', note: '', tags: [], repeat: 'none', repeatOf: null,
    }
    return { steps: [{ msg: { role: 'tool', text: t('aiReadAccounts') } }, { propose: [{ key: key(), op: 'add', after }] }, proposed], waiting: null }
  }
  if (intent?.kind === 'fix') {
    const month = snap.entries.filter((e) => e.spaceId === ctx.space.id && e.occurredOn.slice(0, 7) === ctx.today.slice(0, 7)).length
    return {
      steps: [
        { msg: { role: 'tool', text: t('aiReadMonth', { n: month }) } },
        { propose: [{ key: key(), op: 'edit', before: intent.edit, after: { ...asNew(intent.edit), ...intent.via } }, { key: key(), op: 'delete', before: intent.remove }] },
        proposed,
      ],
      waiting: null,
    }
  }
  if (intent?.kind === 'log') {
    // an amount on its own answers "How much was it?"; the rest of the first message names it
    const text = waiting?.kind === 'amount' ? `${waiting.text} ${input.text}` : input.text
    const amount = amountIn(input.text)
    if (!amount) return { steps: [{ msg: { role: 'ai', text: t('aiAskAmt') } }], waiting: { kind: 'amount', text } }
    const options = payOptions(ctx)
    return {
      steps: [{ msg: { role: 'tool', text: t('aiReadMethods') } }, { msg: { role: 'ask', text: t('aiAskPaid'), options } }],
      waiting: { kind: 'paid', draft: draftFrom(text, amount, ctx) },
    }
  }
  return { steps: [{ msg: { role: 'ai', text: t('aiNoAnswer') } }], waiting: null }
}

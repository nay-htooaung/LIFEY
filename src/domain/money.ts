import { addDays, dayInMonth, daysBetween, daysInMonth, monthKey, parts } from './dates'
import { isTemplate, nextOccurrence, occurrence } from './recurring'
import type { Category, Day, Entry, Flow, MoneyKind, PaymentMethod, Snapshot, Source } from './types'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

// ------------------------------------------------------------ credit cards

/**
 * When a charge on a credit card is paid: the statement closes on the first closing day on or after
 * the charge, and is paid on paymentDay of the following month (the usual Japanese 締め日/翌月払い).
 */
export function paymentDateFor(chargeOn: Day, method: PaymentMethod): Day {
  const close = method.closingDay ?? 31
  const pay = method.paymentDay ?? 27
  const [y, m] = parts(chargeOn)
  let closeOn = dayInMonth(y, m, close)
  let cy = y
  let cm = m
  if (closeOn < chargeOn) {
    cm += 1
    closeOn = dayInMonth(cy, cm, close)
  }
  ;[cy, cm] = parts(closeOn)
  return dayInMonth(cy, cm + 1, pay)
}

const charges = (flows: Flow[], methodId: string) =>
  flows.filter((f) => f.methodId === methodId && f.kind === 'expense')

/** What is owed on a card today: charges made up to `on` that are not paid yet (later-dated ones have not happened). */
export function creditOutstanding(method: PaymentMethod, flows: Flow[], on: Day): number {
  return sum(charges(flows, method.id).filter((f) => f.occurredOn <= on && paymentDateFor(f.occurredOn, method) > on).map((f) => f.amount))
}

/**
 * Limit and usage for a credit card, counting every card that shares the same limit.
 * Null when the card (or the card it shares with) has no limit set.
 */
export function creditLimitUse(method: PaymentMethod, methods: PaymentMethod[], flows: Flow[], on: Day) {
  const owner = method.limitSharedWith ? methods.find((m) => m.id === method.limitSharedWith) : method
  if (!owner?.creditLimit) return null
  const group = methods.filter((m) => m.id === owner.id || m.limitSharedWith === owner.id)
  return {
    limit: owner.creditLimit,
    used: sum(group.map((m) => creditOutstanding(m, flows, on))),
    /** The other cards on this limit. */
    others: group.filter((m) => m.id !== method.id),
  }
}

/** The next payment due on or after `on`, with everything charged to that statement so far. */
export function nextCardPayment(method: PaymentMethod, flows: Flow[], on: Day): { on: Day; amount: number } | null {
  const byDate = new Map<Day, number>()
  for (const f of charges(flows, method.id)) {
    const p = paymentDateFor(f.occurredOn, method)
    if (p >= on) byDate.set(p, (byDate.get(p) ?? 0) + f.amount)
  }
  const first = [...byDate.keys()].sort()[0]
  return first ? { on: first, amount: byDate.get(first)! } : null
}

/** The flows money_flows() returns, for data held on the device (demo mode). Keep the two in step. */
export function flowsOf(entries: Entry[]): Flow[] {
  return entries.flatMap((e): Flow[] =>
    e.kind === 'transfer'
      ? [
          { methodId: e.methodId, sourceId: e.methodId ? null : e.sourceId, kind: 'expense', amount: e.amount + e.fee, occurredOn: e.occurredOn },
          { methodId: null, sourceId: e.toSourceId, kind: 'income', amount: e.amount, occurredOn: e.occurredOn },
        ]
      : [{ methodId: e.methodId, sourceId: e.methodId ? null : e.sourceId, kind: e.kind, amount: e.amount, occurredOn: e.occurredOn }],
  )
}

// ------------------------------------------------------------ balances

export function sourceBalance(source: Source, methods: PaymentMethod[], flows: Flow[], on: Day): number {
  let bal = source.openingBalance
  const from = source.createdOn
  for (const f of flows) {
    if (f.sourceId === source.id && f.occurredOn >= from && f.occurredOn <= on) bal += f.kind === 'income' ? f.amount : -f.amount
  }
  for (const m of methods.filter((x) => x.sourceId === source.id)) {
    for (const f of charges(flows, m.id)) {
      if (m.kind === 'credit') {
        const paid = paymentDateFor(f.occurredOn, m)
        if (paid >= from && paid <= on) bal -= f.amount
      } else if (f.occurredOn >= from && f.occurredOn <= on) {
        bal -= f.amount
      }
    }
  }
  return bal
}

export function netPosition(spaceId: string, s: Snapshot, on: Day) {
  const sources = s.sources.filter((x) => x.spaceId === spaceId && !x.archived)
  const methods = s.methods.filter((x) => x.spaceId === spaceId && !x.archived)
  const assets = sum(sources.map((src) => sourceBalance(src, s.methods, s.flows, on)))
  const credit = sum(methods.filter((m) => m.kind === 'credit').map((m) => creditOutstanding(m, s.flows, on)))
  return { assets, credit, net: assets - credit }
}

// ------------------------------------------------------------ month views

/**
 * This month's expenses (or income) in a space, up to `on`. Transfer fees count as expenses
 * (as uncategorised entries of the fee amount); the money a transfer moves is neither.
 */
export function monthEntries(entries: Entry[], spaceId: string, on: Day, kind: MoneyKind = 'expense') {
  const mk = monthKey(on)
  return spendingView(entries).filter((e) => e.spaceId === spaceId && e.kind === kind && monthKey(e.occurredOn) === mk && e.occurredOn <= on)
}

/** Entries as spending and income: a transfer becomes its fee (an expense) or disappears. */
export function spendingView(entries: Entry[]): Entry[] {
  return entries.flatMap((e) =>
    e.kind !== 'transfer' ? [e] : e.fee > 0 ? [{ ...e, kind: 'expense' as const, amount: e.fee, categoryId: null }] : [],
  )
}

export function dailyTotals(entries: Entry[], spaceId: string, on: Day): number[] {
  const [y, m] = parts(on)
  const out = new Array<number>(daysInMonth(y, m)).fill(0)
  for (const e of monthEntries(entries, spaceId, on)) out[parts(e.occurredOn)[2] - 1] += e.amount
  return out
}

export interface Upcoming {
  key: string
  kind: 'bill' | 'income' | 'card' | 'transfer'
  name: string
  amount: number
  /** Transfer only. */
  fee?: number
  /** The repeating entry this comes from, so its schedule can be edited from here. */
  templateId?: string
  /** Transfer only: where the money lands. */
  toSourceId?: string | null
  on: Day
  categoryId: string | null
  /** The account the money leaves or lands in. Null for bills charged to a credit card (counted at the card payment). */
  sourceId: string | null
}

/** How far ahead Coming up and its forecast look. */
export const UPCOMING_DAYS = 45

export function upcoming(spaceId: string, s: Snapshot, on: Day, horizonDays = UPCOMING_DAYS): Upcoming[] {
  const until = addDays(on, horizonDays)
  const out: Upcoming[] = []
  for (const t of s.entries.filter((e) => e.spaceId === spaceId && isTemplate(e))) {
    // today's occurrence counts until it is posted; copies are posted ahead for the whole month
    const posted = s.entries.some((e) => e.repeatOf === t.id && e.occurredOn === on) || t.occurredOn === on
    const next = posted ? nextOccurrence(t, on) : nextOccurrence(t, addDays(on, -1))
    if (next && next <= until) {
      // a copy already posted for that date may have been edited on its own: show what it says
      const copy = s.entries.find((e) => e.repeatOf === t.id && e.occurredOn === next) ?? t
      const cat = s.categories.find((c) => c.id === copy.categoryId)
      const method = t.methodId ? s.methods.find((m) => m.id === t.methodId) : undefined
      out.push({
        key: `r-${t.id}`,
        templateId: t.id,
        kind: t.kind === 'income' ? 'income' : t.kind === 'transfer' ? 'transfer' : 'bill',
        name: copy.name || copy.note || cat?.name || '',
        amount: copy.amount,
        fee: copy.fee,
        on: next,
        categoryId: t.categoryId,
        sourceId: t.methodId ? (method && method.kind !== 'credit' ? method.sourceId : null) : t.sourceId,
        toSourceId: t.toSourceId,
      })
    }
  }
  for (const m of s.methods.filter((x) => x.spaceId === spaceId && x.kind === 'credit')) {
    const p = nextCardPayment(m, s.flows, on)
    if (p && p.on <= until) out.push({ key: `c-${m.id}`, kind: 'card', name: m.name, amount: p.amount, on: p.on, categoryId: null, sourceId: m.sourceId })
  }
  return out.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0))
}

export interface AccountForecast {
  source: Source
  /** Balance today. */
  now: number
  in: number
  out: number
  /** Balance once everything coming has gone through. */
  after: number
}

/** The last day of next month: how far the balance projection looks. */
export const nextMonthEnd = (on: Day): Day => {
  const [y, m] = parts(on)
  return dayInMonth(y, m + 1, 31)
}

/**
 * Flows as they will be by `until`: the real ones, plus every repeating entry still to come (each occurrence,
 * not only the next one) that has not been posted yet. Card payments follow from these through the statements.
 */
export function projectedFlows(s: Snapshot, on: Day, until: Day): Flow[] {
  const posted = new Set(s.entries.filter((e) => e.repeatOf).map((e) => `${e.repeatOf}|${e.occurredOn}`))
  const coming: Entry[] = []
  for (const t of s.entries.filter(isTemplate)) {
    for (let n = 1; ; n++) {
      const d = occurrence(t, n)
      if (d > until) break
      if (d > on && !posted.has(`${t.id}|${d}`)) coming.push({ ...t, occurredOn: d, repeat: 'none', repeatOf: t.id })
    }
  }
  return [...s.flows, ...flowsOf(coming)]
}

/**
 * Each account's balance at `until` (the end of next month by default): today's balance, what comes in and
 * goes out by then (repeating entries and card payments, across every space that touches the account), and
 * what is left. Lists the space's own accounts and the ones its repeating entries and cards move money through.
 */
export function projection(spaceId: string, s: Snapshot, on: Day, until: Day = nextMonthEnd(on)): AccountForecast[] {
  const flows = projectedFlows(s, on, until)
  const methodSource = new Map(s.methods.map((m) => [m.id, m.sourceId]))
  const touched = new Set([
    ...s.entries.filter((e) => e.spaceId === spaceId && isTemplate(e))
      .flatMap((e) => [e.sourceId, e.toSourceId, e.methodId ? methodSource.get(e.methodId) : null]),
    ...s.methods.filter((m) => m.spaceId === spaceId && !m.archived).map((m) => m.sourceId),
  ])
  return s.sources
    .filter((src) => !src.archived && (src.spaceId === spaceId || touched.has(src.id)))
    .map((source) => {
      const now = sourceBalance(source, s.methods, s.flows, on)
      const after = sourceBalance(source, s.methods, flows, until)
      // money landing in the account directly; everything else that changes it goes out
      const inAmt = sum(flows.filter((f) => f.sourceId === source.id && f.kind === 'income' && f.occurredOn > on && f.occurredOn <= until).map((f) => f.amount))
      return { source, now, in: inAmt, out: now + inAmt - after, after }
    })
}

export interface SafeToSpend {
  budget: number
  spent: number
  committed: number
  left: number
  today: number
  daysLeft: number
}

/**
 * What can be spent today without breaking this month's budgets: remaining budget minus bills already
 * scheduled for the rest of the month, spread evenly over the days left (today included).
 */
export function safeToSpend(spaceId: string, s: Snapshot, on: Day): SafeToSpend {
  const budgeted = s.categories.filter((c) => c.spaceId === spaceId && c.kind === 'expense' && c.monthlyBudget > 0)
  const ids = new Set(budgeted.map((c) => c.id))
  const budget = sum(budgeted.map((c) => c.monthlyBudget))
  const month = monthEntries(s.entries, spaceId, on).filter((e) => e.categoryId && ids.has(e.categoryId))
  const spent = sum(month.map((e) => e.amount))
  const spentToday = sum(month.filter((e) => e.occurredOn === on).map((e) => e.amount))
  const committed = sum(
    upcoming(spaceId, s, on)
      .filter((u) => u.kind === 'bill' && u.categoryId && ids.has(u.categoryId) && monthKey(u.on) === monthKey(on) && u.on > on)
      .map((u) => u.amount),
  )
  const [y, m, d] = parts(on)
  const daysLeft = daysInMonth(y, m) - d + 1
  const left = budget - spent - committed
  const today = Math.floor((left + spentToday) / daysLeft - spentToday)
  return { budget, spent, committed, left, today, daysLeft }
}

export function categorySpent(entries: Entry[], category: Category, on: Day): number {
  return sum(monthEntries(entries, category.spaceId, on, category.kind).filter((e) => e.categoryId === category.id).map((e) => e.amount))
}

/** Share of the month that has passed, for budget pace markers. */
export function monthPace(on: Day): number {
  const [y, m, d] = parts(on)
  return d / daysInMonth(y, m)
}

export function spentByMember(entries: Entry[], spaceId: string, memberIds: string[], on: Day) {
  const month = monthEntries(entries, spaceId, on)
  return memberIds.map((id) => ({ id, amount: sum(month.filter((e) => e.createdBy === id).map((e) => e.amount)) }))
}

export function daysUntil(on: Day, target: Day): number {
  return daysBetween(on, target)
}

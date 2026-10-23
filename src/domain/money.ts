import { addDays, dayInMonth, daysBetween, daysInMonth, monthKey, parts } from './dates'
import { isTemplate, nextOccurrence } from './recurring'
import type { Category, Day, Entry, Flow, PaymentMethod, Snapshot, Source } from './types'

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

/** Charged but not yet paid off. */
export function creditOutstanding(method: PaymentMethod, flows: Flow[], on: Day): number {
  return sum(charges(flows, method.id).filter((f) => paymentDateFor(f.occurredOn, method) > on).map((f) => f.amount))
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

export function monthEntries(entries: Entry[], spaceId: string, on: Day, kind: Entry['kind'] = 'expense') {
  const mk = monthKey(on)
  return entries.filter((e) => e.spaceId === spaceId && e.kind === kind && monthKey(e.occurredOn) === mk && e.occurredOn <= on)
}

export function dailyTotals(entries: Entry[], spaceId: string, on: Day): number[] {
  const [y, m] = parts(on)
  const out = new Array<number>(daysInMonth(y, m)).fill(0)
  for (const e of monthEntries(entries, spaceId, on)) out[parts(e.occurredOn)[2] - 1] += e.amount
  return out
}

export interface Upcoming {
  key: string
  kind: 'bill' | 'income' | 'card'
  name: string
  amount: number
  on: Day
  categoryId: string | null
  /** The account the money leaves or lands in. Null for bills charged to a credit card (counted at the card payment). */
  sourceId: string | null
}

export function upcoming(spaceId: string, s: Snapshot, on: Day, horizonDays = 45): Upcoming[] {
  const until = addDays(on, horizonDays)
  const out: Upcoming[] = []
  for (const t of s.entries.filter((e) => e.spaceId === spaceId && isTemplate(e))) {
    const posted = s.entries.some((e) => e.repeatOf === t.id && e.occurredOn === on) || t.occurredOn === on
    const next = posted ? nextOccurrence(t, on) : nextOccurrence(t, addDays(on, -1))
    if (next && next <= until) {
      const cat = s.categories.find((c) => c.id === t.categoryId)
      const method = t.methodId ? s.methods.find((m) => m.id === t.methodId) : undefined
      out.push({
        key: `r-${t.id}`,
        kind: t.kind === 'income' ? 'income' : 'bill',
        name: t.note || cat?.name || '',
        amount: t.amount,
        on: next,
        categoryId: t.categoryId,
        sourceId: t.methodId ? (method && method.kind !== 'credit' ? method.sourceId : null) : t.sourceId,
      })
    }
  }
  for (const m of s.methods.filter((x) => x.spaceId === spaceId && x.kind === 'credit')) {
    const p = nextCardPayment(m, s.flows, on)
    if (p && p.on <= until) out.push({ key: `c-${m.id}`, kind: 'card', name: m.name, amount: p.amount, on: p.on, categoryId: null, sourceId: m.sourceId })
  }
  return out.sort((a, b) => (a.on < b.on ? -1 : a.on > b.on ? 1 : 0))
}

/**
 * What each account will hold right after each upcoming item, applying them in date order on top of today's balance.
 * `after` is null when the item moves no account I can see (a bill charged to a card, someone else's account).
 */
export function balancesAfter(items: Upcoming[], s: Snapshot, on: Day): { item: Upcoming; source?: Source; after: number | null }[] {
  const running = new Map<string, number>()
  return items.map((item) => {
    const source = item.sourceId ? s.sources.find((x) => x.id === item.sourceId) : undefined
    if (!source) return { item, after: null }
    const before = running.get(source.id) ?? sourceBalance(source, s.methods, s.flows, on)
    const after = before + (item.kind === 'income' ? item.amount : -item.amount)
    running.set(source.id, after)
    return { item, source, after }
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

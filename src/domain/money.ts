import { addDays, dayInMonth, daysBetween, daysInMonth, monthKey, parts } from './dates'
import { isTemplate, nextOccurrence, occurrence } from './recurring'
import type { Category, Day, Entry, Flow, MoneyKind, PaymentMethod, Pot, PotMove, Snapshot, Source } from './types'

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

/**
 * One line of an account's history, signed from the account's side (+ in, − out): an entry, a card statement paid
 * from a source, or (hidden) what members logged where I cannot see the entry but the account moved.
 */
export interface AccountLine {
  key: string
  on: Day
  amount: number
  entry?: Entry
  card?: PaymentMethod
  hidden?: boolean
}

/** What went in and out of a source, or onto a payment method, in `month` (YYYY-MM), newest first. */
export function accountLines(account: { source: Source } | { method: PaymentMethod }, s: Pick<Snapshot, 'entries' | 'methods' | 'flows'>, month: string): AccountLine[] {
  const inMonth = (d: Day) => d.startsWith(month)
  const lines: AccountLine[] = []
  let moved = 0
  if ('method' in account) {
    const m = account.method
    for (const e of s.entries) {
      if (e.methodId === m.id && inMonth(e.occurredOn)) lines.push({ key: e.id, on: e.occurredOn, amount: -(e.amount + e.fee), entry: e })
    }
    moved = -sum(charges(s.flows, m.id).filter((f) => inMonth(f.occurredOn)).map((f) => f.amount))
  } else {
    const src = account.source
    // debit cards and the like take each payment from the source at once
    const direct = new Set(s.methods.filter((m) => m.sourceId === src.id && m.kind !== 'credit').map((m) => m.id))
    for (const e of s.entries.filter((x) => inMonth(x.occurredOn))) {
      let amount = 0
      if (e.methodId) {
        if (direct.has(e.methodId)) amount -= e.amount + e.fee
      } else if (e.sourceId === src.id) amount += e.kind === 'income' ? e.amount : -(e.amount + e.fee)
      if (e.kind === 'transfer' && e.toSourceId === src.id) amount += e.amount
      if (amount) lines.push({ key: e.id, on: e.occurredOn, amount, entry: e })
    }
    for (const f of s.flows.filter((x) => inMonth(x.occurredOn))) {
      if (f.sourceId === src.id) moved += f.kind === 'income' ? f.amount : -f.amount
      else if (f.methodId && direct.has(f.methodId) && f.kind === 'expense') moved -= f.amount
    }
    // each card statement paid from it this month
    for (const m of s.methods.filter((x) => x.sourceId === src.id && x.kind === 'credit')) {
      const due = new Map<Day, number>()
      for (const f of charges(s.flows, m.id)) {
        const on = paymentDateFor(f.occurredOn, m)
        if (inMonth(on)) due.set(on, (due.get(on) ?? 0) + f.amount)
      }
      for (const [on, amount] of due) lines.push({ key: `card-${m.id}-${on}`, on, amount: -amount, card: m })
    }
  }
  const seen = sum(lines.filter((l) => l.entry).map((l) => l.amount))
  if (moved !== seen) lines.push({ key: `hidden-${month}`, on: `${month}-01`, amount: moved - seen, hidden: true })
  return lines.sort((a, b) => b.on.localeCompare(a.on))
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

/** How far ahead the assistant's list of what is coming looks. */
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

/** Coming up on Today: only what is still due this month. */
export const upcomingThisMonth = (spaceId: string, s: Snapshot, on: Day): Upcoming[] =>
  upcoming(spaceId, s, on).filter((u) => monthKey(u.on) === monthKey(on))

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

// ------------------------------------------------------------ 貯金

/** All that is in a pot: everything put in, less everything taken out. */
export const potTotal = (pot: Pick<Pot, 'id'>, moves: PotMove[]) => sum(moves.filter((m) => m.potId === pot.id).map((m) => m.amount))

/** What went into a pot this month, less what came out. */
export const potThisMonth = (pot: Pick<Pot, 'id'>, moves: PotMove[], on: Day) =>
  sum(moves.filter((m) => m.potId === pot.id && monthKey(m.occurredOn) === monthKey(on)).map((m) => m.amount))

/**
 * 貯金 this month in a space: each pot sets aside its monthly amount, or what went in if that is more.
 * `due` is what is still to be put in to reach the monthly amounts.
 */
export function setAside(spaceId: string, s: Pick<Snapshot, 'pots' | 'potMoves'>, on: Day) {
  const pots = s.pots.filter((p) => p.spaceId === spaceId && !p.archived)
  const month = pots.map((p) => Math.max(0, potThisMonth(p, s.potMoves, on)))
  return {
    reserve: sum(pots.map((p, i) => Math.max(p.monthly, month[i]))),
    due: sum(pots.map((p, i) => Math.max(0, p.monthly - month[i]))),
  }
}

/** Everything in a space's pots, deleted ones included (the money is still set aside until taken out). */
export const savedTotal = (spaceId: string, s: Pick<Snapshot, 'pots' | 'potMoves'>) =>
  sum(s.pots.filter((p) => p.spaceId === spaceId).map((p) => potTotal(p, s.potMoves)))

/** Who put how much into a pot, all time, largest first. */
export function potShares(pot: Pick<Pot, 'id'>, moves: PotMove[]) {
  const by = new Map<string, number>()
  for (const m of moves.filter((x) => x.potId === pot.id)) by.set(m.createdBy, (by.get(m.createdBy) ?? 0) + m.amount)
  return [...by].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount)
}

export function categorySpent(entries: Entry[], category: Category, on: Day): number {
  return sum(monthEntries(entries, category.spaceId, on, category.kind).filter((e) => e.categoryId === category.id).map((e) => e.amount))
}

/**
 * The money a space's sources will hold at the end of this month if every budget is used up, step by step.
 * Cash only: a card charge counts when its statement is paid, so what is billed next month stays out.
 */
export interface MonthEndPlan {
  /** Its sources today. */
  balance: number
  /** Income and money moved in from other spaces' sources, dated later this month. */
  incomeAhead: number
  /** Card statements paid from its sources later this month, for charges made so far. */
  cardDue: number
  /**
   * What the budgets still allow beyond the bills already scheduled in them (assumed paid this month), plus those
   * bills where they are paid this month.
   */
  budgetLeft: number
  /** Other scheduled payments out of its sources this month, and money moved to other spaces. */
  otherAhead: number
  /** 貯金: everything in the pots plus what this month still sets aside. */
  saving: number
  left: number
}

export function monthEndPlan(spaceId: string, s: Snapshot, on: Day): MonthEndPlan {
  const [y, m] = parts(on)
  const end = dayInMonth(y, m, 31)
  const mine = new Set(s.sources.filter((x) => x.spaceId === spaceId).map((x) => x.id))
  const method = new Map(s.methods.map((x) => [x.id, x]))
  const balance = sum(s.sources.filter((x) => x.spaceId === spaceId && !x.archived).map((x) => sourceBalance(x, s.methods, s.flows, on)))
  const cards = s.methods.filter((x) => x.kind === 'credit' && mine.has(x.sourceId))
  const cardDue = sum(cards.flatMap((c) => charges(s.flows, c.id)
    .filter((f) => f.occurredOn <= on && paymentDateFor(f.occurredOn, c) > on && paymentDateFor(f.occurredOn, c) <= end).map((f) => f.amount)))

  const later = s.entries.filter((e) => e.occurredOn > on && e.occurredOn <= end)
  // what an entry takes out of this space's sources before the month ends
  const cashOut = (e: Entry) => {
    const cost = e.amount + e.fee
    if (e.kind === 'income') return 0
    if (e.kind === 'transfer' && !e.methodId) return e.sourceId && mine.has(e.sourceId) ? (e.toSourceId && mine.has(e.toSourceId) ? e.fee : cost) : 0
    if (!e.methodId) return e.sourceId && mine.has(e.sourceId) ? cost : 0
    const pm = method.get(e.methodId)
    if (!pm || !mine.has(pm.sourceId)) return 0
    return pm.kind !== 'credit' || paymentDateFor(e.occurredOn, pm) <= end ? cost : 0
  }
  const cashIn = (e: Entry) =>
    (e.kind === 'income' && e.sourceId && mine.has(e.sourceId)) ||
    (e.kind === 'transfer' && e.toSourceId && mine.has(e.toSourceId) && !(e.sourceId && mine.has(e.sourceId)))
      ? e.amount : 0

  const budgeted = s.categories.filter((c) => c.spaceId === spaceId && c.kind === 'expense' && c.monthlyBudget > 0)
  const ids = new Set(budgeted.map((c) => c.id))
  const inBudget = (e: Entry) => e.kind === 'expense' && e.spaceId === spaceId && !!e.categoryId && ids.has(e.categoryId)
  const budgetLeft = sum(budgeted.map((c) => {
    const scheduled = later.filter((e) => inBudget(e) && e.categoryId === c.id)
    return Math.max(0, c.monthlyBudget - categorySpent(s.entries, c, on) - sum(scheduled.map((e) => e.amount))) + sum(scheduled.map(cashOut))
  }))
  const incomeAhead = sum(later.map(cashIn))
  const otherAhead = sum(later.filter((e) => !inBudget(e)).map(cashOut))
  const saving = savedTotal(spaceId, s) + setAside(spaceId, s, on).due
  return { balance, incomeAhead, cardDue, budgetLeft, otherAhead, saving, left: balance + incomeAhead - cardDue - budgetLeft - otherAhead - saving }
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

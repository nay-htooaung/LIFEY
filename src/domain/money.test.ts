import { describe, expect, it } from 'vitest'
import { addMonths, dayInMonth } from './dates'
import { accountForecast, creditLimitUse, spaceForecast, flowsOf, monthEntries, creditOutstanding, nextCardPayment, paymentDateFor, safeToSpend, sourceBalance, upcoming } from './money'
import { dueOccurrences, nextOccurrence, scheduleChange } from './recurring'
import type { Entry, Flow, PaymentMethod, Snapshot, Source } from './types'

const visa: PaymentMethod = { id: 'visa', spaceId: 'me', name: 'Visa', kind: 'credit', sourceId: 'chk', creditLimit: 500000, limitSharedWith: null, closingDay: 15, paymentDay: 10, archived: false }
const eom: PaymentMethod = { ...visa, id: 'eom', closingDay: 31, paymentDay: 27 }
const debit: PaymentMethod = { ...visa, id: 'deb', kind: 'debit', closingDay: null, paymentDay: null }
const chk: Source = { id: 'chk', spaceId: 'me', name: 'Bank', kind: 'bank', openingBalance: 100000, createdOn: '2026-09-01', archived: false }

let n = 0
const entry = (p: Partial<Entry>): Entry => ({
  id: `e${n++}`, spaceId: 'me', kind: 'expense', amount: 1000, categoryId: 'food', methodId: 'deb', sourceId: null,
  occurredOn: '2026-10-01', toSourceId: null, fee: 0, name: '', note: '', tags: [], repeat: 'none', repeatOf: null, createdBy: 'u1', ...p,
})
const flow = (methodId: string, amount: number, occurredOn: string): Flow => ({ methodId, sourceId: null, kind: 'expense', amount, occurredOn })

describe('dates', () => {
  it('clamps month arithmetic to the month end', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-02-28', 1, 31)).toBe('2026-03-31')
    expect(dayInMonth(2026, 13, 31)).toBe('2027-01-31')
  })
})

describe('credit card statements (締め日 / 翌月払い)', () => {
  it('pays charges up to the closing day next month', () => {
    expect(paymentDateFor('2026-10-15', visa)).toBe('2026-11-10')
    expect(paymentDateFor('2026-10-16', visa)).toBe('2026-12-10')
    expect(paymentDateFor('2026-12-20', visa)).toBe('2027-02-10')
  })
  it('handles month-end closing', () => {
    expect(paymentDateFor('2026-02-28', eom)).toBe('2026-03-27')
    expect(paymentDateFor('2026-10-31', eom)).toBe('2026-11-27')
  })
  it('groups the next payment and the outstanding balance', () => {
    const flows = [flow('visa', 3000, '2026-09-20'), flow('visa', 2000, '2026-10-10'), flow('visa', 5000, '2026-10-20')]
    // Sep 20 + Oct 10 are on the statement closing Oct 15, paid Nov 10
    expect(nextCardPayment(visa, flows, '2026-10-23')).toEqual({ on: '2026-11-10', amount: 5000 })
    expect(creditOutstanding(visa, flows, '2026-10-23')).toBe(10000)
    expect(creditOutstanding(visa, flows, '2026-11-10')).toBe(5000)
  })
})

describe('source balance', () => {
  it('moves with income, debit spending and card payments', () => {
    const flows: Flow[] = [
      { methodId: null, sourceId: 'chk', kind: 'income', amount: 300000, occurredOn: '2026-10-01' },
      flow('deb', 1200, '2026-10-02'),
      flow('visa', 4000, '2026-09-10'), // paid Oct 10
      flow('visa', 9000, '2026-10-20'), // paid Dec 10
      flow('deb', 500, '2026-08-01'), // before the source was added
    ]
    expect(sourceBalance(chk, [visa, debit], flows, '2026-10-23')).toBe(100000 + 300000 - 1200 - 4000)
  })
})

describe('recurring entries', () => {
  it('finds the next monthly occurrence on the original day', () => {
    const rent = entry({ occurredOn: '2026-01-31', repeat: 'monthly' })
    expect(nextOccurrence(rent, '2026-02-01')).toBe('2026-02-28')
    expect(nextOccurrence(rent, '2026-02-28')).toBe('2026-03-31')
  })
  it('posts only missing occurrences of my own templates', () => {
    const mine = entry({ id: 'tpl', occurredOn: '2026-08-25', repeat: 'monthly' })
    const theirs = entry({ id: 'tpl2', occurredOn: '2026-08-25', repeat: 'monthly', createdBy: 'u2' })
    const posted = entry({ repeatOf: 'tpl', occurredOn: '2026-09-25' })
    const due = dueOccurrences([mine, theirs, posted], 'u1', '2026-10-25')
    expect(due.map((d) => d.occurredOn)).toEqual(['2026-10-25'])
    expect(due[0].repeatOf).toBe('tpl')
    expect(due[0].repeat).toBe('none')
  })
})

describe('safe to spend', () => {
  it('spreads what is left after scheduled bills over the remaining days', () => {
    const s: Snapshot = {
      me: { id: 'u1', displayName: 'You', color: '#000', locale: 'en', avatar: null, theme: 'midnight' },
      profiles: {}, spaces: [], deletedSpaces: [], sources: [chk], methods: [debit], flows: [],
      categories: [
        { id: 'food', spaceId: 'me', name: 'Food', color: '#000', kind: 'expense', monthlyBudget: 30000, sort: 0 },
        { id: 'gym', spaceId: 'me', name: 'Gym', color: '#000', kind: 'expense', monthlyBudget: 8000, sort: 0 },
      ],
      entries: [
        entry({ amount: 10000, occurredOn: '2026-10-05' }),
        entry({ amount: 1000, occurredOn: '2026-10-23' }),
        entry({ categoryId: 'gym', amount: 7700, occurredOn: '2026-09-30', repeat: 'monthly' }),
      ],
    }
    const r = safeToSpend('me', s, '2026-10-23')
    expect(r.budget).toBe(38000)
    expect(r.committed).toBe(7700)
    expect(r.daysLeft).toBe(9)
    // (38000 - 11000 - 7700 + 1000) / 9 - 1000
    expect(r.today).toBe(Math.floor(20300 / 9 - 1000))
    expect(upcoming('me', s, '2026-10-23')[0]).toMatchObject({ kind: 'bill', on: '2026-10-30', amount: 7700 })
  })
})

describe('shared credit limits', () => {
  const family: PaymentMethod = { ...visa, id: 'fam', creditLimit: null, limitSharedWith: 'visa' }
  const flows = [flow('visa', 30000, '2026-10-20'), flow('fam', 20000, '2026-10-21'), flow('eom', 99000, '2026-10-21')]
  const methods = [visa, family, eom]

  it('counts every card on the limit', () => {
    expect(creditLimitUse(visa, methods, flows, '2026-10-22')).toMatchObject({ limit: 500000, used: 50000 })
    expect(creditLimitUse(family, methods, flows, '2026-10-22')).toMatchObject({ limit: 500000, used: 50000 })
    expect(creditLimitUse(family, methods, flows, '2026-10-22')?.others.map((m) => m.id)).toEqual(['visa'])
  })
  it('keeps separate limits apart', () => {
    expect(creditLimitUse(eom, methods, flows, '2026-10-22')).toMatchObject({ limit: 500000, used: 99000 })
  })
  it('has no usage without a limit', () => {
    expect(creditLimitUse({ ...visa, creditLimit: null }, [], flows, '2026-10-22')).toBeNull()
  })
})

describe('bank transfers', () => {
  it('take an expense paid from a source off its balance on the day', () => {
    const transfer: Flow = { methodId: null, sourceId: 'chk', kind: 'expense', amount: 80000, occurredOn: '2026-10-05' }
    expect(sourceBalance(chk, [], [transfer], '2026-10-04')).toBe(100000)
    expect(sourceBalance(chk, [], [transfer], '2026-10-05')).toBe(20000)
  })
})

describe('account forecast', () => {
  const up = (kind: 'bill' | 'income' | 'card', amount: number, on: string, sourceId: string | null) =>
    ({ key: `${kind}${on}${amount}`, kind, name: kind, amount, on, categoryId: null, sourceId })
  const snap = { sources: [chk], methods: [], flows: [] } as unknown as Snapshot
  it('sums every item on one account into one line', () => {
    const items = [up('card', 30000, '2026-10-10', 'chk'), up('card', 12000, '2026-10-27', 'chk'), up('income', 250000, '2026-10-25', 'chk')]
    expect(accountForecast(items, snap, '2026-10-01')).toMatchObject([{ now: 100000, in: 250000, out: 42000, after: 308000 }])
  })
  it('leaves out bills charged to a card', () => {
    expect(accountForecast([up('bill', 1000, '2026-10-10', null)], snap, '2026-10-01')).toEqual([])
  })
})

describe('transfers', () => {
  const sav: Source = { ...chk, id: 'sav', openingBalance: 0 }
  const move = entry({ kind: 'transfer', methodId: null, categoryId: 'food', sourceId: 'chk', toSourceId: 'sav', amount: 30000, fee: 220, occurredOn: '2026-10-05' })
  it('move the amount and take the fee from the source', () => {
    const flows = flowsOf([move])
    expect(sourceBalance(chk, [], flows, '2026-10-05')).toBe(100000 - 30220)
    expect(sourceBalance(sav, [], flows, '2026-10-05')).toBe(30000)
  })
  it('count only the fee as spending', () => {
    expect(monthEntries([move], 'me', '2026-10-31').map((e) => [e.amount, e.categoryId])).toEqual([[220, null]])
    expect(monthEntries([move], 'me', '2026-10-31', 'income')).toEqual([])
  })
})

describe('editing a schedule', () => {
  const rent = entry({ id: 'rent', amount: 80000, repeat: 'monthly', occurredOn: '2026-08-27' })
  const copies = ['2026-09-27', '2026-10-27', '2026-11-27'].map((d) => entry({ id: d, amount: 80000, repeatOf: 'rent', occurredOn: d }))
  const next = { ...rent, amount: 85000, occurredOn: '2026-11-27' }
  it('keeps the past, replaces copies after today and carries on from the next date', () => {
    const c = scheduleChange(rent, [rent, ...copies], '2026-11-01', next)
    expect(c).toMatchObject({ remove: ['2026-11-27'], end: true, add: { amount: 85000, occurredOn: '2026-11-27', repeat: 'monthly', repeatOf: null } })
  })
  it('stops without adding anything', () => {
    expect(scheduleChange(rent, [rent, ...copies], '2026-11-01', null)).toMatchObject({ remove: ['2026-11-27'], end: true, add: undefined })
  })
  it('rewrites a schedule that has not started yet', () => {
    const later = { ...rent, occurredOn: '2026-12-27' }
    expect(scheduleChange(later, [later], '2026-11-01', { ...next, occurredOn: '2026-12-25' })).toMatchObject({ remove: [], end: false, update: { occurredOn: '2026-12-25' } })
    expect(scheduleChange(later, [later], '2026-11-01', null)).toMatchObject({ remove: ['rent'] })
  })
  it('counts a future template as its own next date', () => {
    expect(nextOccurrence({ ...rent, occurredOn: '2026-12-27' }, '2026-11-01')).toBe('2026-12-27')
  })
})

describe('forecast in a shared space', () => {
  // a personal bank pays a shared rent bill and a personal gym bill
  const rent = entry({ id: 'rent', spaceId: 'home', amount: 70000, methodId: null, sourceId: 'chk', repeat: 'monthly', occurredOn: '2026-09-27' })
  const gym = entry({ id: 'gym', spaceId: 'me', amount: 8000, methodId: null, sourceId: 'chk', repeat: 'monthly', occurredOn: '2026-09-28' })
  const joint: Source = { ...chk, id: 'joint', spaceId: 'home', openingBalance: 5000 }
  const snap = {
    spaces: [{ id: 'me' }, { id: 'home' }], sources: [chk, joint], methods: [], flows: [], entries: [rent, gym], categories: [],
  } as unknown as Snapshot
  it('counts every space on the account but lists only what matters here', () => {
    const rows = spaceForecast('home', snap, '2026-10-01')
    // the shared account has nothing coming, so it has no line
    expect(rows.map((f) => [f.source.id, f.out, f.after])).toEqual([['chk', 78000, 22000]])
  })
  it('lists the personal bank in its own space too', () => {
    expect(spaceForecast('me', snap, '2026-10-01').map((f) => f.source.id)).toEqual(['chk'])
  })
})

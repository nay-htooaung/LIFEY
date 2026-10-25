import { describe, expect, it } from 'vitest'
import { addMonths, dayInMonth } from './dates'
import { creditLimitUse, nextMonthEnd, potShares, potThisMonth, potTotal, projection, savedTotal, setAside, flowsOf, monthEntries, creditOutstanding, nextCardPayment, paymentDateFor, safeToSpend, sourceBalance, upcoming } from './money'
import { changeImpact, entriesAfter, flowsAfter, type Change } from './changes'
import { dueOccurrences, nextOccurrence, scheduleChange } from './recurring'
import { addTag, nameSuggestions, tagSuggestions } from './suggest'
import type { Category, Entry, Flow, PaymentMethod, Pot, PotMove, Snapshot, Source } from './types'

const visa: PaymentMethod = { id: 'visa', spaceId: 'me', name: 'Visa', kind: 'credit', sourceId: 'chk', creditLimit: 500000, limitSharedWith: null, closingDay: 15, paymentDay: 10, archived: false }
const eom: PaymentMethod = { ...visa, id: 'eom', closingDay: 31, paymentDay: 27 }
const debit: PaymentMethod = { ...visa, id: 'deb', kind: 'debit', closingDay: null, paymentDay: null }
const chk: Source = { id: 'chk', spaceId: 'me', name: 'Bank', kind: 'bank', openingBalance: 100000, createdOn: '2026-09-01', archived: false, fixed: false }

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
      profiles: {}, spaces: [], deletedSpaces: [], sources: [chk], methods: [debit], flows: [], pots: [], potMoves: [],
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
  it('sets 貯金 aside before spreading the rest', () => {
    const base = safeToSpend('me', { ...s0(), pots: [], potMoves: [] }, '2026-10-23')
    const r = safeToSpend('me', { ...s0(), pots: [trip, sofa], potMoves: moves }, '2026-10-23')
    // trip: 10,000 a month, 4,000 in so far (6,000 due); the shared sofa is another space's
    expect([r.saving, r.savingDue, base.left - r.left]).toEqual([10000, 6000, 10000])
  })
})

const s0 = () => ({
  me: { id: 'u1', displayName: 'You', color: '#000', locale: 'en' as const, avatar: null, theme: 'midnight' as const },
  profiles: {}, spaces: [], deletedSpaces: [], sources: [chk], methods: [debit], flows: [],
  categories: [{ id: 'food', spaceId: 'me', name: 'Food', color: '#000', kind: 'expense' as const, monthlyBudget: 30000, sort: 0 }],
  entries: [entry({ amount: 10000, occurredOn: '2026-10-05' })],
})
const trip: Pot = { id: 'trip', spaceId: 'me', name: 'Trip', color: '#000', goal: 150000, monthly: 10000, sort: 0, archived: false }
const sofa: Pot = { ...trip, id: 'sofa', spaceId: 'home', monthly: 20000 }
const move = (potId: string, amount: number, occurredOn: string, createdBy = 'u1'): PotMove =>
  ({ id: `${potId}${amount}${occurredOn}`, potId, spaceId: potId === 'sofa' ? 'home' : 'me', amount, occurredOn, note: '', createdBy })
const moves = [move('trip', 50000, '2026-08-25'), move('trip', 6000, '2026-10-02'), move('trip', -2000, '2026-10-10'), move('sofa', 20000, '2026-10-01'), move('sofa', 15000, '2026-10-03', 'u2')]

describe('貯金', () => {
  it('totals what went in and came out', () => {
    expect(potTotal(trip, moves)).toBe(54000)
    expect(potThisMonth(trip, moves, '2026-10-23')).toBe(4000)
    expect(savedTotal('me', { pots: [trip, sofa], potMoves: moves })).toBe(54000)
  })
  it('sets aside the monthly amount, or more when more went in', () => {
    expect(setAside('me', { pots: [trip], potMoves: moves }, '2026-10-23')).toEqual({ reserve: 10000, due: 6000 })
    expect(setAside('home', { pots: [sofa], potMoves: moves }, '2026-10-23')).toEqual({ reserve: 35000, due: 0 })
    // a deleted pot sets nothing aside, but its money still counts as saved
    expect(setAside('me', { pots: [{ ...trip, archived: true }], potMoves: moves }, '2026-10-23')).toEqual({ reserve: 0, due: 0 })
    expect(savedTotal('me', { pots: [{ ...trip, archived: true }], potMoves: moves })).toBe(54000)
  })
  it('shows who put in how much', () => {
    expect(potShares(sofa, moves)).toEqual([{ id: 'u1', amount: 20000 }, { id: 'u2', amount: 15000 }])
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

describe('charging e-money with a credit card', () => {
  const suica: Source = { ...chk, id: 'suica', kind: 'emoney', openingBalance: 0 }
  const charge = entry({ kind: 'transfer', methodId: 'visa', sourceId: null, categoryId: null, toSourceId: 'suica', amount: 5000, fee: 100, occurredOn: '2026-10-05' })
  const flows = flowsOf([charge])
  it('fills the e-money today and puts amount and fee on the card', () => {
    expect(sourceBalance(suica, [], flows, '2026-10-05')).toBe(5000)
    expect(creditOutstanding(visa, flows, '2026-10-05')).toBe(5100)
  })
  it('leaves the bank until the card is paid', () => {
    expect(sourceBalance(chk, [visa], flows, '2026-10-05')).toBe(100000)
    expect(nextCardPayment(visa, flows, '2026-10-05')).toEqual({ on: '2026-11-10', amount: 5100 })
    expect(sourceBalance(chk, [visa], flows, '2026-11-10')).toBe(100000 - 5100)
  })
  it('counts only the fee as spending', () => {
    expect(monthEntries([charge], 'me', '2026-10-31').map((e) => e.amount)).toEqual([100])
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

describe('projection in a shared space', () => {
  // a personal bank pays a shared rent bill and a personal gym bill
  const rent = entry({ id: 'rent', spaceId: 'home', amount: 70000, methodId: null, sourceId: 'chk', repeat: 'monthly', occurredOn: '2026-09-27' })
  const gym = entry({ id: 'gym', spaceId: 'me', amount: 8000, methodId: null, sourceId: 'chk', repeat: 'monthly', occurredOn: '2026-09-28' })
  const joint: Source = { ...chk, id: 'joint', spaceId: 'home', openingBalance: 5000 }
  const snap = {
    spaces: [{ id: 'me' }, { id: 'home' }], sources: [chk, joint], methods: [], flows: flowsOf([rent, gym]), entries: [rent, gym], categories: [],
  } as unknown as Snapshot
  it('counts every space on an account, listing the space\'s own accounts and the ones its bills use', () => {
    // rent and the gym in October and November
    expect(projection('home', snap, '2026-10-01').map((f) => [f.source.id, f.now, f.out, f.after])).toEqual([['chk', 22000, 156000, -134000], ['joint', 5000, 0, 5000]])
  })
  it('lists the personal bank in its own space too, without the shared account', () => {
    expect(projection('me', snap, '2026-10-01').map((f) => f.source.id)).toEqual(['chk'])
  })
})

describe('assistant changes', () => {
  const cash: Source = { ...chk, id: 'cash', openingBalance: 10000 }
  const food: Category = { id: 'food', spaceId: 'me', name: 'Food', color: '#000', kind: 'expense', monthlyBudget: 40000, sort: 0 }
  const lunch = entry({ id: 'lunch', amount: 1200, methodId: 'visa', occurredOn: '2026-10-20' })
  const coffee = entry({ id: 'coffee', amount: 500, methodId: null, sourceId: 'cash', occurredOn: '2026-10-21' })
  // a member's entry I cannot see still moves the shared cash
  const hidden: Flow = { methodId: null, sourceId: 'cash', kind: 'expense', amount: 300, occurredOn: '2026-10-19' }
  const snap = {
    me: { id: 'u1' }, sources: [chk, cash], methods: [visa], categories: [food], entries: [lunch, coffee],
    flows: [...flowsOf([lunch, coffee]), hidden],
  } as unknown as Snapshot
  const { id: _id, createdBy: _by, ...lunchNew } = lunch
  void _id
  void _by
  const changes: Change[] = [
    { key: 'a', op: 'add', after: { ...lunchNew, amount: 800, methodId: null, sourceId: 'cash' } },
    { key: 'b', op: 'edit', before: lunch, after: { ...lunchNew, methodId: null, sourceId: 'cash' } },
    { key: 'c', op: 'delete', before: coffee },
  ]

  it('swaps only the changed entries and their own flows', () => {
    expect(entriesAfter(snap.entries, changes, 'u1').map((e) => [e.id, e.amount, e.sourceId])).toEqual([['lunch', 1200, 'cash'], ['new:a', 800, 'cash']])
    const after = flowsAfter(snap.flows, changes)
    expect(after).toContainEqual(hidden)
    expect(after.filter((f) => f.methodId === 'visa')).toEqual([])
  })
  it('shows what moves, before and after', () => {
    expect(changeImpact(snap, changes, '2026-10-23')).toEqual([
      // 10,000 - 500 - 300 → 10,000 - 300 - 800 - 1,200
      { kind: 'source', id: 'cash', before: 9200, after: 7700 },
      { kind: 'card', id: 'visa', before: 1200, after: 0 },
      { kind: 'category', id: 'food', before: 1700, after: 2000 },
    ])
  })
  it('leaves out what does not move', () => {
    const rename: Change = { key: 'd', op: 'edit', before: lunch, after: { ...lunchNew, name: 'Lunch' } }
    expect(changeImpact(snap, [rename], '2026-10-23')).toEqual([])
  })
})

describe('projection to the end of next month', () => {
  // salary on the 25th into the bank; the gym on the 28th on a card that closes on the 15th and is paid on the 10th
  const salary = entry({ id: 'sal', kind: 'income', amount: 300000, methodId: null, sourceId: 'chk', repeat: 'monthly', occurredOn: '2026-09-25' })
  const salaryOct = entry({ id: 'sal-10', kind: 'income', amount: 300000, methodId: null, sourceId: 'chk', repeatOf: 'sal', occurredOn: '2026-10-25' })
  const gym = entry({ id: 'gym', amount: 8000, methodId: 'visa', repeat: 'monthly', occurredOn: '2026-09-28' })
  const gymOct = entry({ id: 'gym-10', amount: 8000, methodId: 'visa', repeatOf: 'gym', occurredOn: '2026-10-28' })
  const entries = [salary, salaryOct, gym, gymOct]
  const snap = {
    spaces: [{ id: 'me' }], sources: [chk], methods: [visa], entries, flows: flowsOf(entries), categories: [],
  } as unknown as Snapshot
  it('looks to the last day of next month', () => {
    expect(nextMonthEnd('2026-10-24')).toBe('2026-11-30')
    expect(nextMonthEnd('2026-12-05')).toBe('2027-01-31')
  })
  it('counts every occurrence still to come and the card payments they lead to', () => {
    const [f] = projection('me', snap, '2026-10-24')
    // today: 100,000 + September's salary; the September gym charge is paid on Nov 10
    expect(f.now).toBe(400000)
    // October's posted salary and November's (not posted yet) come in; the card pays September's gym
    expect([f.in, f.out, f.after]).toEqual([600000, 8000, 992000])
  })
})

describe('entry form suggestions', () => {
  const es = [
    entry({ name: 'ランチ', occurredOn: '2026-10-01', tags: ['仕事'] }),
    entry({ name: 'ランチ', occurredOn: '2026-10-03', tags: ['仕事', '友達'] }),
    entry({ name: 'ブランチ', occurredOn: '2026-10-05' }),
    entry({ name: 'Lunch set', occurredOn: '2026-10-02', tags: ['travel'] }),
    entry({ name: 'ランチ', spaceId: 'home' }),
    entry({ name: '給料', kind: 'income' }),
  ]
  it('offers earlier names of this kind in this space, starting matches first', () => {
    expect(nameSuggestions(es, 'me', 'expense', 'らんち')).toEqual(['ランチ', 'ブランチ'])
    expect(nameSuggestions(es, 'me', 'expense', 'ＬＵＮ')).toEqual(['Lunch set'])
    expect(nameSuggestions(es, 'me', 'expense', '')).toEqual([])
    expect(nameSuggestions(es, 'me', 'expense', '給')).toEqual([])
    // what is already typed in full is not offered again
    expect(nameSuggestions(es, 'me', 'expense', 'ランチ')).toEqual(['ブランチ'])
  })
  it('offers tags not yet added, most used first, and adds the picked one', () => {
    expect(tagSuggestions(es, 'me', '')).toEqual(['仕事', '友達', 'travel'])
    expect(tagSuggestions(es, 'me', '仕事, ')).toEqual(['友達', 'travel'])
    expect(tagSuggestions(es, 'me', '仕事、友')).toEqual(['友達'])
    expect(addTag('仕事, 友', '友達')).toBe('仕事, 友達, ')
    expect(addTag('', '仕事')).toBe('仕事, ')
  })
})

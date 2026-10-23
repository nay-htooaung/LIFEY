import { useEffect, useState } from 'react'
import { addDays, addMonths, fromParts, monthKey, parts, weekday } from '../domain/dates'
import { spendingView } from '../domain/money'
import type { Day, Entry } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, useStore } from '../data/store'
import { EntrySheet } from '../sheets/EntrySheet'
import { EntryRow } from '../ui/entry'
import { IconChevron } from '../ui/icons'
import { Select } from '../ui/Select'
import { useUI } from '../ui/ui'

const sum = (es: Entry[]) => es.reduce((a, e) => a + e.amount, 0)

/** History as a month calendar: each day shows what went out and came in; tap a day for its entries. */
export function Activity() {
  const { snap, space, today, ensureMonth, hasMonth } = useStore()
  const ui = useUI()
  const { t, locale, month: monthName, wd, dateLong } = useI18n()
  const [month, setMonth] = useState(monthKey(today))
  const [selected, setSelected] = useState<Day>(today)
  const [y, m] = month.split('-').map(Number)

  useEffect(() => ensureMonth(month), [month, ensureMonth])

  const inMonth = snap.entries.filter((e) => e.spaceId === space.id && e.occurredOn.startsWith(month))
  // the list shows every entry; totals count transfer fees as spending and leave the moved money out
  const byDay = new Map<Day, Entry[]>()
  for (const e of inMonth) byDay.set(e.occurredOn, [...(byDay.get(e.occurredOn) ?? []), e])
  const money = spendingView(inMonth)
  const out = sum(money.filter((e) => e.kind === 'expense'))
  const inc = sum(money.filter((e) => e.kind === 'income'))

  // Six weeks from the Sunday on or before the 1st, so every month has the same height.
  const first = fromParts(y, m, 1)
  const start = addDays(first, -weekday(first))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const weeks = cells[35].startsWith(month) ? 6 : 5

  const go = (n: number) => {
    const next = monthKey(addMonths(first, n))
    setMonth(next)
    setSelected(next === monthKey(today) ? today : `${next}-01`)
  }
  const pickMonth = (next: string) => {
    setMonth(next)
    setSelected(next === monthKey(today) ? today : `${next}-01`)
  }
  const pick = (d: Day) => {
    if (!d.startsWith(month)) pickMonth(monthKey(d))
    setSelected(d)
  }
  // A day cell fits about six characters: past that, 1.8万 / 18k instead of 18,000.
  const compact = (n: number, sign = '') => {
    const full = sign + n.toLocaleString('ja-JP')
    if (full.length <= 6) return full
    const short = locale === 'ja' ? (n / 10000).toFixed(n < 1000000 ? 1 : 0) + '万' : (n / 1000).toFixed(n < 100000 ? 1 : 0) + 'k'
    return sign + short.replace('.0', '')
  }

  const thisYear = parts(today)[0]
  const years = Array.from({ length: 8 }, (_, i) => thisYear - 6 + i)
  const dayList = (byDay.get(selected) ?? []).slice().sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1))
  const loading = !hasMonth(month)

  return (
    <>
      <div className="cal-nav">
        <button className="icon-round" aria-label={t('prevMonth')} onClick={() => go(-1)}><IconChevron style={{ transform: 'rotate(90deg)' }} /></button>
        <div className="cal-pick">
          <Select value={String(y)} onChange={(v) => pickMonth(`${v}-${String(m).padStart(2, '0')}`)}
            options={years.map((yy) => ({ value: String(yy), label: locale === 'ja' ? `${yy}年` : String(yy) }))} />
          <Select value={String(m)} onChange={(v) => pickMonth(`${y}-${v.padStart(2, '0')}`)}
            options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: monthName(i + 1) }))} />
        </div>
        <button className="icon-round" aria-label={t('nextMonth')} onClick={() => go(1)}><IconChevron style={{ transform: 'rotate(-90deg)' }} /></button>
      </div>

      <div className="card month-sum">
        <div><div className="label">{t('monthOut')}</div><div className="num">{yen(out)}</div></div>
        <div><div className="label">{t('monthIn')}</div><div className="num amt-in">{yen(inc)}</div></div>
        <div><div className="label">{t('net')}</div><div className="num">{yen(inc - out)}</div></div>
      </div>

      <div className={'card cal' + (loading ? ' loading' : '')} aria-busy={loading}>
        {cells.slice(0, 7).map((d) => <div key={d} className={'cal-wd wd' + weekday(d)}>{wd(d)}</div>)}
        {cells.slice(0, weeks * 7).map((d) => {
          const es = spendingView(byDay.get(d) ?? [])
          const dOut = sum(es.filter((e) => e.kind === 'expense'))
          const dIn = sum(es.filter((e) => e.kind === 'income'))
          const other = !d.startsWith(month)
          return (
            <button key={d} className={'cal-d wd' + weekday(d) + (other ? ' other' : '')} aria-pressed={d === selected}
              aria-current={d === today ? 'date' : undefined} onClick={() => pick(d)}>
              <span className="dn">{parts(d)[2]}</span>
              {!other && dIn > 0 && <span className="cal-in num">{compact(dIn, '+')}</span>}
              {!other && dOut > 0 && <span className="cal-out num">{compact(dOut)}</span>}
            </button>
          )
        })}
      </div>

      <div className="day-h">
        <span>{dateLong(selected)}</span>
        <button className="link" onClick={() => ui.open(<EntrySheet prefill={{ occurredOn: selected }} />, toneVar(space))}>{t('logThisDay')}</button>
      </div>
      {loading ? (
        <div className="card empty">{t('loading')}</div>
      ) : dayList.length ? (
        <div className="card list">{dayList.map((e) => <EntryRow key={e.id} entry={e} />)}</div>
      ) : (
        <div className="card empty">{t('nothingThisDay')}</div>
      )}
    </>
  )
}

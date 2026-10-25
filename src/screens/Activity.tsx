import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { addDays, addMonths, fromParts, monthKey, parts, weekday } from '../domain/dates'
import { spendingView } from '../domain/money'
import type { Day, Entry } from '../domain/types'
import { useI18n } from '../i18n'
import { toneVar, useStore } from '../data/store'
import { EntrySheet } from '../sheets/EntrySheet'
import { EntryRow } from '../ui/entry'
import { MonthWheel } from '../ui/MonthWheel'
import { useUI } from '../ui/ui'

const sum = (es: Entry[]) => es.reduce((a, e) => a + e.amount, 0)

/** History as a month calendar: each day shows what went out and came in; tap a day for its entries.
 * Swipe the calendar sideways for the month before or after; it follows the finger. */
export function Activity() {
  const { snap, space, today, ensureMonth, hasMonth } = useStore()
  const ui = useUI()
  const { t, dateLong } = useI18n()
  const [month, setMonth] = useState(monthKey(today))
  const [selected, setSelected] = useState<Day>(today)
  const first = `${month}-01`
  const prev = monthKey(addMonths(first, -1))
  const next = monthKey(addMonths(first, 1))

  // the months either side too, so a swipe shows their numbers at once
  useEffect(() => {
    ensureMonth(month)
    ensureMonth(prev)
    ensureMonth(next)
  }, [month, prev, next, ensureMonth])

  const pickMonth = (m: string) => {
    setMonth(m)
    setSelected(m === monthKey(today) ? today : `${m}-01`)
  }
  // tapping the selected day again logs something on it
  const logOn = (d: Day) => ui.open(<EntrySheet prefill={{ occurredOn: d }} />, toneVar(space))
  const pick = (d: Day) => {
    if (d === selected) return logOn(d)
    if (!d.startsWith(month)) pickMonth(monthKey(d))
    setSelected(d)
  }

  // swiping: dx follows the finger; on release it slides a whole width (then the month changes) or back
  const view = useRef<HTMLDivElement>(null)
  const [dx, setDx] = useState(0)
  const [sliding, setSliding] = useState(false)
  const drag = useRef<{ x: number; y: number; at: number; across: boolean | null } | null>(null)
  const dragged = useRef(false)
  const onDown = (e: PointerEvent) => {
    if (sliding || !e.isPrimary) return
    drag.current = { x: e.clientX, y: e.clientY, at: e.timeStamp, across: null }
    dragged.current = false
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const mx = e.clientX - d.x
    const my = e.clientY - d.y
    if (d.across === null && Math.max(Math.abs(mx), Math.abs(my)) > 8) {
      d.across = Math.abs(mx) > Math.abs(my)
      if (d.across) view.current?.setPointerCapture(e.pointerId)
    }
    if (d.across) {
      dragged.current = true
      setDx(mx)
    }
  }
  const onUp = (e: PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d?.across) return
    const w = view.current?.offsetWidth ?? 1
    const mx = e.clientX - d.x
    const fling = Math.abs(mx) / Math.max(1, e.timeStamp - d.at) > 0.5
    const dir = mx < -w / 4 || (fling && mx < -20) ? 1 : mx > w / 4 || (fling && mx > 20) ? -1 : 0
    setSliding(true)
    setDx(-dir * w)
  }
  const slid = () => {
    if (!sliding) return
    const w = view.current?.offsetWidth ?? 1
    if (dx <= -w / 2) pickMonth(next)
    else if (dx >= w / 2) pickMonth(prev)
    setSliding(false)
    setDx(0)
  }

  const thisYear = parts(today)[0]
  const years = Array.from({ length: 8 }, (_, i) => thisYear - 6 + i)
  const dayList = snap.entries.filter((e) => e.spaceId === space.id && e.occurredOn === selected)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'income' ? -1 : 1))
  const loading = !hasMonth(month)

  return (
    <>
      <MonthWheel value={month} years={years} onChange={pickMonth} />

      <div className="cal-view" ref={view} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        // a swipe that ends on a day does not pick it
        onClickCapture={(e) => dragged.current && (e.stopPropagation(), (dragged.current = false))}>
        <div className={'cal-track' + (sliding ? ' sliding' : '')} style={{ transform: `translateX(calc(-100% / 3 + ${dx}px))` }} onTransitionEnd={slid}>
          {[prev, month, next].map((m) => <MonthGrid key={m} month={m} selected={m === month ? selected : null} onPick={pick} />)}
        </div>
      </div>

      <div className="day-h">
        <span>{dateLong(selected)}</span>
        <button className="link" onClick={() => logOn(selected)}>{t('logThisDay')}</button>
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

/** One month: six weeks from the Sunday on or before the 1st, so every month has the same height. */
function MonthGrid({ month, selected, onPick }: { month: string; selected: Day | null; onPick(d: Day): void }) {
  const { snap, space, today, hasMonth } = useStore()
  const { locale, wd } = useI18n()
  const [y, m] = month.split('-').map(Number)
  const byDay = new Map<Day, Entry[]>()
  for (const e of snap.entries) if (e.spaceId === space.id && e.occurredOn.startsWith(month)) byDay.set(e.occurredOn, [...(byDay.get(e.occurredOn) ?? []), e])
  const first = fromParts(y, m, 1)
  const start = addDays(first, -weekday(first))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  // A day cell fits about six characters: past that, 1.8万 / 18k instead of 18,000.
  const compact = (n: number, sign = '') => {
    const full = sign + n.toLocaleString('ja-JP')
    if (full.length <= 6) return full
    const short = locale === 'ja' ? (n / 10000).toFixed(n < 1000000 ? 1 : 0) + '万' : (n / 1000).toFixed(n < 100000 ? 1 : 0) + 'k'
    return sign + short.replace('.0', '')
  }
  const loading = !hasMonth(month)
  return (
    <div className={'card cal' + (loading ? ' loading' : '')} aria-busy={loading} aria-hidden={selected === null || undefined}>
      {cells.slice(0, 7).map((d) => <div key={d} className={'cal-wd wd' + weekday(d)}>{wd(d)}</div>)}
      {cells.map((d) => {
        const es = spendingView(byDay.get(d) ?? [])
        const dOut = sum(es.filter((e) => e.kind === 'expense'))
        const dIn = sum(es.filter((e) => e.kind === 'income'))
        const other = !d.startsWith(month)
        return (
          <button key={d} tabIndex={selected === null ? -1 : undefined} className={'cal-d wd' + weekday(d) + (other ? ' other' : '') + (d > today ? ' ahead' : '')}
            aria-pressed={d === selected} aria-current={d === today ? 'date' : undefined} onClick={() => onPick(d)}>
            <span className="dn">{parts(d)[2]}</span>
            {!other && dIn > 0 && <span className="cal-in num">{compact(dIn, '+')}</span>}
            {!other && dOut > 0 && <span className="cal-out num">{compact(dOut)}</span>}
          </button>
        )
      })}
    </div>
  )
}

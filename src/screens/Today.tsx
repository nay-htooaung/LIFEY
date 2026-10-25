import { useState } from 'react'
import { monthKey, parts } from '../domain/dates'
import { nextMonthEnd, projection, spendingView, spentByMember, upcomingThisMonth } from '../domain/money'
import { useI18n, yen } from '../i18n'
import { toneVar, usePersonName, useStore } from '../data/store'
import { UpcomingRow } from '../ui/entry'
import { IconLock } from '../ui/icons'
import { InstallCard } from '../ui/InstallCard'

/** Coming up shows this many until "All" is tapped. */
const FEW = 5

/** 今月: what I logged this month so far, in every space and by space, then what is still due in this space. */
export function Today() {
  const { snap, space, personal, today } = useStore()
  const { t } = useI18n()
  const [allUp, setAllUp] = useState(false)
  const up = upcomingThisMonth(space.id, snap, today)
  // in a shared space, my personal accounts are shown to me only; say so next to them
  const isMine = (spaceId: string) => space.kind === 'household' && spaceId === personal.id

  return (
    <>
      <MonthMoney />

      <InstallCard dismissible />

      {space.kind === 'household' && <Contribution />}

      {up.length > 0 && (
        <>
          <div className="sec-h">
            <h3>{t('comingUp')}</h3>
            {!allUp && up.length > FEW && <button className="link" onClick={() => setAllUp(true)}>{t('allBills')} ({up.length})</button>}
          </div>
          <div className="card list">
            {(allUp ? up : up.slice(0, FEW)).map((u) => {
              const src = (id?: string | null) => snap.sources.find((x) => x.id === id)
              const ends = u.kind === 'transfer' ? [src(u.sourceId), src(u.toSourceId)] : [src(u.sourceId)]
              const via = ends.filter(Boolean).map((x) => x!.name).join(' → ')
              return <UpcomingRow key={u.key} item={u} sourceName={via} onlyMe={ends.some((x) => x && isMine(x.spaceId))} />
            })}
          </div>
        </>
      )}
      <Forecast />
    </>
  )
}

/** Each account once: today's balance, what comes in and goes out by the end of next month, and what is left then. */
function Forecast() {
  const { snap, space, personal, today } = useStore()
  const { t, month } = useI18n()
  const until = nextMonthEnd(today)
  const rows = projection(space.id, snap, today, until)
  if (!rows.length) return null
  return (
    <div className="card forecast">
      <div className="label">{t('monthEndBal', { m: month(parts(until)[1]) })}</div>
      {rows.map((f) => (
        <div key={f.source.id} className="fc-row">
          <div className="fc-top">
            <b>{space.kind === 'household' && f.source.spaceId === personal.id && <IconLock />}{f.source.name}</b>
            <span className={'num fc-after' + (f.after < 0 ? ' short' : '')}>{yen(f.after)}</span>
          </div>
          <div className="fc-sub num">
            <span>{t('nowBal', { a: yen(f.now) })}</span>
            {f.in > 0 && <span className="amt-in">+{yen(f.in)}</span>}
            {f.out > 0 && <span>-{yen(f.out)}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Contribution() {
  const { snap, space, today } = useStore()
  const { t } = useI18n()
  const person = usePersonName()
  const per = spentByMember(snap.entries, space.id, space.memberIds, today)
  const total = per.reduce((a, p) => a + p.amount, 0) || 1
  return (
    <div className="card contrib">
      <div className="label">{t('whoPaid', { s: space.name })}</div>
      <div className="bar2">
        {per.filter((p) => p.amount > 0).map((p) => (
          <i key={p.id} style={{ flex: p.amount, background: snap.profiles[p.id]?.color ?? 'var(--muted)' }} />
        ))}
      </div>
      <div className="legend">
        {per.map((p) => (
          <span key={p.id} className="who">
            <i style={{ background: snap.profiles[p.id]?.color ?? 'var(--muted)' }} />
            {person(p.id)} <span className="num">{yen(p.amount)}</span> <span className="muted">{Math.round((p.amount / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** Everything I logged this month up to today, in every space; then what I spent in each space, which adds up to it. */
function MonthMoney() {
  const { snap, today } = useStore()
  const { t, month } = useI18n()
  const key = monthKey(today)
  const mine = spendingView(snap.entries.filter((e) => e.createdBy === snap.me.id && e.occurredOn.startsWith(key) && e.occurredOn <= today))
  const out = (spaceId?: string) => mine.filter((e) => e.kind === 'expense' && (!spaceId || e.spaceId === spaceId)).reduce((a, e) => a + e.amount, 0)
  const spent = out()
  const inc = mine.filter((e) => e.kind === 'income').reduce((a, e) => a + e.amount, 0)
  const net = inc - spent
  const bySpace = snap.spaces.map((s) => ({ s, spent: out(s.id) }))
  return (
    <>
      <div className="card mm">
        <div className="mm-h"><span className="label">{t('monthMoney', { m: month(parts(today)[1]) })}</span></div>
        <div className="mm-grid">
          <div><span>{t('monthOut')}</span><b className="num">{yen(spent)}</b></div>
          <div><span>{t('monthIn')}</span><b className="num amt-in">{yen(inc)}</b></div>
          <div><span>{t('net')}</span><b className={'num' + (net < 0 ? ' neg' : '')}>{(net > 0 ? '+' : '') + yen(net)}</b></div>
        </div>
        {inc > 0 && <div className="mm-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (spent / inc) * 100)}%` }} /></div>}
        {inc > 0 && <div className="mm-note">{t('spentOfIncome', { p: Math.round((spent / inc) * 100) })}</div>}
      </div>
      {bySpace.length > 1 && (
        <div className="card mm-spaces">
          <div className="label">{t('bySpace')}</div>
          {bySpace.map(({ s, spent: n }) => (
            <div key={s.id} className="mm-row">
              <span className="mm-dot" style={{ background: toneVar(s) }} />
              <div className="mm-main">
                <b>{s.name}</b>
                <div className="mm-share" aria-hidden="true"><i style={{ width: `${spent ? (n / spent) * 100 : 0}%`, background: toneVar(s) }} /></div>
              </div>
              <b className="num mm-net">{yen(n)}</b>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

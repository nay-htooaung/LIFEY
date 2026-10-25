import { useState } from 'react'
import { monthKey, parts } from '../domain/dates'
import { dailyTotals, nextMonthEnd, projection, safeToSpend, spendingView, spentByMember, upcomingThisMonth } from '../domain/money'
import { useI18n, yen } from '../i18n'
import { toneVar, usePersonName, useStore } from '../data/store'
import { UpcomingRow } from '../ui/entry'
import { IconLock } from '../ui/icons'
import { InstallCard } from '../ui/InstallCard'

/** Coming up shows this many until "All" is tapped. */
const FEW = 5

export function Today({ go }: { go(tab: 'activity' | 'plan' | 'wallet'): void }) {
  const store = useStore()
  const { snap, space, personal, today } = store
  const { t } = useI18n()
  const [allUp, setAllUp] = useState(false)

  const sts = safeToSpend(space.id, snap, today)
  const up = upcomingThisMonth(space.id, snap, today)
  const daily = dailyTotals(snap.entries, space.id, today)
  const [, , dom] = parts(today)
  const sorted = daily.filter(Boolean).sort((a, b) => b - a)
  const cap = sorted[1] || sorted[0] || 1
  const billDays = new Set(up.filter((u) => u.kind !== 'income').map((u) => parts(u.on)[2]))
  const pct = sts.budget ? Math.min(1, (sts.spent + sts.committed) / sts.budget) : 0
  const R = 2 * Math.PI * 30
  // in a shared space, my personal accounts are shown to me only; say so next to them
  const isMine = (spaceId: string) => space.kind === 'household' && spaceId === personal.id

  return (
    <>
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="label">{t('leftThisMonth')}</div>
            {sts.budget > 0 ? (
              <>
                <div className="big"><sup>¥</sup>{Math.max(0, sts.left).toLocaleString('ja-JP')}</div>
                <div className="sub">{t('perDayFor', { a: yen(Math.max(0, Math.floor(sts.left / sts.daysLeft))), d: sts.daysLeft })}</div>
                {sts.saving > 0 && (
                  <div className="sub">{sts.savingDue > 0 ? t('savingDue', { a: yen(sts.saving), b: yen(sts.savingDue) }) : t('savingDone', { a: yen(sts.saving) })}</div>
                )}
              </>
            ) : (
              <div className="sub" style={{ maxWidth: 230 }}>{t('noBudgetsYet')}</div>
            )}
          </div>
          {sts.budget > 0 ? (
            <svg width="76" height="76" viewBox="0 0 76 76" aria-label={`${Math.round(pct * 100)}% ${t('ofBudget')}`} style={{ flex: 'none' }}>
              <circle cx="38" cy="38" r="30" fill="none" stroke="currentColor" strokeOpacity=".22" strokeWidth="8" />
              <circle cx="38" cy="38" r="30" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${R * pct} ${R}`} transform="rotate(-90 38 38)" />
              <line x1="38" y1="4" x2="38" y2="14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                transform={`rotate(${(dom / daily.length) * 360} 38 38)`} />
              <text x="38" y="37" textAnchor="middle" fill="currentColor" fontFamily="DM Mono, monospace" fontSize="14" fontWeight="500">{Math.round(pct * 100)}%</text>
              <text x="38" y="51" textAnchor="middle" fill="currentColor" fontSize="9" opacity=".8">{t('ofBudget')}</text>
            </svg>
          ) : (
            <button className="btn" onClick={() => go('plan')}>{t('setBudgets')}</button>
          )}
        </div>
        <div className="ribbon" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${daily.length}, 1fr)` }}>
          {daily.map((v, i) => {
            const d = i + 1
            if (d > dom) return <span key={d} className={'future' + (billDays.has(d) ? ' bill' : '')} />
            if (v === 0 && d < dom) return <span key={d} className="zero" />
            return <span key={d} className={d === dom ? 'today' : ''} style={{ height: `${Math.max(8, (Math.min(v, cap) / cap) * 100)}%` }} />
          })}
        </div>
        <div className="ribbon-x"><span>1</span><span>{t('today')}</span><span>{daily.length}</span></div>
      </div>

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

/** This month's spending, income and what is left over: this space first, then every space side by side. */
function MonthMoney() {
  const { snap, space, today } = useStore()
  const { t, month } = useI18n()
  const key = monthKey(today)
  const totals = (spaceId: string) => {
    const es = spendingView(snap.entries.filter((e) => e.spaceId === spaceId && e.occurredOn.startsWith(key) && e.occurredOn <= today))
    const out = es.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
    const inc = es.filter((e) => e.kind === 'income').reduce((a, e) => a + e.amount, 0)
    return { out, inc, net: inc - out }
  }
  const here = totals(space.id)
  const all = snap.spaces.map((s) => ({ s, ...totals(s.id) }))
  const sum = all.reduce((a, x) => ({ out: a.out + x.out, inc: a.inc + x.inc, net: a.net + x.net }), { out: 0, inc: 0, net: 0 })
  const signed = (n: number) => (n > 0 ? '+' : '') + yen(n)
  const ratio = here.inc + here.out ? here.out / Math.max(here.inc, here.out) : 0
  return (
    <>
      <div className="card mm">
        <div className="mm-h"><span className="label">{t('monthMoney', { m: month(parts(today)[1]) })}</span></div>
        <div className="mm-grid">
          <div><span>{t('monthOut')}</span><b className="num">{yen(here.out)}</b></div>
          <div><span>{t('monthIn')}</span><b className="num amt-in">{yen(here.inc)}</b></div>
          <div><span>{t('net')}</span><b className={'num' + (here.net < 0 ? ' neg' : '')}>{signed(here.net)}</b></div>
        </div>
        {here.inc > 0 && (
          <div className="mm-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
        )}
        {here.inc > 0 && <div className="mm-note">{t('spentOfIncome', { p: Math.round((here.out / here.inc) * 100) })}</div>}
      </div>
      {all.length > 1 && (
        <div className="card mm-spaces">
          <div className="label">{t('bySpace')}</div>
          {all.map(({ s, out, inc, net }) => (
            <div key={s.id} className={'mm-row' + (s.id === space.id ? ' on' : '')}>
              <span className="mm-dot" style={{ background: toneVar(s) }} />
              <div className="mm-main">
                <b>{s.name}</b>
                <small>{t('monthOut')} {yen(out)} · {t('monthIn')} {yen(inc)}</small>
              </div>
              <b className={'num mm-net' + (net < 0 ? ' neg' : net > 0 ? ' pos' : '')}>{signed(net)}</b>
            </div>
          ))}
          <div className="mm-row total">
            <div className="mm-main">
              <b>{t('allSpaces')}</b>
              <small>{t('monthOut')} {yen(sum.out)} · {t('monthIn')} {yen(sum.inc)}</small>
            </div>
            <b className={'num mm-net' + (sum.net < 0 ? ' neg' : sum.net > 0 ? ' pos' : '')}>{signed(sum.net)}</b>
          </div>
        </div>
      )}
    </>
  )
}

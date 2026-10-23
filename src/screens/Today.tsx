import { parts } from '../domain/dates'
import { accountForecast, UPCOMING_DAYS, dailyTotals, safeToSpend, spentByMember, upcoming } from '../domain/money'
import { useI18n, yen } from '../i18n'
import { usePersonName, useStore, useSubmit } from '../data/store'
import { SourceSheet } from '../sheets/SourceSheet'
import { UpcomingRow } from '../ui/entry'
import { InstallCard } from '../ui/InstallCard'
import { useUI } from '../ui/ui'

export function Today({ go }: { go(tab: 'activity' | 'plan' | 'wallet'): void }) {
  const store = useStore()
  const { snap, space, personal, today } = store
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()

  const sts = safeToSpend(space.id, snap, today)
  const up = upcoming(space.id, snap, today)
  const daily = dailyTotals(snap.entries, space.id, today)
  const [, , dom] = parts(today)
  const sorted = daily.filter(Boolean).sort((a, b) => b - a)
  const cap = sorted[1] || sorted[0] || 1
  const billDays = new Set(up.filter((u) => u.kind !== 'income' && u.on.slice(0, 7) === today.slice(0, 7)).map((u) => parts(u.on)[2]))
  const pct = sts.budget ? Math.min(1, (sts.spent + sts.committed) / sts.budget) : 0
  const R = 2 * Math.PI * 30
  const needsSetup = space.kind === 'personal' && !snap.methods.some((m) => m.spaceId === personal.id && !m.archived)

  const startCash = () =>
    submit('cash', async (r) => {
      const src = await r.addSource({ spaceId: personal.id, name: t('cash'), kind: 'cash', openingBalance: 0 })
      await r.addMethod({ spaceId: personal.id, name: t('cash'), kind: 'cash', sourceId: src, creditLimit: null, limitSharedWith: null, closingDay: null, paymentDay: null })
    }, t('added', { x: t('cash') }))

  return (
    <>
      <div className="hero">
        <div className="hero-top">
          <div>
            <div className="label">{t('safeToday')}</div>
            {sts.budget > 0 ? (
              <>
                <div className="big"><sup>¥</sup>{Math.max(0, sts.today).toLocaleString('ja-JP')}</div>
                <div className="sub">{t('leftFor', { a: yen(Math.max(0, sts.left)), d: sts.daysLeft })}</div>
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

      {needsSetup && (
        <div className="card stack">
          <div>
            <b>{t('setupTitle')}</b>
            <div className="small muted">{t('setupBody')}</div>
          </div>
          <div className="btn-row">
            <button className="btn primary" disabled={busy} aria-busy={pending === 'cash'} onClick={startCash}>{t('startCash')}</button>
            <button className="btn" onClick={() => ui.open(<SourceSheet />)}>{t('addOwn')}</button>
          </div>
        </div>
      )}

      <InstallCard dismissible />

      {space.kind === 'household' && <Contribution />}

      {up.length > 0 && (
        <>
          <div className="sec-h"><h3>{t('comingUp')}</h3><button className="link" onClick={() => go('plan')}>{t('allBills')}</button></div>
          <div className="card list">
            {up.slice(0, 6).map((u) => {
              const name = (id?: string | null) => snap.sources.find((x) => x.id === id)?.name
              const via = u.kind === 'transfer' ? [name(u.sourceId), name(u.toSourceId)].filter(Boolean).join(' → ') : name(u.sourceId)
              return <UpcomingRow key={u.key} item={u} sourceName={via} />
            })}
          </div>
          <Forecast items={up} />
        </>
      )}
    </>
  )
}

/** Each account once: today's balance, what comes in and goes out over the coming days, and what is left. */
function Forecast({ items }: { items: ReturnType<typeof upcoming> }) {
  const { snap, today } = useStore()
  const { t } = useI18n()
  const rows = accountForecast(items, snap, today)
  if (!rows.length) return null
  return (
    <div className="card forecast">
      <div className="label">{t('inDaysBal', { n: UPCOMING_DAYS })}</div>
      {rows.map((f) => (
        <div key={f.source.id} className="fc-row">
          <div className="fc-top">
            <b>{f.source.name}</b>
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

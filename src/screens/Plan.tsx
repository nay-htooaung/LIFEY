import { categorySpent, monthEndPlan, monthPace, potShares, potThisMonth, potTotal, savedTotal } from '../domain/money'
import { parts } from '../domain/dates'
import { isTemplate, nextOccurrence } from '../domain/recurring'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, usePersonName, useStore } from '../data/store'
import { CategoryDetail } from '../sheets/CategoryDetail'
import { CategorySheet } from '../sheets/CategorySheet'
import { PotSheet } from '../sheets/PotSheet'
import { EntrySheet } from '../sheets/EntrySheet'
import { Glyph } from '../ui/bits'
import { IconRepeat } from '../ui/icons'
import { useUI } from '../ui/ui'
import type { Category } from '../domain/types'

export function Plan() {
  const { snap, space, today } = useStore()
  const { cat } = useLookups()
  const ui = useUI()
  const { t, dateShort } = useI18n()
  const cats = snap.categories.filter((c) => c.spaceId === space.id)
  const pace = monthPace(today)
  const templates = snap.entries.filter((e) => e.spaceId === space.id && isTemplate(e))
  const edit = (c?: Category) => ui.open(<CategorySheet category={c} />, toneVar(space))

  return (
    <>
      <MonthEnd />

      <div className="sec-h"><h3>{t('budgets')}</h3></div>
      <CategoryBars cats={cats.filter((c) => c.kind === 'expense')} pace={pace} />
      <button className="btn" onClick={() => edit()}>{t('newCat')}</button>

      <Savings />

      {cats.some((c) => c.kind === 'income') && (
        <>
          <div className="sec-h"><h3>{t('incomeCats')}</h3></div>
          <CategoryBars cats={cats.filter((c) => c.kind === 'income')} pace={pace} />
        </>
      )}

      {templates.length > 0 && (
        <>
          <div className="sec-h"><h3>{t('repeating')}</h3></div>
          <div className="card list">
            {templates.map((e) => {
              const next = nextOccurrence(e, today)
              const c = e.categoryId ? cat.get(e.categoryId) : undefined
              return (
                <button key={e.id} className="row" disabled={e.createdBy !== snap.me.id}
                  onClick={() => ui.open(<EntrySheet scheduleOf={e.id} />, toneVar(space))}>
                  <Glyph category={e.kind === 'transfer' ? { name: '⇄', color: 'var(--card-2)' } : c} />
                  <div className="main">
                    <div className="t">{e.name || e.note || (e.kind === 'transfer' ? t('transfer') : c?.name)}</div>
                    <div className="s"><IconRepeat /> {t(e.repeat as 'monthly')}{next ? ` · ${t('nextOn', { d: dateShort(next) })}` : ''}</div>
                  </div>
                  <span className={'amt num' + (e.kind === 'income' ? ' amt-in' : '')}>{yen(e.amount)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

/** What is left at the end of the month once every budget is used, and how it adds up. */
function MonthEnd() {
  const { snap, space, today } = useStore()
  const { t, month } = useI18n()
  const r = monthEndPlan(space.id, snap, today)
  // the balance is where it starts; the rest add (+) or take away
  const steps: [string, number][] = [
    [t('meCards'), -r.cardOwed], [t('meIncome'), r.incomeAhead], [t('meBudgets'), -r.budgetLeft],
    [t('meOther'), -r.otherAhead], [t('meSaving'), -r.saving],
  ]
  return (
    <div className="card me-card">
      <span className="label">{t('meTitle', { m: month(parts(today)[1]) })}</span>
      <div className={'me-big num' + (r.left < 0 ? ' neg' : '')}>{yen(r.left)}</div>
      <div className="me-rows">
        <div className="me-row"><span>{t('meBalance')}</span><span className="num">{yen(r.balance)}</span></div>
        {steps.filter(([, v]) => v !== 0).map(([label, v]) => (
          <div key={label} className="me-row">
            <span>{label}</span>
            <span className={'num' + (v > 0 ? ' amt-in' : '')}>{v > 0 ? '+' : ''}{yen(v)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Each category this month: tap for its entries. A budget gets a bar against it with the month's pace; without one,
 * the bar compares it with the category that used the most.
 */
function CategoryBars({ cats, pace }: { cats: Category[]; pace: number }) {
  const { snap, space, today } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  if (!cats.length) return null
  const used = new Map(cats.map((c) => [c.id, categorySpent(snap.entries, c, today)]))
  const most = Math.max(1, ...used.values())
  return (
    <div className="card" style={{ paddingBlock: 6 }}>
      {cats.map((c) => {
        const spent = used.get(c.id)!
        const b = c.kind === 'expense' ? c.monthlyBudget : 0
        const r = b ? spent / b : spent / most
        const col = c.kind === 'income' ? 'var(--pos)' : !b ? 'var(--muted)' : r > 1 ? 'var(--neg)' : r > pace + 0.1 ? 'var(--warn)' : 'var(--pos)'
        return (
          <button key={c.id} className="bud" onClick={() => ui.open(<CategoryDetail id={c.id} />, toneVar(space))}>
            <div className="h">
              <span><span className="sw" style={{ background: c.color }} /><b>{c.name}</b></span>
              <span className="num use">
                <span style={b && r > 1 ? { color: 'var(--neg)' } : c.kind === 'income' && spent ? { color: 'var(--pos)' } : undefined}>{yen(spent)}</span>
                {b ? <span className="of"> / {yen(b)}</span> : c.kind === 'expense' ? <span className="of"> · {t('noBudget')}</span> : null}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${Math.min(100, r * 100)}%`, background: col }} />
              {b ? <span className="pace" style={{ left: `${pace * 100}%` }} /> : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}

/** 貯金: each pot's total towards its goal, this month against its monthly amount, and in a shared space who put in what. */
function Savings() {
  const { snap, space, today } = useStore()
  const ui = useUI()
  const person = usePersonName()
  const { t } = useI18n()
  const pots = snap.pots.filter((p) => p.spaceId === space.id && !p.archived)
  const shared = space.kind === 'household'
  return (
    <>
      <div className="sec-h">
        <h3>{t('savings')}</h3>
        {pots.length > 0 && <span className="hint num">{t('savedSoFar', { a: yen(savedTotal(space.id, snap)) })}</span>}
      </div>
      {pots.length > 0 && (
        <div className="card" style={{ paddingBlock: 6 }}>
          {pots.map((p) => {
            const total = potTotal(p, snap.potMoves)
            const month = Math.max(0, potThisMonth(p, snap.potMoves, today))
            const shares = shared ? potShares(p, snap.potMoves).filter((x) => x.amount > 0) : []
            return (
              <button key={p.id} className="bud" onClick={() => ui.open(<PotSheet pot={p} />, toneVar(space))}>
                <div className="h">
                  <span><span className="sw" style={{ background: p.color }} /><b>{p.name}</b></span>
                  <span className="num use">{yen(total)}{p.goal ? <span className="of"> / {yen(p.goal)}</span> : null}</span>
                </div>
                {p.goal ? <div className="bar"><i style={{ width: `${Math.min(100, Math.max(0, total / p.goal) * 100)}%`, background: p.color }} /></div> : null}
                <div className="pot-s">
                  {p.monthly ? <span className={month >= p.monthly ? 'amt-in' : ''}>{t('thisMonthOf', { a: yen(month), b: yen(p.monthly) })}</span> : null}
                  {shares.length > 0 && <span>{shares.map((x) => `${person(x.id)} ${yen(x.amount)}`).join(' · ')}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}
      <button className="btn" onClick={() => ui.open(<PotSheet />, toneVar(space))}>{t('newPot')}</button>
    </>
  )
}

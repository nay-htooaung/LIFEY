import { useEffect } from 'react'
import { monthKey, parts } from '../domain/dates'
import { categorySpent } from '../domain/money'
import { useI18n, yen } from '../i18n'
import { toneVar, useStore } from '../data/store'
import { usePaidWith } from '../ui/entry'
import { IconEdit } from '../ui/icons'
import { useUI } from '../ui/ui'
import { CategorySheet } from './CategorySheet'
import { EntryDetail } from './EntryDetail'

/** One category this month: what went out (or came in) against its budget, and each entry in a compact list. */
export function CategoryDetail({ id }: { id: string }) {
  const { snap, space, today } = useStore()
  const ui = useUI()
  const { t, month, dateShort } = useI18n()
  const paidWith = usePaidWith()
  const c = snap.categories.find((x) => x.id === id)
  // deleted from its edit sheet: nothing left to show
  useEffect(() => {
    if (!c) ui.close()
  }, [c, ui])
  if (!c) return null

  const key = monthKey(today)
  const entries = snap.entries
    .filter((e) => e.categoryId === c.id && e.occurredOn.startsWith(key) && e.occurredOn <= today)
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
  const used = categorySpent(snap.entries, c, today)
  const b = c.monthlyBudget
  const income = c.kind === 'income'

  return (
    <>
      <div className="cd-h">
        <span className="sw" style={{ background: c.color }} />
        <h2>{c.name}</h2>
        <button className="icon-round" aria-label={t('catEdit')} onClick={() => ui.push(<CategorySheet category={c} />, toneVar(space))}><IconEdit /></button>
      </div>
      <div className="cd-sum">
        <span className="label">{t(income ? 'receivedIn' : 'spentIn', { m: month(parts(today)[1]) })}</span>
        <div className="cd-amt num">
          <b className={income ? 'amt-in' : used > b && b ? 'neg' : ''}>{yen(used)}</b>
          {b > 0 && <span className="of"> / {yen(b)}</span>}
        </div>
        {b > 0 && <div className="bar"><i style={{ width: `${Math.min(100, (used / b) * 100)}%`, background: used > b ? 'var(--neg)' : c.color }} /></div>}
        {!income && <div className="small muted">{b ? (used > b ? t('overBy', { a: yen(used - b) }) : t('leftOf', { a: yen(b - used) })) : t('noBudget')}</div>}
      </div>
      {entries.length ? (
        <div className="card cd-list">
          {entries.map((e) => (
            <button key={e.id} className="cd-row" onClick={() => ui.push(<EntryDetail id={e.id} />, toneVar(space))}>
              <span className="cd-d num">{dateShort(e.occurredOn)}</span>
              <span className="cd-t">
                <b>{e.name || e.note || '—'}</b>
                <small>{paidWith(e).label}</small>
              </span>
              <span className={'num' + (income ? ' amt-in' : '')}>{yen(e.amount)}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="card empty">{t('nothingInCat')}</div>
      )}
    </>
  )
}

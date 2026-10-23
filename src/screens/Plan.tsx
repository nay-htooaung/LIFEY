import { categorySpent, monthPace } from '../domain/money'
import { isTemplate, nextOccurrence } from '../domain/recurring'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, useStore } from '../data/store'
import { CategorySheet } from '../sheets/CategorySheet'
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
      <div className="sec-h"><h3>{t('budgets')}</h3></div>
      <div className="card" style={{ paddingBlock: 6 }}>
        {cats.filter((c) => c.kind === 'expense').map((c) => {
          const spent = categorySpent(snap.entries, c, today)
          const b = c.monthlyBudget
          const r = b ? spent / b : 0
          const col = !b ? 'var(--muted)' : r > 1 ? 'var(--neg)' : r > pace + 0.1 ? 'var(--warn)' : 'var(--pos)'
          return (
            <button key={c.id} className="bud" onClick={() => edit(c)}>
              <div className="h">
                <span><span className="sw" style={{ background: c.color }} /><b>{c.name}</b></span>
                <span className="num use"><span style={r > 1 ? { color: 'var(--neg)' } : undefined}>{yen(spent)}</span>{b ? <span className="of"> / {yen(b)}</span> : null}</span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.min(100, r * 100)}%`, background: col }} />
                {b ? <span className="pace" style={{ left: `${pace * 100}%` }} /> : null}
              </div>
            </button>
          )
        })}
      </div>
      <button className="btn" onClick={() => edit()}>{t('newCat')}</button>

      {cats.some((c) => c.kind === 'income') && (
        <>
          <div className="sec-h"><h3>{t('incomeCats')}</h3></div>
          <div className="chips wrap">
            {cats.filter((c) => c.kind === 'income').map((c) => (
              <button key={c.id} className="chip" onClick={() => edit(c)}><span className="sw" style={{ background: c.color }} />{c.name}</button>
            ))}
          </div>
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

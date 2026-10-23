import { daysUntil, type Upcoming } from '../domain/money'
import type { Entry } from '../domain/types'
import { parts } from '../domain/dates'
import { useI18n, yen } from '../i18n'
import { useLookups, usePersonName, useStore } from '../data/store'
import { EntryDetail } from '../sheets/EntryDetail'
import { Glyph } from './bits'
import { IconLock, IconRepeat } from './icons'
import { useUI } from './ui'

/** How an entry was paid, from the viewer's side: other members' personal methods stay hidden. */
export function usePaidWith() {
  const { snap } = useStore()
  const { method, source } = useLookups()
  const person = usePersonName()
  const { t } = useI18n()
  return (e: Entry) => {
    const m = e.methodId ? method.get(e.methodId) : undefined
    const s = e.sourceId ? source.get(e.sourceId) : undefined
    const visible = e.methodId ? m : s
    const label = !visible ? t('hiddenSrc', { p: person(e.createdBy) })
      : e.kind === 'expense' && !e.methodId ? t('bankTransfer', { s: visible.name }) : visible.name
    const personal = !visible || (visible.spaceId !== e.spaceId && snap.spaces.find((x) => x.id === visible.spaceId)?.kind === 'personal')
    return { label, personal, mine: !!visible && personal }
  }
}

export function EntryRow({ entry, showDate }: { entry: Entry; showDate?: boolean }) {
  const { snap, space, today } = useStore()
  const { cat } = useLookups()
  const ui = useUI()
  const { t, dateShort } = useI18n()
  const paidWith = usePaidWith()
  const person = usePersonName()
  const c = entry.categoryId ? cat.get(entry.categoryId) : undefined
  const pw = paidWith(entry)
  const shared = space.kind === 'household'
  const logger = snap.profiles[entry.createdBy]
  return (
    <button className="row" onClick={() => ui.open(<EntryDetail id={entry.id} />)}>
      <Glyph category={c} />
      <div className="main">
        <div className="t">{entry.name || entry.note || c?.name || '—'}</div>
        <div className="s">
          {shared && (
            <span className="who"><i style={{ background: logger?.color ?? 'var(--muted)' }} />{person(entry.createdBy)} ·</span>
          )}
          {shared && pw.personal && <IconLock />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pw.label}</span>
          {(entry.repeat !== 'none' || entry.repeatOf) && <IconRepeat />}
          {showDate && <span>· {entry.occurredOn === today ? t('today') : dateShort(entry.occurredOn)}</span>}
        </div>
      </div>
      <span className={'amt num' + (entry.kind === 'income' ? ' amt-in' : '')}>
        {entry.kind === 'expense' ? '-' : '+'}{yen(entry.amount)}
      </span>
    </button>
  )
}

/** `sourceName`: the account the money moves through, when there is one. */
export function UpcomingRow({ item, sourceName }: { item: Upcoming; sourceName?: string }) {
  const { today } = useStore()
  const { t, month } = useI18n()
  const [, m, d] = parts(item.on)
  const n = daysUntil(today, item.on)
  return (
    <div className="row">
      <span className="date-chip"><b>{d}</b><small>{month(m)}</small></span>
      <div className="main">
        <div className="t">{item.name}</div>
        <div className="s">
          {n === 0 ? t('today') : n === 1 ? t('tomorrow') : t('inDays', { n })} ·{' '}
          {item.kind === 'card' ? <span className="pill warn">{t('cardPay')}</span>
            : item.kind === 'income' ? <span className="pill">{t('income')}</span>
            : <span className="pill mute"><IconRepeat /> {t('repeats')}</span>}
        </div>
        {sourceName && <div className="s">{sourceName}</div>}
      </div>
      <span className={'amt num' + (item.kind === 'income' ? ' amt-in' : '')}>{item.kind === 'income' ? '+' : ''}{yen(item.amount)}</span>
    </div>
  )
}

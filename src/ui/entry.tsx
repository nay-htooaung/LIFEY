import { daysUntil, type Upcoming } from '../domain/money'
import type { Entry } from '../domain/types'
import { parts } from '../domain/dates'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, usePersonName, useStore } from '../data/store'
import { EntryDetail } from '../sheets/EntryDetail'
import { EntrySheet } from '../sheets/EntrySheet'
import { Glyph } from './bits'
import { IconLock, IconRepeat } from './icons'
import { useUI } from './ui'

/**
 * How an entry was paid, from the viewer's side: other members' personal methods stay hidden.
 * For a transfer, the label reads "from → to" (from is a source, or a card charging e-money), each side hidden the same way.
 */
export function usePaidWith() {
  const { snap } = useStore()
  const { method, source } = useLookups()
  const person = usePersonName()
  const { t } = useI18n()
  return (e: Entry) => {
    const m = e.methodId ? method.get(e.methodId) : undefined
    const s = e.sourceId ? source.get(e.sourceId) : undefined
    const visible = e.methodId ? m : s
    const nameOf = (x?: { name: string }) => x?.name ?? t('hiddenSrc', { p: person(e.createdBy) })
    const label = e.kind === 'transfer'
      ? `${nameOf(visible)} → ${nameOf(e.toSourceId ? source.get(e.toSourceId) : undefined)}`
      : nameOf(visible)
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
      <Glyph category={entry.kind === 'transfer' ? { name: '⇄', color: 'var(--card-2)' } : c} />
      <div className="main">
        <div className="t">{entry.name || entry.note || (entry.kind === 'transfer' ? t('transfer') : c?.name) || '—'}</div>
        <div className="s">
          {shared && (
            <span className="who"><i style={{ background: logger?.color ?? 'var(--muted)' }} />{person(entry.createdBy)} ·</span>
          )}
          {shared && pw.personal && <IconLock />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pw.label}</span>
          {(entry.repeat !== 'none' || entry.repeatOf) && <IconRepeat />}
          {entry.fee > 0 && <span>· {t('fee')} {yen(entry.fee)}</span>}
          {showDate && <span>· {entry.occurredOn === today ? t('today') : dateShort(entry.occurredOn)}</span>}
        </div>
      </div>
      {/* a transfer is not spending or income, so it carries no sign */}
      <span className={'amt num' + (entry.kind === 'income' ? ' amt-in' : '')}>
        {entry.kind === 'expense' ? '-' : entry.kind === 'income' ? '+' : ''}{yen(entry.amount)}
      </span>
    </button>
  )
}

/** `sourceName`: the account the money moves through, when there is one; `onlyMe`: it is personal, shown to me only. */
export function UpcomingRow({ item, sourceName, onlyMe }: { item: Upcoming; sourceName?: string; onlyMe?: boolean }) {
  const { today, snap, space } = useStore()
  const { t, month } = useI18n()
  const [, m, d] = parts(item.on)
  const n = daysUntil(today, item.on)
  const ui = useUI()
  // a repeating item opens its schedule; card payments have nothing to edit
  const template = item.templateId ? snap.entries.find((e) => e.id === item.templateId) : undefined
  const editable = template && template.createdBy === snap.me.id
  const Tag = editable ? 'button' : 'div'
  return (
    <Tag className="row" {...(editable ? { onClick: () => ui.open(<EntrySheet scheduleOf={template.id} />, toneVar(space)) } : {})}>
      <span className="date-chip"><b>{d}</b><small>{month(m)}</small></span>
      <div className="main">
        <div className="t">{item.name || (item.kind === 'transfer' ? t('transfer') : '')}</div>
        <div className="s">
          {n === 0 ? t('today') : n === 1 ? t('tomorrow') : t('inDays', { n })} ·{' '}
          {item.kind === 'card' ? <span className="pill warn">{t('cardPay')}</span>
            : item.kind === 'income' ? <span className="pill">{t('income')}</span>
            : item.kind === 'transfer' ? <span className="pill mute">⇄ {t('transfer')}</span>
            : <span className="pill mute"><IconRepeat /> {t('repeats')}</span>}
        </div>
        {sourceName && (
          <div className="s">{onlyMe && <IconLock />}<span>{sourceName}</span>{onlyMe && <span>· {t('onlyYouShort')}</span>}</div>
        )}
      </div>
      <span className={'amt num' + (item.kind === 'income' ? ' amt-in' : '')}>{item.kind === 'income' ? '+' : ''}{yen(item.amount)}</span>
    </Tag>
  )
}

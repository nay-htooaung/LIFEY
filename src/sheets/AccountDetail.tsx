import { useEffect, useRef, useState } from 'react'
import { addMonths, monthKey, parts } from '../domain/dates'
import { accountLines, creditOutstanding, nextCardPayment, sourceBalance, type AccountLine } from '../domain/money'
import { useI18n, yen } from '../i18n'
import { useLookups, useStore } from '../data/store'
import { IconEdit } from '../ui/icons'
import { useUI } from '../ui/ui'
import { EntryDetail } from './EntryDetail'
import { MethodSheet } from './MethodSheet'
import { SourceSheet } from './SourceSheet'

/**
 * A source or a payment method: what it holds or owes now, then what went through it month by month, newest first.
 * This month and last month show at once; older months load as the list scrolls to its end.
 */
export function AccountDetail({ sourceId, methodId }: { sourceId?: string; methodId?: string }) {
  const { snap, today, ensureMonth, hasMonth } = useStore()
  const { source: sourceOf } = useLookups()
  const ui = useUI()
  const { t, ordinal, month: monthName } = useI18n()
  const source = sourceId ? snap.sources.find((x) => x.id === sourceId) : undefined
  const method = methodId ? snap.methods.find((x) => x.id === methodId) : undefined
  const account = source ?? method
  const [shown, setShown] = useState(2)
  const end = useRef<HTMLDivElement>(null)

  // nothing before the account (or the source a method is paid from) was added
  const startedOn = source?.createdOn ?? (method ? sourceOf.get(method.sourceId)?.createdOn : undefined) ?? today
  const thisMonth = monthKey(today)
  const months = Array.from({ length: shown }, (_, i) => monthKey(addMonths(`${thisMonth}-01`, -i)))
    .filter((m) => m >= monthKey(startedOn) || m >= monthKey(addMonths(`${thisMonth}-01`, -1)))
  const more = monthKey(addMonths(`${thisMonth}-01`, -shown)) >= monthKey(startedOn)

  useEffect(() => months.forEach(ensureMonth), [months.join(), ensureMonth]) // eslint-disable-line react-hooks/exhaustive-deps
  // deleted from its edit sheet: back to the list
  useEffect(() => {
    if (!account || account.archived) ui.close()
  }, [account, ui])
  // the end of the list coming into view loads the month before
  useEffect(() => {
    const el = end.current
    if (!el || !more) return
    const io = new IntersectionObserver((seen) => seen.some((x) => x.isIntersecting) && setShown((n) => n + 1), { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, shown])
  if (!account) return null

  const lines = (m: string) => accountLines(source ? { source } : { method: method! }, snap, m)
  const owed = method?.kind === 'credit' ? creditOutstanding(method, snap.flows, today) : 0
  const next = method?.kind === 'credit' ? nextCardPayment(method, snap.flows, today) : null

  return (
    <>
      <div className="cd-h">
        <h2>{account.name}</h2>
        <button className="icon-round" aria-label={t('edit')}
          onClick={() => ui.push(source ? <SourceSheet editId={source.id} /> : <MethodSheet editId={method!.id} />)}><IconEdit /></button>
      </div>
      <div className="cd-sum">
        {source && <>
          <span className="label">{t('balanceNow')}</span>
          <div className="cd-amt num"><b>{yen(sourceBalance(source, snap.methods, snap.flows, today))}</b></div>
        </>}
        {method?.kind === 'credit' && <>
          <span className="label">{t('owedNow')}</span>
          <div className="cd-amt num"><b>{yen(owed)}</b></div>
          {next && <div className="small muted">{t('payIn', { a: yen(next.amount), d: `${monthName(parts(next.on)[1])} ${ordinal(parts(next.on)[2])}` })}</div>}
        </>}
        {method && method.kind !== 'credit' && <div className="small muted">{t('from', { s: sourceOf.get(method.sourceId)?.name ?? '—' })}</div>}
      </div>
      {months.map((m) => {
        const ls = lines(m)
        const ahead = m === thisMonth ? ls.filter((l) => l.on > today) : []
        const done = ls.filter((l) => l.on <= today)
        const inn = done.filter((l) => l.amount > 0).reduce((a, l) => a + l.amount, 0)
        const out = done.filter((l) => l.amount < 0).reduce((a, l) => a - l.amount, 0)
        return (
          <section key={m} className="ad-month">
            <div className="ad-mh">
              <b>{monthName(parts(`${m}-01`)[1])}{parts(`${m}-01`)[0] !== parts(today)[0] ? ` ${parts(`${m}-01`)[0]}` : ''}</b>
              <span className="num small muted">{inn > 0 && <span className="amt-in">+{yen(inn)} </span>}{out > 0 && `-${yen(out)}`}</span>
            </div>
            {!hasMonth(m) ? <div className="card empty">{t('loading')}</div> : !ls.length ? <div className="card empty">{t('nothingThisMonth')}</div> : (
              <div className="card cd-list">
                {ahead.length > 0 && <div className="ad-sub">{t('scheduled')}</div>}
                {ahead.map((l) => <Line key={l.key} line={l} />)}
                {ahead.length > 0 && done.length > 0 && <div className="ad-sub">{t('done')}</div>}
                {done.map((l) => <Line key={l.key} line={l} />)}
              </div>
            )}
          </section>
        )
      })}
      <div ref={end} className="small muted ad-end">{more ? t('loading') : t('noOlder')}</div>
    </>
  )
}

function Line({ line }: { line: AccountLine }) {
  const { snap, space } = useStore()
  const { cat } = useLookups()
  const ui = useUI()
  const { t, dateShort } = useI18n()
  const e = line.entry
  const c = e?.categoryId ? cat.get(e.categoryId) : undefined
  const where = e && e.spaceId !== space.id ? snap.spaces.find((x) => x.id === e.spaceId)?.name : undefined
  const title = line.card ? line.card.name : line.hidden ? t('othersEntries')
    : e!.name || e!.note || (e!.kind === 'transfer' ? t('transfer') : c?.name) || '—'
  const sub = line.card ? t('cardPay')
    : [e && (e.name || e.note) && c?.name !== title ? c?.name : undefined, e?.kind === 'transfer' ? t('transfer') : undefined, where].filter(Boolean).join(' · ')
  const Tag = e ? 'button' : 'div'
  return (
    <Tag className="cd-row" {...(e ? { onClick: () => ui.push(<EntryDetail id={e.id} />) } : {})}>
      <span className="cd-d num">{line.hidden ? '' : dateShort(line.on)}</span>
      <span className="cd-t"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <span className={'num' + (line.amount > 0 ? ' amt-in' : '')}>{line.amount > 0 ? '+' : '-'}{yen(Math.abs(line.amount))}</span>
    </Tag>
  )
}

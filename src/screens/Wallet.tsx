import { creditLimitUse, creditOutstanding, netPosition, nextCardPayment, sourceBalance } from '../domain/money'
import type { MethodKind, SourceKind } from '../domain/types'
import { parts } from '../domain/dates'
import { useI18n, yen } from '../i18n'
import { useLookups, useStore } from '../data/store'
import { MethodSheet } from '../sheets/MethodSheet'
import { SourceSheet } from '../sheets/SourceSheet'
import { IconLock } from '../ui/icons'
import { useUI } from '../ui/ui'

const SRC_GLYPH: Record<SourceKind, string> = { bank: '銀', savings: '貯', cash: '¥' }
const METHOD_GLYPH: Record<MethodKind, string> = { cash: '¥', debit: 'D', emoney: 'e', credit: 'C' }

export function Wallet() {
  const { snap, space, today } = useStore()
  const { source } = useLookups()
  const ui = useUI()
  const { t, ordinal, month } = useI18n()
  const sources = snap.sources.filter((s) => s.spaceId === space.id)
  const methods = snap.methods.filter((m) => m.spaceId === space.id)
  const pos = netPosition(space.id, snap, today)
  const dueLabel = (d: string) => {
    const [, m, dd] = parts(d)
    return `${month(m)} ${ordinal(dd)}`
  }

  return (
    <>
      <div className="card networth">
        <div className="label">{space.kind === 'personal' ? t('netWorth') : t('netShared')}</div>
        <div className="big num">{yen(pos.net)}</div>
        <div className="small muted">{t('inSources', { a: yen(pos.assets), b: yen(pos.credit) })}</div>
      </div>
      {space.kind === 'household' && <div className="privacy"><IconLock /><span>{t('privacyNote')}</span></div>}

      <div className="sec-h"><h3>{t('sources')}</h3><button className="link" onClick={() => ui.open(<SourceSheet />)}>{t('addSource')}</button></div>
      <div className="card list">
        {sources.length ? sources.map((s) => (
          <div key={s.id} className="row">
            <span className="glyph acc">{SRC_GLYPH[s.kind]}</span>
            <div className="main"><div className="t">{s.name}</div><div className="s">{t(s.kind)}{space.kind === 'household' ? ` · ${t('shared')}` : ''}</div></div>
            <span className="amt num">{yen(sourceBalance(s, snap.methods, snap.flows, today))}</span>
          </div>
        )) : <p className="empty">{t('noSources')}</p>}
      </div>

      <div className="sec-h"><h3>{t('methods')}</h3><button className="link" onClick={() => ui.open(<MethodSheet />)}>{t('addMethod')}</button></div>
      {methods.filter((m) => m.kind === 'credit').map((m) => {
        const owed = creditOutstanding(m, snap.flows, today)
        const next = nextCardPayment(m, snap.flows, today)
        const lim = creditLimitUse(m, snap.methods, snap.flows, today)
        const used = lim ? lim.used / lim.limit : 0
        return (
          <button key={m.id} className="cc" onClick={() => ui.open(<MethodSheet editId={m.id} />)}>
            <div className="row1"><b>{m.name}</b><span className="muted">{t('credit')}</span></div>
            <div><div className="tiny muted">{t('curBal')}</div><div className="bal">{yen(owed)}</div></div>
            {lim ? <div className="util"><i style={{ width: `${Math.min(100, used * 100)}%` }} /></div> : null}
            <div className="meta">
              {lim ? <span>{t('ofLimit', { p: Math.round(used * 100), l: yen(lim.limit) })}</span> : <span />}
              <span>{m.closingDay === 31 ? t('lastDay') : t('closes', { d: ordinal(m.closingDay ?? 31) })}</span>
            </div>
            <div className="meta">
              <b>{next ? t('payIn', { a: yen(next.amount), d: dueLabel(next.on) }) : t('noPayment')}</b>
              <span>{t('from', { s: source.get(m.sourceId)?.name ?? '—' })}</span>
            </div>
            {lim && lim.others.length > 0 && <div className="meta"><span>{t('alsoOnLimit', { x: lim.others.map((o) => o.name).join(', ') })}</span></div>}
          </button>
        )
      })}
      {methods.some((m) => m.kind !== 'credit') && (
        <div className="card list">
          {methods.filter((m) => m.kind !== 'credit').map((m) => (
            <button key={m.id} className="row" onClick={() => ui.open(<MethodSheet editId={m.id} />)}>
              <span className="glyph plain">{METHOD_GLYPH[m.kind]}</span>
              <div className="main"><div className="t">{m.name}</div><div className="s">{t(m.kind)} · {t('from', { s: source.get(m.sourceId)?.name ?? '—' })}</div></div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

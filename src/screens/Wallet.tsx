import { creditLimitUse, creditOutstanding, netPosition, nextCardPayment, savedTotal, sourceBalance } from '../domain/money'
import type { MethodKind, SourceKind } from '../domain/types'
import { parts } from '../domain/dates'
import { useI18n, yen } from '../i18n'
import { useLookups, useStore } from '../data/store'
import { AccountDetail } from '../sheets/AccountDetail'
import { MethodSheet } from '../sheets/MethodSheet'
import { SourceSheet } from '../sheets/SourceSheet'
import { useUI } from '../ui/ui'

const SRC_GLYPH: Record<SourceKind, string> = { bank: '銀', cash: '¥', emoney: 'e' }
const METHOD_GLYPH: Record<MethodKind, string> = { cash: '¥', debit: 'D', credit: 'C' }

export function Wallet() {
  const { snap, space, today } = useStore()
  const { source } = useLookups()
  const ui = useUI()
  const { t, ordinal, month } = useI18n()
  const sources = snap.sources.filter((s) => s.spaceId === space.id && !s.archived)
  const methods = snap.methods.filter((m) => m.spaceId === space.id && !m.archived)
  const pos = netPosition(space.id, snap, today)
  // 貯金 is set aside on paper: what is left is free to use
  const saved = savedTotal(space.id, snap)
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
        {saved !== 0 && <div className="small nw-split">{t('savedSplit', { a: yen(saved), b: yen(pos.net - saved) })}</div>}
      </div>

      <div className="sec-h"><h3>{t('sources')}</h3><button className="link" onClick={() => ui.open(<SourceSheet />)}>{t('addSource')}</button></div>
      <div className="card list">
        {sources.length ? sources.map((s) => (
          <button key={s.id} className="row" onClick={() => ui.open(<AccountDetail sourceId={s.id} />)}>
            <span className="glyph acc">{SRC_GLYPH[s.kind]}</span>
            <div className="main"><div className="t">{s.name}</div><div className="s">{t(s.kind)}{space.kind === 'household' ? ` · ${t('shared')}` : ''}</div></div>
            <span className="amt num">{yen(sourceBalance(s, snap.methods, snap.flows, today))}</span>
          </button>
        )) : <p className="empty">{t('noSources')}</p>}
      </div>

      <div className="sec-h"><h3>{t('methods')}</h3><button className="link" onClick={() => ui.open(<MethodSheet />)}>{t('addMethod')}</button></div>
      {methods.length > 0 && (
        <div className="card list">
          {methods.map((m) => {
            if (m.kind !== 'credit') {
              return (
                <button key={m.id} className="row" onClick={() => ui.open(<AccountDetail methodId={m.id} />)}>
                  <span className="glyph plain">{METHOD_GLYPH[m.kind]}</span>
                  <div className="main"><div className="t">{m.name}</div><div className="s">{t(m.kind)} · {t('from', { s: source.get(m.sourceId)?.name ?? '—' })}</div></div>
                </button>
              )
            }
            // a card: what is owed now, the next payment, and how much of the limit is used
            const owed = creditOutstanding(m, snap.flows, today)
            const next = nextCardPayment(m, snap.flows, today)
            const lim = creditLimitUse(m, snap.methods, snap.flows, today)
            const used = lim ? lim.used / lim.limit : 0
            return (
              <button key={m.id} className="row" onClick={() => ui.open(<AccountDetail methodId={m.id} />)}>
                <span className="glyph acc">{METHOD_GLYPH.credit}</span>
                <div className="main">
                  <div className="t">{m.name}</div>
                  <div className="s">{next ? t('payIn', { a: yen(next.amount), d: dueLabel(next.on) }) : t('noPayment')}</div>
                  {lim && (
                    <div className="util-row">
                      <div className="util"><i style={{ width: `${Math.min(100, used * 100)}%`, ...(used > 0.9 ? { background: 'var(--neg)' } : {}) }} /></div>
                      <span className="num">{Math.round(used * 100)}%</span>
                    </div>
                  )}
                </div>
                <span className="amt num">{yen(owed)}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}

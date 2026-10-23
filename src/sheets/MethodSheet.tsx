import { useState } from 'react'
import type { MethodKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { parseYen } from '../ui/bits'
import { useUI } from '../ui/ui'
import { SourceSheet } from './SourceSheet'

export function MethodSheet() {
  const { snap, space, act } = useStore()
  const ui = useUI()
  const { t, ordinal } = useI18n()
  const sources = snap.sources.filter((s) => s.spaceId === space.id)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<MethodKind>('credit')
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '')
  const [limit, setLimit] = useState('')
  const [close, setClose] = useState(15)
  const [pay, setPay] = useState(10)

  if (!sources.length) {
    return (
      <>
        <h2>{t('mTitle')}</h2>
        <p className="lead">{t('needSource')}</p>
        <button className="btn primary big" onClick={() => ui.open(<SourceSheet />)}>{t('srcTitle')}</button>
      </>
    )
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const save = () => {
    const n = name.trim()
    if (!n) return document.getElementById('m-name')?.focus()
    const credit = kind === 'credit'
    ui.close()
    void act(
      (r) => r.addMethod({
        spaceId: space.id, name: n, kind, sourceId,
        creditLimit: credit ? parseYen(limit) || null : null, closingDay: credit ? close : null, paymentDay: credit ? pay : null,
      }),
      t('added', { x: n }),
    )
  }

  return (
    <>
      <h2>{t('mTitle')}</h2>
      <div className="field">
        <label className="label" htmlFor="m-name">{t('name')}</label>
        <input id="m-name" value={name} maxLength={60} placeholder={t('mPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="two">
        <div className="field">
          <label className="label" htmlFor="m-kind">{t('kind')}</label>
          <select id="m-kind" value={kind} onChange={(e) => setKind(e.target.value as MethodKind)}>
            <option value="credit">{t('creditCard')}</option>
            <option value="debit">{t('debitCard')}</option>
            <option value="emoney">{t('emoney')}</option>
            <option value="cash">{t('cash')}</option>
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="m-src">{t('paidFrom')}</label>
          <select id="m-src" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {kind === 'credit' && (
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="m-limit">{t('limit')}</label>
            <input id="m-limit" inputMode="numeric" value={limit} placeholder="¥300,000" onChange={(e) => setLimit(e.target.value)} />
          </div>
          <div className="two">
            <div className="field">
              <label className="label" htmlFor="m-close">{t('stmtClose')}</label>
              <select id="m-close" value={close} onChange={(e) => setClose(+e.target.value)}>
                {days.map((d) => <option key={d} value={d}>{d === 31 ? t('lastDay') : t('ofMonth', { d: ordinal(d) })}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="m-pay">{t('payDue')}</label>
              <select id="m-pay" value={pay} onChange={(e) => setPay(+e.target.value)}>
                {days.map((d) => <option key={d} value={d}>{d === 31 ? t('lastDay') : t('ofMonth', { d: ordinal(d) })}</option>)}
              </select>
            </div>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>{t('dueHint')}</p>
        </div>
      )}
      <button className="btn primary big" onClick={save}>{t('mTitle')}</button>
    </>
  )
}

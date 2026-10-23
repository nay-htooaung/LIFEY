import { useState } from 'react'
import type { MethodKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { parseYen } from '../ui/bits'
import { useUI } from '../ui/ui'
import { SourceSheet } from './SourceSheet'

/** Adds a payment method to the current space, or edits `editId` (its kind stays fixed). */
export function MethodSheet({ editId }: { editId?: string }) {
  const { snap, space, act } = useStore()
  const ui = useUI()
  const { t, ordinal } = useI18n()
  const base = editId ? snap.methods.find((m) => m.id === editId) : undefined
  const spaceId = base?.spaceId ?? space.id
  const sources = snap.sources.filter((s) => s.spaceId === spaceId)
  const [name, setName] = useState(base?.name ?? '')
  const [kind, setKind] = useState<MethodKind>(base?.kind ?? 'credit')
  const [sourceId, setSourceId] = useState(base?.sourceId ?? sources[0]?.id ?? '')
  const [limit, setLimit] = useState(base?.creditLimit ? String(base.creditLimit) : '')
  const [sharedWith, setSharedWith] = useState(base?.limitSharedWith ?? '')
  const [close, setClose] = useState(base?.closingDay ?? 15)
  const [pay, setPay] = useState(base?.paymentDay ?? 10)

  // Cards whose limit this one can share: credit cards in the same space that keep their own limit.
  const owners = snap.methods.filter((m) => m.spaceId === spaceId && m.kind === 'credit' && !m.limitSharedWith && m.id !== editId)
  // Cards already sharing this one's limit; then this card must keep its own.
  const sharers = editId ? snap.methods.filter((m) => m.limitSharedWith === editId) : []

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
  const dayLabel = (d: number) => (d === 31 ? t('lastDay') : t('ofMonth', { d: ordinal(d) }))
  const save = () => {
    const n = name.trim()
    if (!n) return document.getElementById('m-name')?.focus()
    const credit = kind === 'credit'
    const shared = credit && sharedWith ? sharedWith : null
    const method = {
      spaceId, name: n, kind, sourceId,
      creditLimit: credit && !shared ? parseYen(limit) || null : null, limitSharedWith: shared,
      closingDay: credit ? close : null, paymentDay: credit ? pay : null,
    }
    ui.close()
    void act((r) => (editId ? r.updateMethod(editId, method) : r.addMethod(method).then(() => undefined)), editId ? t('saved') : t('added', { x: n }))
  }

  return (
    <>
      <h2>{editId ? t('editMethod') : t('mTitle')}</h2>
      <div className="field">
        <label className="label" htmlFor="m-name">{t('name')}</label>
        <input id="m-name" value={name} maxLength={60} placeholder={t('mPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="two">
        {!editId && (
          <div className="field">
            <label className="label" htmlFor="m-kind">{t('kind')}</label>
            <select id="m-kind" value={kind} onChange={(e) => setKind(e.target.value as MethodKind)}>
              <option value="credit">{t('creditCard')}</option>
              <option value="debit">{t('debitCard')}</option>
              <option value="emoney">{t('emoney')}</option>
              <option value="cash">{t('cash')}</option>
            </select>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="m-src">{t('paidFrom')}</label>
          <select id="m-src" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      {kind === 'credit' && (
        <div className="stack">
          {owners.length > 0 && !sharers.length && (
            <div className="field">
              <label className="label" htmlFor="m-share">{t('limitLabel')}</label>
              <select id="m-share" value={sharedWith} onChange={(e) => setSharedWith(e.target.value)}>
                <option value="">{t('ownLimit')}</option>
                {owners.map((m) => <option key={m.id} value={m.id}>{t('shareLimit', { x: m.name })}</option>)}
              </select>
              <span className="tiny muted">{t('shareLimitHint')}</span>
            </div>
          )}
          {!sharedWith && (
            <div className="field">
              <label className="label" htmlFor="m-limit">{t('limit')}</label>
              <input id="m-limit" inputMode="numeric" value={limit} placeholder="¥300,000" onChange={(e) => setLimit(e.target.value)} />
              {sharers.length > 0 && <span className="tiny muted">{t('alsoOnLimit', { x: sharers.map((m) => m.name).join(', ') })}</span>}
            </div>
          )}
          <div className="two">
            <div className="field">
              <label className="label" htmlFor="m-close">{t('stmtClose')}</label>
              <select id="m-close" value={close} onChange={(e) => setClose(+e.target.value)}>
                {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="m-pay">{t('payDue')}</label>
              <select id="m-pay" value={pay} onChange={(e) => setPay(+e.target.value)}>
                {days.map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
              </select>
            </div>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>{t('dueHint')}</p>
        </div>
      )}
      <button className="btn primary big" onClick={save}>{editId ? t('save') : t('mTitle')}</button>
    </>
  )
}

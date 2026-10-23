import { useState } from 'react'
import type { MethodKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore, useSubmit } from '../data/store'
import { parseYen } from '../ui/bits'
import { Select } from '../ui/Select'
import { useUI } from '../ui/ui'
import { SourceSheet } from './SourceSheet'

interface Props {
  /** Edit this method; its kind stays fixed. */
  editId?: string
  /** Space for a new method (default: the current space). */
  spaceId?: string
  /** Called with the new method's id once added. */
  onSaved?: (id: string) => void
}

export function MethodSheet({ editId, spaceId: forSpace, onSaved }: Props) {
  const { snap, space } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t, ordinal } = useI18n()
  const base = editId ? snap.methods.find((m) => m.id === editId) : undefined
  const spaceId = base?.spaceId ?? forSpace ?? space.id
  const sources = snap.sources.filter((s) => s.spaceId === spaceId && (!s.archived || s.id === base?.sourceId))
  const [name, setName] = useState(base?.name ?? '')
  const [kind, setKind] = useState<MethodKind>(base?.kind ?? 'credit')
  const [sourceChoice, setSourceId] = useState(base?.sourceId ?? '')
  // falls back to the first source, which may have just been added from this sheet
  const sourceId = sourceChoice || sources[0]?.id || ''
  const [limit, setLimit] = useState(base?.creditLimit ? String(base.creditLimit) : '')
  const [sharedWith, setSharedWith] = useState(base?.limitSharedWith ?? '')
  const [close, setClose] = useState(base?.closingDay ?? 15)
  const [pay, setPay] = useState(base?.paymentDay ?? 10)

  // Cards whose limit this one can share: credit cards in the same space that keep their own limit.
  const owners = snap.methods.filter((m) => m.spaceId === spaceId && m.kind === 'credit' && !m.archived && !m.limitSharedWith && m.id !== editId)
  // Cards already sharing this one's limit; then this card must keep its own.
  const sharers = editId ? snap.methods.filter((m) => m.limitSharedWith === editId && !m.archived) : []
  const [confirm, setConfirm] = useState(false)

  if (!sources.length) {
    return (
      <>
        <h2>{t('mTitle')}</h2>
        <p className="lead">{t('needSource')}</p>
        <button className="btn primary big" onClick={() => ui.push(<SourceSheet spaceId={spaceId} onSaved={setSourceId} />)}>{t('srcTitle')}</button>
      </>
    )
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const dayOptions = days.map((d) => ({ value: String(d), label: d === 31 ? t('lastDay') : t('ofMonth', { d: ordinal(d) }) }))
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
    if (editId) return void submit('save', (r) => r.updateMethod(editId, method), t('saved'), { close: true })
    void submit('save', (r) => r.addMethod(method), t('added', { x: n }), { close: true }).then((r) => r?.ok && onSaved?.(r.value))
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
            <Select id="m-kind" value={kind} onChange={(v) => setKind(v as MethodKind)} options={[
              { value: 'credit', label: t('creditCard') }, { value: 'debit', label: t('debitCard') },
              { value: 'emoney', label: t('emoney') }, { value: 'cash', label: t('cash') },
            ]} />
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="m-src">{t('paidFrom')}</label>
          <Select id="m-src" value={sourceId} onChange={setSourceId} options={sources.map((s) => ({ value: s.id, label: s.name }))}
            onNew={() => ui.push(<SourceSheet spaceId={spaceId} onSaved={setSourceId} />)} newLabel={t('addSource')} />
        </div>
      </div>
      {kind === 'credit' && (
        <div className="stack">
          {owners.length > 0 && !sharers.length && (
            <div className="field">
              <label className="label" htmlFor="m-share">{t('limitLabel')}</label>
              <Select id="m-share" value={sharedWith} onChange={setSharedWith}
                options={[{ value: '', label: t('ownLimit') }, ...owners.map((m) => ({ value: m.id, label: t('shareLimit', { x: m.name }) }))]} />
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
              <Select id="m-close" value={String(close)} onChange={(v) => setClose(+v)} options={dayOptions} />
            </div>
            <div className="field">
              <label className="label" htmlFor="m-pay">{t('payDue')}</label>
              <Select id="m-pay" value={String(pay)} onChange={(v) => setPay(+v)} options={dayOptions} />
            </div>
          </div>
          <p className="tiny muted" style={{ margin: 0 }}>{t('dueHint')}</p>
        </div>
      )}
      <button className="btn primary big" disabled={busy} aria-busy={pending === 'save'} onClick={save}>{editId ? t('save') : t('mTitle')}</button>
      {editId && (
        <div className="field">
          {/* a card others share a limit with stays until they no longer depend on it */}
          <button className="btn danger" disabled={sharers.length > 0 || busy} aria-busy={pending === 'delete'}
            onClick={() => {
              if (!confirm) return setConfirm(true)
              void submit('delete', (r) => r.setMethodArchived(editId, true), t('archived', { x: base!.name }), { close: true })
            }}>
            {confirm ? t('confirmDel') : t('deleteMethod')}
          </button>
          <span className="tiny muted">{sharers.length ? t('limitInUse', { x: sharers.map((m) => m.name).join(', ') }) : t('restoreHint')}</span>
        </div>
      )}
    </>
  )
}

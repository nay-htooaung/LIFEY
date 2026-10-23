import { useState } from 'react'
import type { SourceKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore, useSubmit } from '../data/store'
import { parseYen } from '../ui/bits'
import { Select } from '../ui/Select'

interface Props {
  /** Edit this source instead of adding one. */
  editId?: string
  /** Space for a new source (default: the current space). */
  spaceId?: string
  /** Called with the new source's id once added. */
  onSaved?: (id: string) => void
}

export function SourceSheet({ editId, spaceId, onSaved }: Props = {}) {
  const { snap, space: current } = useStore()
  const { submit, pending, busy } = useSubmit()
  const base = editId ? snap.sources.find((s) => s.id === editId) : undefined
  const space = snap.spaces.find((s) => s.id === (base?.spaceId ?? spaceId)) ?? current
  const { t } = useI18n()
  const [name, setName] = useState(base?.name ?? '')
  const [kind, setKind] = useState<SourceKind>(base?.kind ?? 'bank')
  const [bal, setBal] = useState(base ? String(base.openingBalance) : '')
  const [confirm, setConfirm] = useState(false)
  // the cash every personal space starts with: only its balance changes
  const fixed = !!base?.fixed
  // A source still paying for methods cannot go; those methods need it for their balances.
  const users = editId ? snap.methods.filter((m) => m.sourceId === editId && !m.archived) : []

  const save = () => {
    const n = name.trim()
    if (!n) return document.getElementById('src-name')?.focus()
    const source = { spaceId: space.id, name: n, kind, openingBalance: parseYen(bal) }
    if (editId) return void submit('save', (r) => r.updateSource(editId, source), t('saved'), { close: true })
    void submit('save', (r) => r.addSource(source), t('added', { x: n }), { close: true }).then((r) => r?.ok && onSaved?.(r.value))
  }
  const remove = () => {
    if (!confirm) return setConfirm(true)
    void submit('delete', (r) => r.setSourceArchived(editId!, true), t('archived', { x: base!.name }), { close: true })
  }

  return (
    <>
      <h2>{editId ? t('editSource') : t('srcTitle')}</h2>
      <p className="lead">{t('srcSub', { s: space.name })}</p>
      <div className="field">
        <label className="label" htmlFor="src-name">{t('name')}</label>
        <input id="src-name" value={name} disabled={fixed} maxLength={60} placeholder={t('srcPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="two">
        <div className="field">
          <label className="label" htmlFor="src-kind">{t('type')}</label>
          <Select id="src-kind" value={kind} disabled={fixed} onChange={(v) => setKind(v as SourceKind)}
            options={(['cash', 'bank', 'emoney'] as const).map((k) => ({ value: k, label: t(k) }))} />
        </div>
        <div className="field">
          <label className="label" htmlFor="src-bal">{editId ? t('openingBalance') : t('balance')}</label>
          <input id="src-bal" inputMode="numeric" value={bal} placeholder="¥0" onChange={(e) => setBal(e.target.value)} />
        </div>
      </div>
      {fixed && <p className="tiny muted" style={{ margin: 0 }}>{t('cashFixed')}</p>}
      <button className="btn primary big" disabled={busy} aria-busy={pending === 'save'} onClick={save}>{editId ? t('save') : t('srcTitle')}</button>
      {editId && !fixed && (
        <div className="field">
          <button className="btn danger" disabled={users.length > 0 || busy} aria-busy={pending === 'delete'} onClick={remove}>{confirm ? t('confirmDel') : t('deleteSource')}</button>
          <span className="tiny muted">
            {users.length ? t('sourceInUse', { x: users.map((m) => m.name).join(', ') }) : t('restoreHint')}
          </span>
        </div>
      )}
    </>
  )
}

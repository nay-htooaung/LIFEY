import { useState } from 'react'
import type { SourceKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { parseYen } from '../ui/bits'
import { useUI } from '../ui/ui'
import { Select } from '../ui/Select'

/** Adds a source to `spaceId` (default: the current space) and reports its id through `onSaved`. */
export function SourceSheet({ spaceId, onSaved }: { spaceId?: string; onSaved?: (id: string) => void } = {}) {
  const { snap, space: current, act } = useStore()
  const space = snap.spaces.find((s) => s.id === spaceId) ?? current
  const ui = useUI()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<SourceKind>('bank')
  const [bal, setBal] = useState('')

  const save = () => {
    const n = name.trim()
    if (!n) return document.getElementById('src-name')?.focus()
    ui.close()
    void act((r) => r.addSource({ spaceId: space.id, name: n, kind, openingBalance: parseYen(bal) }), t('added', { x: n }))
      .then((id) => id && onSaved?.(id))
  }

  return (
    <>
      <h2>{t('srcTitle')}</h2>
      <p className="lead">{t('srcSub', { s: space.name })}</p>
      <div className="field">
        <label className="label" htmlFor="src-name">{t('name')}</label>
        <input id="src-name" value={name} maxLength={60} placeholder={t('srcPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="two">
        <div className="field">
          <label className="label" htmlFor="src-kind">{t('type')}</label>
          <Select id="src-kind" value={kind} onChange={(v) => setKind(v as SourceKind)}
            options={(['bank', 'savings', 'cash'] as const).map((k) => ({ value: k, label: t(k) }))} />
        </div>
        <div className="field">
          <label className="label" htmlFor="src-bal">{t('balance')}</label>
          <input id="src-bal" inputMode="numeric" value={bal} placeholder="¥0" onChange={(e) => setBal(e.target.value)} />
        </div>
      </div>
      <button className="btn primary big" onClick={save}>{t('srcTitle')}</button>
    </>
  )
}

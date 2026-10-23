import { useState } from 'react'
import type { SourceKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { parseYen } from '../ui/bits'
import { useUI } from '../ui/ui'

export function SourceSheet() {
  const { space, act } = useStore()
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
          <select id="src-kind" value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
            <option value="bank">{t('bank')}</option>
            <option value="savings">{t('savings')}</option>
            <option value="cash">{t('cash')}</option>
          </select>
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

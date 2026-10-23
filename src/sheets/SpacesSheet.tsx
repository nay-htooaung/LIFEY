import { useState } from 'react'
import type { Tone } from '../domain/types'
import { useI18n } from '../i18n'
import { toneVar, usePersonName, useStore, useSubmit } from '../data/store'
import { Avatar, SpaceDot } from '../ui/bits'
import { IconEdit } from '../ui/icons'
import { useUI } from '../ui/ui'
import { SpaceSheet } from './SpaceSheet'

const TONES: Tone[] = ['a', 'b', 'c', 'd']

/** Pick a space, open a shared space's settings, create or join one. */
export function SpacesSheet() {
  const { snap, space, setSpace } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const person = usePersonName()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  const pick = (id: string) => {
    setSpace(id)
    ui.close()
  }
  const create = async () => {
    const n = name.trim()
    if (!n) return document.getElementById('hh-name')?.focus()
    const tone = TONES[(snap.spaces.length - 1) % TONES.length]
    const r = await submit('create', (repo) => repo.createHousehold(n, tone), t('hhCreated', { x: n }), { close: true })
    if (r?.ok) setSpace(r.value)
  }
  const join = async () => {
    const c = code.trim()
    if (!c) return document.getElementById('hh-code')?.focus()
    const r = await submit('join', (repo) => repo.joinHousehold(c), t('joined', { x: c.toUpperCase() }), { close: true })
    if (r?.ok) setSpace(r.value)
  }

  return (
    <>
      <h2>{t('spacesTitle')}</h2>
      {snap.spaces.map((s) => (
        <div key={s.id} className="sp-item" style={{ ['--acc' as string]: toneVar(s) }}>
          <button className="sp-row" aria-pressed={space.id === s.id} onClick={() => pick(s.id)}>
            <SpaceDot name={s.name} tone={s.tone} large />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{s.name}</b><br />
              <span className="tiny muted">{s.kind === 'personal' ? t('onlyYouSp') : t('members', { n: s.memberIds.length })}</span>
            </span>
            {s.kind === 'household' && (
              <span className="avatars">{s.memberIds.map((id) => <Avatar key={id} profile={snap.profiles[id]} label={person(id)} />)}</span>
            )}
          </button>
          {s.kind === 'household' && (
            <button className="icon-btn" aria-label={t('spaceSettings', { x: s.name })} onClick={() => ui.push(<SpaceSheet id={s.id} />, toneVar(s))}>
              <IconEdit />
            </button>
          )}
        </div>
      ))}

      <div className="field">
        <label className="label" htmlFor="hh-name">{t('hhName')}</label>
        <div className="btn-row">
          <input id="hh-name" className="input" value={name} maxLength={60} placeholder={t('hhPh')} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary" style={{ flex: 'none' }} disabled={busy} aria-busy={pending === 'create'} onClick={create}>{t('createBtn')}</button>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="hh-code">{t('joinTitle')}</label>
        <div className="btn-row">
          <input id="hh-code" className="input num" value={code} placeholder={t('joinPh')} autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} disabled={busy} aria-busy={pending === 'join'} onClick={join}>{t('joinBtn')}</button>
        </div>
      </div>

    </>
  )
}

import { useState } from 'react'
import type { Tone } from '../domain/types'
import { useI18n } from '../i18n'
import { toneVar, usePersonName, useStore } from '../data/store'
import { Avatar, SpaceDot } from '../ui/bits'
import { useUI } from '../ui/ui'

const TONES: Tone[] = ['a', 'b', 'c', 'd']

export function SpacesSheet() {
  const { snap, space, setSpace, act } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const person = usePersonName()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [confirmLeave, setConfirmLeave] = useState(false)

  const pick = (id: string) => {
    setSpace(id)
    ui.close()
  }
  const create = async () => {
    const n = name.trim()
    if (!n) return document.getElementById('hh-name')?.focus()
    const tone = TONES[(snap.spaces.length - 1) % TONES.length]
    ui.close()
    const id = await act((r) => r.createHousehold(n, tone), t('hhCreated', { x: n }))
    if (id) setSpace(id)
  }
  const join = async () => {
    const c = code.trim()
    if (!c) return document.getElementById('hh-code')?.focus()
    const id = await act((r) => r.joinHousehold(c))
    if (id) {
      setSpace(id)
      ui.close()
      ui.toast(t('joined', { x: c.toUpperCase() }))
    }
  }
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      ui.toast(t('copied'))
    } catch {
      /* the code is selectable as a fallback */
    }
  }

  return (
    <>
      <h2>{t('spacesTitle')}</h2>
      <p className="lead">{t('spacesSub')}</p>
      {snap.spaces.map((s) => (
        <button key={s.id} className="sp-row" aria-pressed={space.id === s.id} style={{ ['--acc' as string]: toneVar(s) }} onClick={() => pick(s.id)}>
          <SpaceDot name={s.name} tone={s.tone} large />
          <span style={{ flex: 1, minWidth: 0 }}>
            <b>{s.name}</b><br />
            <span className="tiny muted">{s.kind === 'personal' ? t('onlyYouSp') : t('members', { n: s.memberIds.length })}</span>
          </span>
          {s.kind === 'household' && (
            <span className="avatars">{s.memberIds.map((id) => <Avatar key={id} profile={snap.profiles[id]} label={person(id)} />)}</span>
          )}
        </button>
      ))}

      {space.kind === 'household' && space.inviteCode && (
        <div className="field">
          <span className="label">{t('inviteCode')} · {space.name}</span>
          <div className="code-box">
            <span className="num">{space.inviteCode}</span>
            <button className="link" onClick={() => copy(space.inviteCode!)}>{t('copy')}</button>
          </div>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="hh-name">{t('hhName')}</label>
        <div className="btn-row">
          <input id="hh-name" className="input" value={name} maxLength={60} placeholder={t('hhPh')} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary" style={{ flex: 'none' }} onClick={create}>{t('createBtn')}</button>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="hh-code">{t('joinTitle')}</label>
        <div className="btn-row">
          <input id="hh-code" className="input num" value={code} placeholder={t('joinPh')} autoCapitalize="characters" onChange={(e) => setCode(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} onClick={join}>{t('joinBtn')}</button>
        </div>
      </div>

      {space.kind === 'household' && (
        <button
          className="btn danger"
          onClick={async () => {
            if (!confirmLeave) return setConfirmLeave(true)
            const left = space
            ui.close()
            await act((r) => r.leaveHousehold(left.id), t('left', { x: left.name }))
            setSpace(snap.spaces.find((s) => s.kind === 'personal')!.id)
          }}
        >
          {confirmLeave ? t('confirmLeave') : `${t('leave')} · ${space.name}`}
        </button>
      )}
    </>
  )
}

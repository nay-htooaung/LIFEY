import { useState } from 'react'
import type { Tone } from '../domain/types'
import { useI18n } from '../i18n'
import { toneVar, useStore, useSubmit } from '../data/store'
import { SpaceDot, TONES, TonePicker } from '../ui/bits'
import { useUI } from '../ui/ui'

/** Create a shared space: its name and colour. Opened from the spaces sheet; switches to the new space. */
export function CreateSpaceSheet() {
  const { snap, setSpace } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const [name, setName] = useState('')
  // a colour no other space uses yet, if there is one
  const [tone, setTone] = useState<Tone>(TONES.find((x) => x !== 'me' && !snap.spaces.some((s) => s.tone === x)) ?? 'a')

  const create = async () => {
    const n = name.trim()
    if (!n) return document.getElementById('hh-name')?.focus()
    const r = await submit('create', (repo) => repo.createHousehold(n, tone), t('hhCreated', { x: n }), { close: true })
    if (r?.ok) {
      ui.close()
      setSpace(r.value)
    }
  }

  return (
    // previews the colour picked
    <div style={{ display: 'contents', ['--acc' as string]: toneVar({ tone }) }}>
      <div className="me-head">
        <SpaceDot name={name.trim() || '?'} tone={tone} large />
        <h2>{t('hhName')}</h2>
      </div>
      <div className="field">
        <label className="label" htmlFor="hh-name">{t('name')}</label>
        <input id="hh-name" className="input" value={name} maxLength={60} placeholder={t('hhPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">{t('colour')}</span>
        <TonePicker value={tone} onChange={setTone} label={t('colour')} />
      </div>
      <button className="btn primary big" disabled={busy} aria-busy={pending === 'create'} onClick={create}>{t('createBtn')}</button>
    </div>
  )
}

/** Join a shared space with its invite code. Opened from the spaces sheet; switches to the space joined. */
export function JoinSpaceSheet() {
  const { setSpace } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const [code, setCode] = useState('')

  const join = async () => {
    const c = code.trim()
    if (!c) return document.getElementById('hh-code')?.focus()
    const r = await submit('join', (repo) => repo.joinHousehold(c), t('joined', { x: c.toUpperCase() }), { close: true })
    if (r?.ok) {
      ui.close()
      setSpace(r.value)
    }
  }

  return (
    <>
      <h2>{t('joinTitle')}</h2>
      <div className="field">
        <label className="label" htmlFor="hh-code">{t('inviteCode')}</label>
        <input id="hh-code" className="input num" value={code} placeholder={t('joinPh')} autoCapitalize="characters" autoComplete="off"
          spellCheck={false} onChange={(e) => setCode(e.target.value)} />
      </div>
      <button className="btn primary big" disabled={busy} aria-busy={pending === 'join'} onClick={join}>{t('joinBtn')}</button>
    </>
  )
}

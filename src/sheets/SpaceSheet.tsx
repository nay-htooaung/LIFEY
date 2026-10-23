import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { usePersonName, useStore, useSubmit } from '../data/store'
import { Avatar, SpaceDot } from '../ui/bits'
import { useUI } from '../ui/ui'

/**
 * One shared space: name, members, invite code, and leaving (members) or deleting (owner).
 * Nothing here erases data: leaving, removal and deletion can all be undone by rejoining or restoring.
 */
export function SpaceSheet({ id }: { id: string }) {
  const { snap, space: current, personal, setSpace } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const person = usePersonName()
  // keep showing the space while leaving or deleting it, until the sheet closes
  const last = useRef(snap.spaces.find((s) => s.id === id))
  const sp = snap.spaces.find((s) => s.id === id) ?? last.current
  last.current = sp
  const [name, setName] = useState(sp?.name ?? '')
  const [confirm, setConfirm] = useState<string | null>(null)
  if (!sp) return null

  const owner = sp.ownerId === snap.me.id
  // two taps for anything that takes access away
  const twice = (key: string, run: () => void) => (confirm === key ? run() : setConfirm(key))
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      ui.toast(t('copied'))
    } catch {
      /* the code is selectable as a fallback */
    }
  }
  // leaving or deleting: once done, close and move off the space if it was the one on screen
  const goneFromHere = async (key: string, fn: Parameters<typeof submit>[1], done: string) => {
    const r = await submit(key, fn, done, { close: true })
    if (r?.ok && current.id === sp.id) setSpace(personal.id)
  }

  return (
    <>
      <div className="me-head">
        <SpaceDot name={sp.name} tone={sp.tone} large />
        <h2>{sp.name}</h2>
      </div>

      <div className="field">
        <label className="label" htmlFor="sp-name">{t('name')}</label>
        <div className="btn-row">
          <input id="sp-name" className="input" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} disabled={!name.trim() || name.trim() === sp.name || busy} aria-busy={pending === 'rename'}
            onClick={() => submit('rename', (r) => r.renameSpace(sp.id, name.trim()), t('saved'))}>{t('save')}</button>
        </div>
      </div>

      <div className="field">
        <span className="label">{t('membersTitle')}</span>
        <div className="card list">
          {sp.memberIds.map((m) => (
            <div key={m} className="row">
              <Avatar profile={snap.profiles[m]} label={person(m)} />
              <div className="main"><div className="t">{person(m)}</div></div>
              {m === sp.ownerId && <span className="pill">{t('owner')}</span>}
              {owner && m !== snap.me.id && (
                <button className="btn sm danger" disabled={busy} aria-busy={pending === `rm:${m}`}
                  onClick={() => twice(`rm:${m}`, () => void submit(`rm:${m}`, (r) => r.removeMember(sp.id, m), t('removed', { x: person(m) })))}>
                  {confirm === `rm:${m}` ? t('confirmRemove') : t('remove')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {sp.inviteCode && (
        <div className="field">
          <span className="label">{t('inviteCode')}</span>
          <div className="code-box">
            <span className="num">{sp.inviteCode}</span>
            <button className="link" onClick={() => copy(sp.inviteCode!)}>{t('copy')}</button>
          </div>
          {owner && (
            <span className="tiny muted">
              <button className="link" disabled={busy} aria-busy={pending === 'code'} onClick={() => submit('code', (r) => r.resetInviteCode(sp.id), t('codeReset'))}>{t('newCode')}</button>
              {' · '}{t('newCodeHint')}
            </span>
          )}
        </div>
      )}

      <div className="field">
        {owner ? (
          <button className="btn danger" disabled={busy} aria-busy={pending === 'delete'}
            onClick={() => twice('delete', () => void goneFromHere('delete', (r) => r.setSpaceDeleted(sp.id, true), t('spaceDeleted', { x: sp.name })))}>
            {confirm === 'delete' ? t('confirmDel') : t('deleteSpace')}
          </button>
        ) : (
          <button className="btn danger" disabled={busy} aria-busy={pending === 'leave'}
            onClick={() => twice('leave', () => void goneFromHere('leave', (r) => r.leaveHousehold(sp.id), t('left', { x: sp.name })))}>
            {confirm === 'leave' ? t('confirmLeave') : t('leave')}
          </button>
        )}
        <span className="tiny muted">{owner ? t('deleteHint') : t('leaveHint')}</span>
      </div>
    </>
  )
}

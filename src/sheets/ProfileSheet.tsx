import { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore, useSubmit } from '../data/store'
import { Avatar } from '../ui/bits'
import { IconEdit } from '../ui/icons'
import { CharacterSheet } from './CharacterSheet'
import { DeletedSheet, deletedCount } from './DeletedSheet'
import { InstallCard } from '../ui/InstallCard'
import { ThemePicker } from '../ui/ThemePicker'
import { useUI } from '../ui/ui'

/** You: character, name, language, theme, deleted things, installing the app, signing out. Opened from the avatar in the top bar. */
export function ProfileSheet({ onSignOut, onResetDemo }: { onSignOut?: () => Promise<void>; onResetDemo?: () => void }) {
  const { snap, repo, setPrefs } = useStore()
  const { submit, pending, busy } = useSubmit()
  const [signingOut, setSigningOut] = useState(false)
  const ui = useUI()
  const { t, locale } = useI18n()
  const [name, setName] = useState(snap.me.displayName)
  const deleted = deletedCount(snap)

  return (
    <>
      <div className="me-head">
        <button className="me-char" aria-label={t('character')} onClick={() => ui.push(<CharacterSheet />)}>
          <Avatar profile={snap.me} />
          <span className="badge"><IconEdit /></span>
        </button>
        <h2>{snap.me.displayName || t('me')}</h2>
      </div>
      <div className="field">
        <label className="label" htmlFor="me-name">{t('yourName')}</label>
        <div className="btn-row">
          <input id="me-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} disabled={!name.trim() || name === snap.me.displayName || busy} aria-busy={pending === 'name'}
            onClick={() => submit('name', (r) => r.updateProfile({ displayName: name.trim() }), t('saved'))}>{t('save')}</button>
        </div>
      </div>
      <div className="field">
        <span className="label">{t('language')}</span>
        <div className="seg">
          <button aria-pressed={locale === 'en'} onClick={() => setPrefs({ locale: 'en' })}>English</button>
          <button aria-pressed={locale === 'ja'} onClick={() => setPrefs({ locale: 'ja' })}>日本語</button>
        </div>
      </div>
      <div className="field">
        <span className="label">{t('theme')}</span>
        <ThemePicker value={snap.me.theme} onChange={(theme) => setPrefs({ theme })} />
      </div>
      {deleted > 0 && (
        <button className="btn" onClick={() => ui.push(<DeletedSheet />)}>{t('deletedItems')} ({deleted})</button>
      )}
      <InstallCard />
      {repo.mode === 'demo' && <p className="privacy">{t('demoMode')}</p>}
      <div className="btn-row">
        {onResetDemo && <button className="btn" onClick={() => { ui.close(); onResetDemo() }}>{t('resetDemo')}</button>}
        {/* the sign-in screen replaces everything once signed out; until then the button shows it is working */}
        {onSignOut && (
          <button className="btn" disabled={signingOut} aria-busy={signingOut} onClick={() => { setSigningOut(true); void onSignOut() }}>{t('signOut')}</button>
        )}
      </div>
    </>
  )
}

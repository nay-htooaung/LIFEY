import { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { Avatar } from '../ui/bits'
import { InstallCard } from '../ui/InstallCard'
import { useUI } from '../ui/ui'

/** You: name, language, installing the app, signing out. Opened from the avatar in the top bar. */
export function ProfileSheet({ onSignOut, onResetDemo }: { onSignOut?: () => void; onResetDemo?: () => void }) {
  const { snap, repo, act, setLocale } = useStore()
  const ui = useUI()
  const { t, locale } = useI18n()
  const [name, setName] = useState(snap.me.displayName)

  return (
    <>
      <div className="me-head">
        <Avatar profile={snap.me} />
        <h2>{snap.me.displayName || t('me')}</h2>
      </div>
      <div className="field">
        <label className="label" htmlFor="me-name">{t('yourName')}</label>
        <div className="btn-row">
          <input id="me-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} disabled={!name.trim() || name === snap.me.displayName}
            onClick={() => act((r) => r.updateProfile({ displayName: name.trim() }), t('saved'))}>{t('save')}</button>
        </div>
      </div>
      <div className="field">
        <span className="label">{t('language')}</span>
        <div className="seg">
          <button aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
          <button aria-pressed={locale === 'ja'} onClick={() => setLocale('ja')}>日本語</button>
        </div>
      </div>
      <InstallCard />
      {repo.mode === 'demo' && <p className="privacy">{t('demoMode')}</p>}
      <div className="btn-row">
        {onResetDemo && <button className="btn" onClick={() => { ui.close(); onResetDemo() }}>{t('resetDemo')}</button>}
        {onSignOut && <button className="btn" onClick={() => { ui.close(); onSignOut() }}>{t('signOut')}</button>}
      </div>
    </>
  )
}

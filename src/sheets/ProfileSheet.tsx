import { useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { AVATARS, Avatar, THEMES } from '../ui/bits'
import { InstallCard } from '../ui/InstallCard'
import { useUI } from '../ui/ui'

/** You: character, name, language, theme, installing the app, signing out. Opened from the avatar in the top bar. */
export function ProfileSheet({ onSignOut, onResetDemo }: { onSignOut?: () => void; onResetDemo?: () => void }) {
  const { snap, repo, act, setPrefs } = useStore()
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
          <button aria-pressed={locale === 'en'} onClick={() => setPrefs({ locale: 'en' })}>English</button>
          <button aria-pressed={locale === 'ja'} onClick={() => setPrefs({ locale: 'ja' })}>日本語</button>
        </div>
      </div>
      <div className="field">
        <span className="label">{t('theme')}</span>
        <div className="themes">
          {THEMES.map((th) => (
            <button key={th} aria-pressed={snap.me.theme === th} onClick={() => setPrefs({ theme: th })}>
              {/* a tiny preview drawn with that theme's own tokens */}
              <span className="theme-sw" data-skin={th}><i /><i /></span>
              {t(`theme_${th}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">{t('character')}</span>
        <div className="chars">
          <button aria-pressed={!snap.me.avatar} aria-label={t('initialOnly')} onClick={() => setPrefs({ avatar: null })}>
            {[...(snap.me.displayName || t('me'))][0]?.toUpperCase()}
          </button>
          {AVATARS.map((a) => (
            <button key={a} aria-pressed={snap.me.avatar === a} onClick={() => setPrefs({ avatar: a })}>{a}</button>
          ))}
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

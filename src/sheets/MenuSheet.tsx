import { useState } from 'react'
import type { Locale } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { useUI } from '../ui/ui'

export const LOCALE_KEY = 'lifey-locale'

export function MenuSheet({ onSignOut, onResetDemo }: { onSignOut?: () => void; onResetDemo?: () => void }) {
  const { snap, repo, act } = useStore()
  const ui = useUI()
  const { t, locale } = useI18n()
  const [name, setName] = useState(snap.me.displayName)

  const setLocale = (l: Locale) => {
    try {
      localStorage.setItem(LOCALE_KEY, l)
    } catch {
      /* ignore */
    }
    void act((r) => r.updateProfile({ locale: l }))
  }

  return (
    <>
      <h2>lifey</h2>
      <p className="lead">{t('modsSub')}</p>
      <div className="mods">
        <button className="mod on" onClick={ui.close}><b>{t('money')}</b><small>{t('mMoney')}</small><span className="pill">{t('openL')}</span></button>
        <div className="mod"><b>{t('recipes')}</b><small>{t('mRecipes')}</small><span className="pill mute">{t('later')}</span></div>
        <div className="mod"><b>{t('fridge')}</b><small>{t('mFridge')}</small><span className="pill mute">{t('later')}</span></div>
        <div className="mod"><b>{t('tasks')}</b><small>{t('mTasks')}</small><span className="pill mute">{t('later')}</span></div>
      </div>
      <div className="field">
        <span className="label">{t('language')}</span>
        <div className="seg">
          <button aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
          <button aria-pressed={locale === 'ja'} onClick={() => setLocale('ja')}>日本語</button>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="me-name">{t('yourName')}</label>
        <div className="btn-row">
          <input id="me-name" className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button className="btn" style={{ flex: 'none' }} disabled={!name.trim() || name === snap.me.displayName}
            onClick={() => act((r) => r.updateProfile({ displayName: name.trim() }), t('saved'))}>{t('save')}</button>
        </div>
      </div>
      {repo.mode === 'demo' ? (
        <>
          <p className="privacy">{t('demoMode')}</p>
          <div className="btn-row">
            {onResetDemo && <button className="btn" onClick={() => { ui.close(); onResetDemo() }}>{t('resetDemo')}</button>}
            {onSignOut && <button className="btn" onClick={() => { ui.close(); onSignOut() }}>{t('signOut')}</button>}
          </div>
        </>
      ) : (
        onSignOut && <button className="btn" onClick={() => { ui.close(); onSignOut() }}>{t('signOut')}</button>
      )}
      <p className="tiny muted" style={{ margin: 0 }}>{t('installHint')}</p>
    </>
  )
}

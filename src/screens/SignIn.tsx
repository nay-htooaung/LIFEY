import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applyTheme, currentTheme } from '../data/store'
import type { Locale, Theme } from '../domain/types'
import { I18nContext, makeI18n } from '../i18n'
import { ThemePicker } from '../ui/ThemePicker'

/** Email + password: no emails are sent, so it works without a custom SMTP server and inside the installed app. */
export function SignIn({ sb, locale, setLocale, onTheme }: { sb: SupabaseClient; locale: Locale; setLocale(l: Locale): void; onTheme(theme: Theme): void }) {
  const i18n = makeI18n(locale)
  const { t } = i18n
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const pickTheme = (th: Theme) => {
    setTheme(th)
    applyTheme(th)
    onTheme(th)
  }
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    const res = mode === 'signin'
      ? await sb.auth.signInWithPassword({ email: email.trim(), password })
      : await sb.auth.signUp({ email: email.trim(), password, options: { data: { locale, theme, invite_code: invite.trim() } } })
    setBusy(false)
    if (res.error) {
      // the database refuses the new user when the invitation code is missing, wrong, expired or used
      const badInvite = mode === 'signup' && /invalid invitation code|database error saving new user/i.test(res.error.message)
      setError(res.error.code === 'invalid_credentials' ? t('badLogin') : badInvite ? t('badInvite') : t('genericError', { m: res.error.message }))
    } else if (mode === 'signup' && !res.data.session) {
      // the project still requires email confirmation
      setInfo(t('confirmEmail', { e: email.trim() }))
    }
  }

  return (
    <I18nContext.Provider value={i18n}>
      <div className="signin">
        <div className="wordmark">life<i>y</i></div>
        <h1>{t('signInTitle')}</h1>
        <div className="seg" role="group">
          <button type="button" aria-pressed={mode === 'signin'} onClick={() => setMode('signin')}>{t('signInTab')}</button>
          <button type="button" aria-pressed={mode === 'signup'} onClick={() => setMode('signup')}>{t('signUpTab')}</button>
        </div>
        <form className="stack" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field">
              <label className="label" htmlFor="si-invite">{t('signupCode')}</label>
              <input id="si-invite" className="num" required autoComplete="off" autoCapitalize="characters" spellCheck={false}
                placeholder="INV-XXXXX-XXXXX" value={invite} onChange={(e) => setInvite(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="si-email">{t('email')}</label>
            <input id="si-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="si-password">{t('password')}</label>
            <input id="si-password" type="password" required minLength={8}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === 'signup' && <span className="tiny muted">{t('passwordHint')}</span>}
          </div>
          <button className="btn primary big" disabled={busy} aria-busy={busy}>{mode === 'signin' ? t('signInTab') : t('signUpTab')}</button>
        </form>
        {error && <p className="small" style={{ color: 'var(--neg)', margin: 0 }} role="alert">{error}</p>}
        {info && <p className="small muted" style={{ margin: 0 }} role="status">{info}</p>}
        {/* how the app looks and reads, before there is an account to save it to */}
        <div className="signin-prefs">
          <div className="field">
            <span className="label">{t('language')}</span>
            <div className="seg" role="group" aria-label={t('language')}>
              <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
              <button type="button" aria-pressed={locale === 'ja'} onClick={() => setLocale('ja')}>日本語</button>
            </div>
          </div>
          <div className="field">
            <span className="label">{t('theme')}</span>
            <ThemePicker value={theme} onChange={pickTheme} />
          </div>
        </div>
      </div>
    </I18nContext.Provider>
  )
}

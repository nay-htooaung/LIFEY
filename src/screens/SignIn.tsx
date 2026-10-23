import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Locale } from '../domain/types'
import { makeI18n } from '../i18n'

/**
 * Email one-time code instead of a magic link: on iPhone a link opens in Safari, not in the installed app,
 * so the session would land in the wrong place.
 */
export function SignIn({ sb, locale, setLocale, onDemo }: { sb: SupabaseClient; locale: Locale; setLocale(l: Locale): void; onDemo(): void }) {
  const { t } = makeI18n(locale)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, data: { locale } } })
    setBusy(false)
    if (error) setError(t('genericError', { m: error.message }))
    else setSent(true)
  }
  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError(t('genericError', { m: error.message }))
  }

  return (
    <div className="signin">
      <div className="wordmark">life<i>y</i></div>
      <h1>{t('signInTitle')}</h1>
      <p className="muted" style={{ margin: 0 }}>{t('signInBody')}</p>
      {!sent ? (
        <form className="stack" onSubmit={send}>
          <div className="field">
            <label className="label" htmlFor="si-email">{t('email')}</label>
            <input id="si-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn primary big" disabled={busy}>{t('sendCode')}</button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify}>
          <p className="small muted" style={{ margin: 0 }}>{t('codeSent', { e: email })}</p>
          <div className="field">
            <label className="label" htmlFor="si-code">{t('code')}</label>
            <input id="si-code" className="num" inputMode="numeric" autoComplete="one-time-code" required maxLength={10}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 22, letterSpacing: '0.2em' }} />
          </div>
          <button className="btn primary big" disabled={busy}>{t('verify')}</button>
          <button type="button" className="link" onClick={() => { setSent(false); setCode('') }}>{t('changeEmail')}</button>
        </form>
      )}
      {error && <p className="small" style={{ color: 'var(--neg)', margin: 0 }} role="alert">{error}</p>}
      <div className="seg">
        <button type="button" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
        <button type="button" aria-pressed={locale === 'ja'} onClick={() => setLocale('ja')}>日本語</button>
      </div>
      <button type="button" className="btn" onClick={onDemo}>{t('tryDemo')}</button>
    </div>
  )
}

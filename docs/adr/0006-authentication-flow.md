---
title: Authentication Flow — Magic Link Primary
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0006: Authentication Flow — Magic Link Primary

## Context

The SPA needs an authentication flow for users to sign up, log in, and manage their session. Supabase GoTrue handles the backend (it's already running locally per ADR-0005). What remains is choosing the **primary sign-in method**.

Key constraints:
- The app targets **household users** — couples, flatmates, families. Many are **non-technical**. A password they use once every few days will be forgotten.
- The app is a **PWA** — users install it to their home screen, not through an app store. No platform auth (Apple Sign-In, Google Sign-In) is available via native SDKs.
- Q3 MVP needs to get users in the door with minimal friction. Every extra field in the sign-up form reduces completion rate.
- Must support **multiple profiles per email** (one person in several households under the same account — already designed in the data model).

## Options

### Option A: Magic link (passwordless email) — primary
User enters email → Supabase sends a one-time link → clicking it logs them in. No password ever.

### Option B: Email + password — traditional
User enters email + creates a password during sign-up. Logs in with email + password on return. Standard "remember me" via session token.

### Option C: OAuth-only (Google, Apple, GitHub)
User clicks "Sign in with Google" (or Apple/GitHub). Supabase handles the OAuth flow.

### Option D: Combo — magic link primary, OAuth secondary
Magic link is the default option on the login screen. An "Or sign in with Google" button is below it. No passwords.

## Evaluation

| Criteria | A — Magic link | B — Email+password | C — OAuth only | D — Magic link + OAuth |
|----------|:---:|:---:|:---:|:---:|
| **Sign-up friction** | ✅ Low — just email | ⚠️ Medium — email + password + confirm | ✅ Low — one tap | ✅ Low — either method |
| **Return friction** | ✅ Low — enter email, open link | ⚠️ Medium — type password (likely forgotten) | ✅ Very low — one tap | ✅ Same as A or C |
| **Password management** | ✅ None | ❌ Users forget → password reset flow | ✅ None | ✅ None |
| **Offline compatibility** | ✅ Session persists once logged in | ✅ Same | ✅ Same | ✅ Same |
| **Implementation effort** | ✅ Low — Supabase built-in | ✅ Low — Supabase built-in | ⚠️ Medium — OAuth provider config + redirect URIs | ⚠️ Medium — two flows to maintain |
| **Multiple profiles per email** | ✅ Works — magic link authenticates the email, app shows profile picker | ✅ Same | ⚠️ OAuth email may differ from profile email | ✅ Same as A |
| **PWA fit** | ✅ Link opens in browser → redirects to installed PWA | ✅ Standard form works in PWA | ⚠️ OAuth redirect flows can be tricky in standalone PWA mode | ⚠️ OAuth in PWA is tricky |
| **Phishing resistance** | ⚠️ Link in email — user must trust their inbox | ✅ User knows their password | ✅ User knows their OAuth provider | ⚠️ Same as A |
| **Email delivery dependency** | ❌ Requires mail server (Supabase local uses Inbucket for dev) | ✅ No email needed for login | ✅ No email needed | ❌ Magic link path requires email |

## Decision

**Accepted: Option A — Magic link as the primary (and only Q3) authentication flow.**

Rationale:
1. **Reduces sign-up abandonment** — one field (email) vs two (email + password + confirm password). This is the most important factor for a new product trying to acquire its first users.
2. **Eliminates password reset** — the most common support request in consumer apps. A user who hasn't logged in for two weeks will have forgotten their password. With magic link, they just request a new one.
3. **Supabase handles it natively** — `supabase.auth.signInWithOtp({ email })` — minimal code, no extra infrastructure.
4. **Works with existing data model** — magic link authenticates the email, then the app presents a household/profile picker. Multiple profiles under one email works identically to password auth.

**OAuth is deferred to Q4** — the redirect-flow complexities with standalone PWA mode are well-documented (OAuth popups blocked, redirect URIs mismatched in `display: standalone`). When OAuth is added, it will be as a secondary option below the magic link field.

**Email + password is explicitly not chosen** — it adds friction without a compensating benefit for this product's use case.

## Consequences

### Positive
- One-field sign-up form — highest conversion
- No password reset flow to build or maintain
- Users can log in from any device just by checking their email
- Session persists in IndexedDB/localStorage — re-auth only on session expiry or logout

### Negative
- Requires email delivery — if Supabase's mail server is down, users can't log in. Mitigation: configure a custom SMTP (SendGrid, Resend) in Supabase project settings.
- Magic link flow: user enters email → checks inbox → clicks link → redirected back to app. This is ~10-15 seconds slower than a password autofill.
- Some users (especially older users) are unfamiliar with "magic link" — the UI must explain it clearly: "We'll email you a sign-in link. No password needed."

### Neutral
- Local dev: Supabase local includes Inbucket (`localhost:54324`) — a fake SMTP server that captures all emails. Click the link in Inbucket's UI to complete login during development.
- Session management: TanStack Query state is invalidated on logout → user sees fresh data on next login
- The login screen copy must be precise: "Enter your email and we'll send you a sign-in link" — not "Password" or "Sign up"

## Compliance

- The login page MUST have a single email input + submit button as the primary action
- The submit button text must be "Send sign-in link" (or equivalent action-oriented copy)
- On submit, show a confirmation screen: "Check your email. The link expires in 10 minutes."
- Magic link expiry must be set to 10 minutes (Supabase default, configurable)
- Session duration: use Supabase's default (7 days) — users should not need to re-authenticate weekly for a household app
- OAuth buttons ("Sign in with Google") must not appear until Q4 — no greyed-out buttons
- Inbucket URL (`http://localhost:54324`) must be documented in the project README for local development

## References

- Supabase GoTrue docs: https://supabase.com/docs/guides/auth/auth-email
- Magic link vs password usability studies: https://css-tricks.com/magic-links/
- PWA + OAuth redirect issues: https://web.dev/articles/oauth-signed-in-pwa

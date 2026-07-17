---
title: Authentication Flow — Password Primary
status: Accepted
date: 2026-07-14
supersedes: ADR-0006 (magic link variant, 2026-07-14)
deciders: [tech-lead]
---

# ADR-0006: Authentication Flow — Password Primary

## Context

The SPA needs an authentication flow for users to sign up, log in, and manage their session. Supabase GoTrue handles the backend (it's already running locally per ADR-0005). What remains is choosing the **primary sign-in method**.

Key constraints:
- The app is a **PWA** — users install it to their home screen, not through an app store.
- Q3 MVP needs to get users in the door with minimal friction.
- Must support **multiple profiles per email** (one person in several households under the same account — already designed in the data model).
- The app is **closed-access** — new users need an invite code to sign up.
- **New constraint discovered:** Magic links in a PWA open the device's **default browser**, not the installed app. On iOS, the PWA and Safari storage are partially isolated, meaning the session set by the browser callback may not be available in the PWA. This creates a poor UX where users have to manually switch contexts.

## Options

### Option A: Magic link (passwordless email) — original choice
User enters email → Supabase sends a one-time link → clicking it logs them in. No password ever.

### Option B: Email + password — traditional
User enters email + creates a password during sign-up. Logs in with email + password on return. Standard "remember me" via session token. Password reset via 6-digit code sent to email (entered directly in the PWA — no link).

### Option C: OAuth-only (Google, Apple, GitHub)
User clicks "Sign in with Google" (or Apple/GitHub). Supabase handles the OAuth flow.

### Option D: Combo — magic link primary, OAuth secondary
Magic link is the default option on the login screen. An "Or sign in with Google" button is below it. No passwords.

## Evaluation

| Criteria | A — Magic link | B — Email+password | C — OAuth only | D — Magic link + OAuth |
|----------|:---:|:---:|:---:|:---:|
| **Sign-up friction** | ✅ Low — just email | ⚠️ Medium — email + password + confirm | ✅ Low — one tap | ✅ Low — either method |
| **Return friction** | ⚠️ Check email, click link (slow) | ✅ Password autofill (fast) | ✅ Very low — one tap | ✅ Same as A or C |
| **Password management** | ✅ None | ⚠️ Users forget → code-based reset flow | ✅ None | ✅ None |
| **PWA fit** | ❌ Link opens browser, not installed app — storage isolation on iOS | ✅ Everything in-PWA — no link clicking | ⚠️ OAuth redirect flows are tricky in standalone PWA mode | ❌ Magic link path has same PWA issue |
| **Offline compatibility** | ✅ Session persists once logged in | ✅ Session persists once logged in | ✅ Session persists once logged in | ✅ Same |
| **Implementation effort** | ✅ Low — `signInWithOtp` | ✅ Low — `signInWithPassword` + Edge Function for reset codes | ⚠️ Medium — OAuth config + redirect URIs | ⚠️ Medium — two flows |
| **Multiple profiles per email** | ✅ Works | ✅ Works | ⚠️ OAuth email may differ | ✅ Same as A |
| **Phishing resistance** | ⚠️ Link in email | ✅ User knows their password | ✅ User knows their provider | ⚠️ Same as A |
| **Email dependency for login** | ❌ Every login requires email | ✅ No email needed for login | ✅ No email needed | ❌ Magic link path requires email |

**Key insight that changed the decision:** The original evaluation marked "PWA fit" as ✅ for magic link, assuming "link opens in browser → redirects to installed PWA" works seamlessly. In practice:
- On **iOS**, the installed PWA and Safari have partially isolated storage. The session set in the browser callback may not be visible to the PWA.
- On **all platforms**, requiring the user to leave the app, open email, tap a link, wait for a browser, then switch back is ~15-30 seconds of friction — not the seamless flow originally assumed.
- Password login keeps the user entirely within the PWA context.

## Decision

**Accepted: Option B — Email + password as the primary Q3 authentication flow, with code-based password reset.**

### Rationale

1. **PWA compatibility** — password login keeps the entire auth flow inside the installed app. No link-clicking, no browser redirect, no storage isolation issues. This is the single most important factor.
2. **Auto-confirm sign-up** — Supabase's email verification is disabled. Accounts are active immediately on sign-up, eliminating the one link-click that would otherwise be needed.
3. **Code-based password reset** — forgot password sends a 6-digit code (not a link) via a Supabase Edge Function. The code is entered directly in the PWA, avoiding the deep link problem for the reset edge case.
4. **Supabase handles it natively** — `supabase.auth.signInWithPassword({ email, password })` and `supabase.auth.signUp({ email, password })` — minimal code.
5. **Familiar UX** — email + password is the most widely understood auth pattern. Users have password managers that autofill.

### What changed from the original decision

This ADR supersedes the previous (same-numbered) decision that chose magic link. The original reasoning was sound for a web app but underestimated the PWA storage isolation reality:
- Magic links are excellent for **web-first** apps where users are already in the browser.
- For an **installed PWA**, password auth provides a more reliable and faster login experience.

### Implicit decisions

- **OAuth is deferred to Q4** — the redirect-flow complexities with standalone PWA mode remain (OAuth popups blocked, redirect URIs mismatched in `display: standalone`).
- **Supabase Edge Functions are advanced from Assess → Trial** — now used in Q3 for password reset code delivery, not just Q4 push notifications.
- **Multiple profiles per email** — password authenticates the email identity; the app presents a household/profile picker post-auth. This works identically to the magic link approach.

## Consequences

### Positive
- All auth flows stay inside the PWA — no browser redirects
- Password autofill (password manager) makes return visits instant
- Familiar UX — no need to explain "what's a magic link" to non-technical users
- No email delivery dependency for the main login loop
- Auto-confirm sign-up means zero friction after form submission
- Code-based password reset avoids deep link issues entirely

### Negative
- Users forget passwords → need the code-based reset flow (mitigated by 7-day session persistence)
- Sign-up has 3 fields (email + password + confirm) vs 1 field for magic link
- Requires building and maintaining a Supabase Edge Function for reset codes
- Code-based reset requires email delivery (Edge Function + SMTP)

### Neutral
- Local dev: Supabase local includes Inbucket (`localhost:54324`) — useful for testing reset code emails during development
- Session management: 7-day JWT via Supabase; TanStack Query cache invalidated on logout
- Invite codes remain the gating mechanism for new users — unaffected by this decision

## Compliance

- The login page MUST have an email field, a password field, and a "Log In" button
- The submit button text must be "Log In" (or equivalent action-oriented copy)
- Password fields MUST have a show/hide toggle (eye icon)
- Passwords MUST be validated: minimum 8 characters, confirmation must match
- Sign-up MUST auto-confirm accounts (no email verification)
- The forgot password flow MUST use a 6-digit code (not a link) sent via email
- Reset codes MUST expire after 10 minutes
- Rate limiting: max 3 reset code requests per email per 15 minutes; max 5 failed attempts before code invalidation
- Anti-enumeration: the same error message ("Invalid email or password") for both unregistered emails and wrong passwords
- Anti-enumeration for forgot password: same confirmation message for registered and unregistered emails
- OAuth buttons ("Sign in with Google") must not appear until Q4
- Session duration: use Supabase's default (7 days)

## References

- Supabase GoTrue docs: https://supabase.com/docs/guides/auth/auth-email
- PWA storage isolation on iOS: https://developer.apple.com/documentation/safari-release-notes/safari-17_4-release-notes
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

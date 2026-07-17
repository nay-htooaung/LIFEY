---
title: "User Authentication"
status: Draft
type: epic
theme: Shared Foundation
epic_number: EP0002
feature_area: "Authentication & Account Management — sign-up, login, session management, profile, password reset"
scope_boundary: "Covers invite code + password sign-up, email + password login, session persistence, basic profile editing, and code-based password reset. Does NOT include OAuth providers, MFA, or role-based permissions."
dependencies:
  - "Mobile App Shell"
---

> **Instructions:** This epic defines the entry point to LIFEY — how users create accounts and authenticate.

---

# Epic: User Authentication

## Description

The entry point to LIFEY. Users need an account before they can do anything. The app is **closed-access** — only people with a valid invite code can sign up. This invites control during private beta and ensures LIFEY remains a trusted space for households.

On signup, a **personal household** is auto-created — the user's private space for their own tasks before joining a shared household.

### Auth flow

```
Invite code ──► email + password ──► authenticated
    ↑                                    ↑
  gated entry                          personal household
  (one code =                           auto-created
   one use)                              + optionally joined
                                         to shared household
                                         (if code is linked)
```

**Key properties:**
- **Password-based** — user creates a password during sign-up and uses it to log in. No magic links.
- **Auto-confirm** — no email verification required. Account is active immediately on sign-up.
- **Code-based password reset** — forgot password sends a 6-digit code via email, entered directly in the PWA. No browser links.

### Returning users

Already have an account? Skip the invite code — enter your email and password directly. Session persists for 7 days via Supabase JWT stored in IndexedDB.

### Why password instead of magic link?

The original design used magic links (passwordless). For a PWA, magic links create a fundamental UX problem: clicking the link in email opens the **browser**, not the installed app. Password login keeps the entire auth flow inside the PWA — no link-clicking required. See [ADR-0006](../adr/0006-authentication-flow.md) for the full rationale.

This epic connects to the **Shared Foundation** roadmap theme: authentication is a prerequisite for all other features. Without it, users cannot access the app, create or join households, or use any shared features. It builds directly on top of the Mobile App Shell.

---

## Success Criteria (Epic DoD)

- [ ] User can sign up with invite code + email + password (no email verification).
- [ ] Invite code is validated — invalid, expired, or used codes show appropriate errors.
- [ ] Password is validated — minimum 8 characters, confirmation must match.
- [ ] Returning user skips invite code and sees email + password login directly.
- [ ] User can log out and session is cleared.
- [ ] Session persists across app restarts (7-day Supabase token).
- [ ] User can reset a forgotten password via 6-digit code sent to email.
- [ ] Reset code expires after 10 minutes; rate-limited (max 3 per 15 min).
- [ ] Personal household auto-created on first sign-up.
- [ ] If invite code is linked to a shared household, user is automatically added as a member.
- [ ] User can edit their profile (name, avatar).
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Google OAuth (deferred to Q4)
- Apple OAuth (deferred to Q4)
- Multi-factor authentication
- Account deletion flow
- Role-based permissions

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story names link to their story documents using relative `[text](path)` markdown links.*

| # | Story | Status |
|---|-------|--------|
| ST0001 | [Sign Up with Invite Code and Password](../04-story/EP0002-ST0001-sign-up-with-invite-code-and-password.md) | Draft |
| ST0002 | [Log In / Log Out](../04-story/EP0002-ST0002-log-in-log-out.md) | Draft |
| ST0003 | [Session Persistence](../04-story/EP0002-ST0003-session-persistence.md) | Draft |
| ST0004 | [Profile Management](../04-story/EP0002-ST0004-profile-management.md) | Draft |
| ST0005 | [Forgot Password — Code-Based Reset](../04-story/EP0002-ST0005-forgot-password-code-based-reset.md) | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |
| 2026-07-14 | 2.0 | Tech Lead | Revised for magic link — invite code gates entry, password removed, password-recovery out of scope removed |
| 2026-07-14 | 3.0 | Project Manager | Revised for password — magic link replaced with password auth, auto-confirm, code-based password reset (ST0005) added |

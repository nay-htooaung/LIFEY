---
title: "User Authentication"
status: Draft
type: epic
theme: Shared Foundation
feature_area: "Authentication & Account Management — sign-up, login, session management, profile"
scope_boundary: "Covers invite code + magic link authentication, session persistence, and basic profile editing. Does NOT include OAuth providers, MFA, or role-based permissions."
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
Invite code ──► email ──► magic link ──► authenticated
    ↑                    ↑                    ↑
  gated entry          no password        personal household
  (one code =           to remember        auto-created
   one use)                                 + optionally joined
                                            to shared household
                                            (if code is linked)
```

### Returning users

Already have an account? Skip the invite code — enter your email directly and request a magic link. Session persists for 7 days via Supabase JWT stored in IndexedDB.

This epic connects to the **Shared Foundation** roadmap theme: authentication is a prerequisite for all other features. Without it, users cannot access the app, create or join households, or use any shared features. It builds directly on top of the Mobile App Shell.

---

## Success Criteria (Epic DoD)

- [ ] User can sign up with invite code + magic link (no password).
- [ ] Invite code is validated — invalid, expired, or used codes show appropriate errors.
- [ ] Returning user skips invite code and goes straight to email login.
- [ ] User can log out and session is cleared.
- [ ] Session persists across app restarts (7-day Supabase token).
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

> *Decompose the epic into sprint-sized stories. Story titles must use [[Wiki Link]] syntax to auto-link to story docs.*

| Story | Status |
|-------|--------|
| [[Sign Up with Invite Code and Magic Link]] | Draft |
| [[Log In / Log Out]] | Draft |
| [[Session Persistence]] | Draft |
| [[Profile Management]] | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |
| 2026-07-14 | 2.0 | Tech Lead | Revised for magic link — invite code gates entry, password removed, password-recovery out of scope removed |

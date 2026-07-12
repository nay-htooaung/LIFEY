---
title: "User Authentication"
status: Draft
type: epic
theme: Shared Foundation
feature_area: "Authentication & Account Management — sign-up, login, session management, profile"
scope_boundary: "Covers email + password + invite keycode authentication, session persistence, and basic profile editing. Does NOT include OAuth providers, password recovery, MFA, or role-based permissions."
dependencies:
  - "Mobile App Shell"
---

> **Instructions:** This epic defines the entry point to LIFEY — how users create accounts and authenticate.

---

# Epic: User Authentication

## Description

The entry point to LIFEY. Users need to create an account and log in securely before they can do anything. On signup, a **personal household** is auto-created — this is the user's private space where they can manage their own tasks and data before joining a shared household. Authentication uses email/password with an invite keycode system for private early access (or closed beta), giving us control over who can join.

This epic connects to the **Shared Foundation** roadmap theme: authentication is a prerequisite for all other features. Without it, users cannot access the app, create or join households, or use any shared features. It builds directly on top of the Mobile App Shell.

---

## Success Criteria (Epic DoD)

- [ ] User can sign up with email + password + invite keycode.
- [ ] User can log in and log out.
- [ ] Session persists across app restarts.
- [ ] Personal household auto-created on signup.
- [ ] User can edit their profile (name, avatar).
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Google OAuth (deferred)
- Apple OAuth (deferred)
- Password recovery / reset flow (nice-to-have)
- Multi-factor authentication
- Account deletion flow
- Role-based permissions

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story titles must use [[Wiki Link]] syntax to auto-link to story docs.*

| Story | Status |
|-------|--------|
| [[Sign Up with Email + Password + Invite Keycode]] | Draft |
| [[Log In / Log Out]] | Draft |
| [[Session Persistence]] | Draft |
| [[Profile Management]] | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |

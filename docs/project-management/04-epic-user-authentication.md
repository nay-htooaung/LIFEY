---
title: "User Authentication"
status: Draft
type: epic
theme: Shared Foundation
---

## Description

The entry point to LIFEY. Users need to create an account and log in securely before they can do anything. On signup, a **personal household** is auto-created — this is the user's private space. Uses email/password with an invite keycode system for private access. Built on top of the mobile app shell.

---

## Success Criteria

- [ ] User can sign up with email + password + invite keycode
- [ ] User can log in and log out
- [ ] Session persists across app restarts
- [ ] Personal household auto-created on signup
- [ ] User can edit their profile (name, avatar)

---

## Out-of-Scope

- Google OAuth (deferred)
- Apple OAuth (deferred)
- Password recovery / reset flow (nice-to-have)
- Multi-factor authentication
- Account deletion flow
- Role-based permissions

---

## Key Stories

| Story | Size |
|-------|------|
| Sign up with email + password + invite keycode | M |
| Log in / log out | S |
| Session persistence | S |
| Profile management (name, avatar) | S |

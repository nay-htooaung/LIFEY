---
title: "Household Management"
status: Draft
type: epic
theme: Shared Foundation
---

## Description

The core organizational unit of LIFEY. Everything — tasks, expenses, recipes, groceries — belongs to a household. Every user starts with a **personal household** (solo, no invites). They can create additional **shared households** and invite others via a shareable code. A household switcher (like Slack's workspace switcher) lets users jump between their households, changing the context of everything they see.

---

## Success Criteria

- [ ] Personal household exists from signup (auto-created, member: you only)
- [ ] User can create new shared households
- [ ] User can generate a shareable invite code for a shared household
- [ ] User can join a shared household by entering an invite code
- [ ] User can view a list of all households they belong to
- [ ] User can switch between households (context changes everywhere)
- [ ] User can leave a shared household
- [ ] Household admin can delete a shared household

---

## Out-of-Scope

- Household roles (co-admin, moderator)
- Household avatar / custom name editing
- Archiving households
- Multiple admins per household

---

## Key Stories

| Story | Size |
|-------|------|
| Auto-create personal household on signup | S |
| Create a new shared household | M |
| Generate and share invite code | M |
| Join household via invite code | M |
| Household switcher UI | L |
| Leave a shared household | S |
| Delete a shared household (admin) | S |

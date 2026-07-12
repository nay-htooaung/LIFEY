---
title: "Household Management"
status: Draft
type: epic
theme: Shared Foundation
feature_area: "Household CRUD & Membership — create, join, switch, leave, delete households"
scope_boundary: "Covers creating shared households, generating and redeeming invite codes, switching between households, leaving, and admin deletion. Does NOT include role-based permissions, household customization, or archiving."
dependencies:
  - "User Authentication"
---

> **Instructions:** This epic defines the core organizational unit of LIFEY — how households are created, joined, and managed.

---

# Epic: Household Management

## Description

The household is the core organizational unit of LIFEY. Everything — tasks, expenses, recipes, groceries — belongs to a household. Every user starts with a **personal household** (solo, no invites) that is auto-created at signup. They can create additional **shared households** and invite others via a shareable invite code. A household switcher (like Slack's workspace switcher) lets users jump between their households, changing the context of everything they see.

This epic connects to the **Shared Foundation** roadmap theme: households are the multi-user substrate that all shared features (to-do lists, expenses, recipes) operate on. Without households, LIFEY is just a single-user app. It builds on User Authentication (users must exist before they can join households).

---

## Success Criteria (Epic DoD)

- [ ] Personal household exists from signup (auto-created, member: you only).
- [ ] User can create new shared households.
- [ ] User can generate a shareable invite code for a shared household.
- [ ] User can join a shared household by entering an invite code.
- [ ] User can view a list of all households they belong to.
- [ ] User can switch between households (context changes everywhere).
- [ ] User can leave a shared household.
- [ ] Household admin can delete a shared household.
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Household roles (co-admin, moderator)
- Household avatar / custom name editing
- Archiving households
- Multiple admins per household

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story titles must use [[Wiki Link]] syntax to auto-link to story docs.*

| Story | Status |
|-------|--------|
| Auto-create personal household on signup | Draft |
| Create a new shared household | Draft |
| Generate and share invite code | Draft |
| Join household via invite code | Draft |
| Household switcher UI | Draft |
| Leave a shared household | Draft |
| Delete a shared household (admin) | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |

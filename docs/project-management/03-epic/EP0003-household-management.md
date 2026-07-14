---
title: "Household Management"
status: Draft
type: epic
theme: Shared Foundation
epic_number: EP0003
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

> *Decompose the epic into sprint-sized stories. Story names link to their story documents using relative `[text](path)` markdown links.*

| # | Story | Status |
|---|-------|--------|
| ST0001 | [Auto-create personal household on signup](../04-story/EP0003-ST0001-auto-create-personal-household-on-signup.md) | Draft |
| ST0002 | [Create a new shared household](../04-story/EP0003-ST0002-create-a-new-shared-household.md) | Draft |
| ST0003 | [Generate and share invite code](../04-story/EP0003-ST0003-generate-and-share-invite-code.md) | Draft |
| ST0004 | [Join household via invite code](../04-story/EP0003-ST0004-join-household-via-invite-code.md) | Draft |
| ST0005 | [Household switcher UI](../04-story/EP0003-ST0005-household-switcher-ui.md) | Draft |
| ST0006 | [Leave a shared household](../04-story/EP0003-ST0006-leave-a-shared-household.md) | Draft |
| ST0007 | [Delete a shared household (admin)](../04-story/EP0003-ST0007-delete-a-shared-household-admin.md) | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |

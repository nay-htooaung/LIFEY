---
title: "Mobile App Shell"
status: Draft
type: epic
theme: Shared Foundation
feature_area: "App Infrastructure — iOS + Android project setup, navigation, UI components"
scope_boundary: "Covers the foundational scaffold: project initialization, navigation shell, household switcher, reusable UI components, and feature-flag system. Does NOT include any feature-level business logic."
dependencies:
  - "None (foundational epic — all other epics depend on this)"
---

> **Instructions:** This epic defines the scaffolding that every feature is built on top of.

---

# Epic: Mobile App Shell

## Description

The mobile app shell is the foundation of LIFEY — it is the scaffolding that every feature is built on top of. Without it, nothing else can exist. This epic sets up the iOS and Android projects, establishes the navigation structure (bottom tab bar with household-aware routing), builds the household switcher component, creates a library of reusable UI primitives, and implements the feature-flag system that controls module visibility.

This epic connects to the **Shared Foundation** roadmap theme: before we can build any user-facing features, the app must exist, compile, and provide basic navigation and UI capabilities. Every subsequent epic — authentication, household management, to-do lists — depends on this shell being in place first.

---

## Success Criteria (Epic DoD)

- [ ] iOS target builds and runs on device/simulator.
- [ ] Android target builds and runs on device/emulator.
- [ ] Navigation shell is in place with bottom tab bar (household-aware routing).
- [ ] Household switcher component exists (even if only one household initially).
- [ ] Feature-flagged module visibility system works.
- [ ] Reusable UI components exist (buttons, inputs, cards, lists, modals).
- [ ] Shared styling/theming system is set up.
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Dark mode / theme customization
- Complex animations beyond basic transitions
- Offline-first data layer
- Deep linking
- Any feature-level business logic (tasks, expenses, etc.)

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story titles must use [[Wiki Link]] syntax to auto-link to story docs.*

| Story | Status |
|-------|--------|
| Initialize iOS project with standard setup | Draft |
| Initialize Android project with standard setup | Draft |
| Bottom tab navigation with household context | Draft |
| Household switcher component | Draft |
| Feature-flag / module visibility system | Draft |
| Basic UI component library | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |

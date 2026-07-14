---
title: "Mobile App Shell (SPA)"
status: Draft
type: epic
theme: Shared Foundation
epic_number: EP0001
feature_area: "App Infrastructure — Vite SPA project setup, PWA, navigation, UI components, feature flags"
scope_boundary: "Covers the foundational scaffold: Vite project initialization, PWA manifest + service worker, React Router navigation shell, household switcher, reusable UI components, and feature-flag system. Does NOT include any feature-level business logic."
dependencies:
  - "None (foundational epic — all other epics depend on this)"
---

> **Instructions:** This epic defines the scaffolding that every feature is built on top of.

---

# Epic: Mobile App Shell (SPA)

## Description

The app shell is the foundation of LIFEY — it is the scaffolding that every feature is built on top of. Without it, nothing else can exist.

Per [ADR-0002](docs/adr/0002-installable-spa-architecture.md), LIFEY is an **installable single-page application (SPA)** — a Vite + React + React Router PWA, deployed to a static host. Native iOS/Android apps are deferred. This epic:

- Scaffolds the Vite + React + TypeScript project
- Configures the PWA (Web App Manifest + service worker via `vite-plugin-pwa`)
- Establishes React Router navigation with household-aware routing
- Builds the household switcher component
- Creates a library of reusable UI primitives
- Implements the feature-flag system that controls module visibility

This epic connects to the **Shared Foundation** roadmap theme: before we can build any user-facing features, the app must exist, compile, and provide basic navigation and UI capabilities. Every subsequent epic — authentication, household management, to-do lists — depends on this shell being in place first.

---

## Success Criteria (Epic DoD)

- [ ] `vite dev` starts and the app loads in the browser.
- [ ] `vite build` produces a deployable `dist/` folder.
- [ ] PWA manifest is configured and the app is installable (add to home screen).
- [ ] Service worker caches core routes for offline access.
- [ ] React Router navigation is in place with household-aware routing.
- [ ] Household switcher component exists (even if only one household initially).
- [ ] Feature-flagged module visibility system works.
- [ ] Reusable UI components exist (buttons, inputs, cards, lists, modals).
- [ ] Shared styling/theming system is set up (Tailwind CSS).
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Dark mode / theme customization (deferred)
- Complex animations beyond basic transitions
- Offline-first data layer (service worker caching only)
- Deep linking
- Native iOS/Android builds (deferred — see ADR-0002)
- Any feature-level business logic (tasks, expenses, etc.)

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story names link to their story documents using relative `[text](path)` markdown links.*

| # | Story | Status |
|---|-------|--------|
| ST0001 | [Install LIFEY on Home Screen (PWA)](../04-story/EP0001-ST0001-install-lifey-on-home-screen.md) | Draft |
| ST0002 | [Navigate Between Features](../04-story/EP0001-ST0002-navigate-between-features.md) | Draft |
| ST0003 | [Switch Between Households](../04-story/EP0001-ST0003-switch-between-households.md) | Draft |
| ST0004 | [See Only Available Features](../04-story/EP0001-ST0004-see-only-available-features.md) | Draft |

**Note:** The original "Basic UI component library" has been folded into the PWA installability story as technical tasks (component primitives are built as needed). The four stories above are pure user-facing value — no developer-centric stories like "scaffold Vite" exist at the story level. All scaffolding work lives as acceptance criteria and tasks under these stories.

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft |
| 2026-07-14 | 1.1 | Tech Lead | Revised for SPA architecture per ADR-0002 — updated scope, success criteria, and story notes |

---
title: "Mobile App Shell"
status: Draft
type: epic
theme: Shared Foundation
---

## Description

The scaffolding of the app — this is the foundation every feature is built on. Sets up the iOS and Android projects, the navigation structure (bottom tab bar), the household switcher component, and a library of reusable UI components. Everything else depends on this existing first.

---

## Success Criteria

- [ ] iOS target builds and runs on device/simulator
- [ ] Android target builds and runs on device/emulator
- [ ] Navigation shell is in place with bottom tab bar
- [ ] Household switcher component exists (even if only one household initially)
- [ ] Feature-flagged module visibility system works
- [ ] Reusable UI components exist (buttons, inputs, cards, lists, modals)
- [ ] Shared styling/theming system is set up

---

## Out-of-Scope

- Dark mode / theme customization
- Complex animations beyond basic transitions
- Offline-first data layer
- Deep linking

---

## Key Stories

| Story | Size |
|-------|------|
| Initialize iOS project with standard setup | M |
| Initialize Android project with standard setup | M |
| Bottom tab navigation with household context | L |
| Household switcher component | M |
| Feature-flag / module visibility system | M |
| Basic UI component library | L |

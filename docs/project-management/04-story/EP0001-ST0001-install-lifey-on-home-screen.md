---
title: "Install LIFEY on Home Screen (PWA)"
status: Done
type: user_story
epic: "Mobile App Shell (SPA)"
story_number: ST0001
---

## Story

**As a** household member,
**I want** to install LIFEY on my phone's home screen,
**so that** I can open it with one tap like any other app, even when I'm offline.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I visit LIFEY in a supported browser (Chrome, Safari, Edge)
When the app finishes loading
Then I see an install prompt or the browser's "Add to Home Screen" option

@AC-002
Given I have installed LIFEY on my home screen
When I tap the home screen icon
Then the app opens in a standalone window (no browser chrome)
And I am on the main app screen

@AC-003
Given I am offline after installing LIFEY
When I open it from the home screen
Then I see the app shell and any previously cached pages
And I see an offline indicator

@AC-004
Given I am on an unsupported browser
When I visit LIFEY
Then I can still use the full app in the browser tab
And I am not shown an install prompt

@AC-005
Given the app has been updated
When I open the installed PWA
Then the service worker updates in the background
And the new version loads on my next visit
```

---

## Technical Notes

This story implies the following developer work (captured as tasks, not separate stories):
- Vite project scaffolding with TypeScript strict mode
- `vite-plugin-pwa` configuration with Web App Manifest
- Service worker caching strategy (app shell + core routes)
- Install prompt handling
- Offline detection UI

---

## INVEST Checklist

- ✅ **I**ndependent — entry point, no other stories required
- ✅ **N**egotiable — caching strategy details can evolve
- ✅ **V**aluable — user gets app-like experience without app store
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — each path has a Gherkin scenario

**Size:** M

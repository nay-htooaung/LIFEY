---
title: "Navigate Between Features"
status: Draft
type: user_story
epic: "Mobile App Shell (SPA)"
story_number: ST0002
---

## Story

**As a** household member,
**I want** to navigate between LIFEY's features (to-do lists, expenses, settings) from a persistent menu,
**so that** I can quickly move between what I need without losing my place.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I am on any screen in the app
When I look at the navigation menu
Then I see links to all available features (to-do lists, expenses, settings, etc.)

@AC-002
Given I am on the to-do list screen
When I tap "Expenses" in the navigation
Then I am taken to the expense screen
And the current household context is preserved

@AC-003
Given I am viewing a specific to-do list
When I navigate to another feature and back
Then I return to the same to-do list I was viewing

@AC-004
Given a feature is disabled for my household (via feature flags)
When the navigation renders
Then that feature link is hidden from the menu

@AC-005
Given I am on a screen that doesn't exist (404)
When the router resolves the path
Then I see a friendly "Page not found" message
And a link back to the main app
```

---

## Technical Notes

This story implies the following developer work (tasks):
- React Router setup with household-aware routes (`/household/:id/tasks`, etc.)
- Navigation component (sidebar/navbar/bottom nav) that reads available features
- Route guard for feature-flagged modules
- 404 fallback route
- Current household context passed through the router

---

## INVEST Checklist

- ✅ **I**ndependent — can be built after PWA scaffolding is done
- ✅ **N**egotiable — exact nav layout (sidebar vs bottom tabs) open to change
- ✅ **V**aluable — user can move around the app
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — each path has a Gherkin scenario

**Size:** M

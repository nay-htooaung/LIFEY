---
title: "Switch Between Households"
status: Draft
type: user_story
epic: "Mobile App Shell (SPA)"
---

## Story

**As a** member of multiple households,
**I want** to switch between my active households from anywhere in the app,
**so that** I can see and manage each household's tasks and expenses separately.

---

## Acceptance Criteria

```gherkin
Given I am a member of two or more households
When I tap the household switcher
Then I see a list of all my households
And the current household is marked as active

Given I select a different household from the switcher
When the switch completes
Then the app displays data for the selected household
And any previously cached data from the old household is cleared

Given I am a member of only one household
When I look at the household switcher
Then I see my current household name displayed
And the switcher does not suggest switching (no expandable list)

Given I am on a feature screen (e.g., to-do lists) viewing Household A
When I switch to Household B
Then I see the to-do lists for Household B, not Household A

Given a household has been deleted or I was removed
When I attempt to switch to it
Then it no longer appears in the switcher
And I am redirected to my default household
```

---

## Technical Notes

This story implies the following developer work (tasks):
- Household switcher UI component (dropdown or drawer)
- Household context provider that propagates the selected household ID
- Route updates when household changes
- Graceful handling of removed households

---

## INVEST Checklist

- ✅ **I**ndependent — depends only on auth (user must be logged in)
- ✅ **N**egotiable — switcher UI (dropdown vs drawer) open to discussion
- ✅ **V**aluable — manages multi-household life without confusion
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — each path has a Gherkin scenario

**Size:** S

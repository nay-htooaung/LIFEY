---
title: "See Only Available Features"
status: Draft
type: user_story
epic: "Mobile App Shell (SPA)"
---

## Story

**As a** household member,
**I want** to only see features that are available to me,
**so that** I'm not confused by locked or inaccessible options.

---

## Acceptance Criteria

```gherkin
Given a feature is enabled for my household (e.g., to-do lists)
When the navigation renders
Then I see a link to that feature

Given a feature is not yet available for my household
When the navigation renders
Then I do not see a link to that feature

Given a feature was previously available and is now disabled
When the app loads or I refresh
Then the feature link disappears from navigation
And any in-progress screens for that feature show a "This feature is no longer available" message

Given I am an admin of the household
When I look at the feature visibility
Then I see the same available features as all other members
(Feature flags are household-wide, not per-user)

Given a new feature is added to the system
When it is toggled on for a household
Then all members of that household see it on next load
```

---

## Technical Notes

This story implies the following developer work (tasks):
- Feature-flag system (flags stored per household in Supabase)
- API endpoint or real-time subscription to fetch flag state
- Route guard that redirects away from disabled features
- UI component that hides/shows nav items based on flags
- Admin interface for toggling flags (deferred to later story)

**Minimum initial flags:**
- `todo_lists` (default: on)
- `expenses` (default: off — Q4 feature)
- `ai_agent` (default: off — Q4 feature)
- `household_chat` (default: off — later phase)

---

## INVEST Checklist

- ✅ **I**ndependent — can be built stand-alone with hardcoded flags initially
- ✅ **N**egotiable — exact flag names and toggle UI can evolve
- ✅ **V**aluable — prevents confusion from unavailable features
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — each path has a Gherkin scenario

**Size:** S

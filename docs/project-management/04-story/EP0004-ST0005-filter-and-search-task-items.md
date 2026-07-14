---
title: "Filter and Search Task Items"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0005
---

## Story

**As a** household member,
**I want** to filter task items by list, assignee, status, and due date, and search by title,
**so that** I can quickly find what I'm looking for among many tasks.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I have multiple task lists in a household
When I tap "Filter"
Then I see options to filter by: list, assignee, status, due date range

@AC-002
Given I filter by a specific task list
When I apply the filter
Then I only see items from that list

@AC-003
Given I filter by assignee (e.g., "Me")
When I apply the filter
Then I only see items assigned to me

@AC-004
Given I filter by status "Completed"
When I apply the filter
Then I only see completed items

@AC-005
Given I use the search bar
When I type a keyword
Then I only see items whose title contains that keyword (case-insensitive)

@AC-006
Given I have active filters
When I tap "Clear Filters"
Then all filters are reset and I see all items

@AC-007
Given I have filters applied
When the page reloads
Then my filters are lost (not persisted across sessions)
```

---

## INVEST Checklist

- ✅ **I**ndependent — depends on task items existing
- ✅ **N**egotiable — exact filter UI (dropdown vs chips) is flexible
- ✅ **V**aluable — prevents scrolling through hundreds of items
- ✅ **E**stimable — clear scope (~2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

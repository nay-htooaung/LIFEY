---
title: "Set Due Dates on Task Items"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0004
---

## Story

**As a** household member,
**I want** to set a due date on a task item,
**so that** I can track deadlines and prioritise my day.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I am editing a task item
When I tap "Due Date"
Then I see a date picker

@AC-002
Given I select a future date
When I save the task item
Then the due date is displayed on the item

@AC-003
Given a task item's due date is today
When I view the item
Then it is visually marked as "Due today"

@AC-004
Given a task item's due date has passed and the item is still pending
When I view the item
Then it is visually marked as "Overdue"

@AC-005
Given I clear the due date on a task item
When I save
Then the item has no due date

@AC-006
Given I am viewing a task list filtered by due date
When I select "Due this week"
Then I only see items with due dates in the current week
```

---

## INVEST Checklist

- ✅ **I**ndependent — depends on task items existing
- ✅ **N**egotiable — exact overdue styling is flexible
- ✅ **V**aluable — essential for deadline-driven tasks
- ✅ **E**stimable — clear scope (~1–2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** S

---
title: "Add, Complete, and Manage Task Items"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0002
---

## Story

**As a** household member,
**I want** to add, check off, edit, and delete to-do items inside a task list,
**so that** I can track what needs to be done and mark progress.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I am viewing a task list
When I tap "Add Item"
And I enter a title
Then a new task item appears in the list with status "pending"

@AC-002
Given I have a pending task item
When I tap the checkbox
Then the item is marked as "completed"
And it shows who completed it (if in a shared household)
And the item moves to the completed section

@AC-003
Given I have a completed task item
When I tap the checkbox
Then the item is marked as "pending" again
And it returns to the active items

@AC-004
Given I have a task item
When I edit its title or description
Then the changes are saved

@AC-005
Given I have a task item
When I delete it
Then it is removed from the list
And I see a confirmation before the delete

@AC-006
Given a task list has 50 items
When I add a new item
Then the list remains responsive and scrollable
```

---

## INVEST Checklist

- ✅ **I**ndependent — depends on task lists existing
- ✅ **N**egotiable — undo after complete/delete can be discussed
- ✅ **V**aluable — core daily action: checking things off
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

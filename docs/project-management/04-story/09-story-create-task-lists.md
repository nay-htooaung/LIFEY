---
title: "Create and Manage Task Lists"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
---

## Story

**As a** household member,
**I want** to create, rename, and delete task lists,
**so that** I can organise my to-do items into groups (e.g., "Groceries", "This Week", "Cleaning Roster").

---

## Acceptance Criteria

```gherkin
Given I am in a household (personal or shared)
When I tap "New List"
And I enter a name
Then a new task list is created in the current household
And I am taken to the empty list

Given I have a task list
When I tap "Rename" on the list
And I enter a new name
Then the list name is updated

Given I have a task list
When I delete the list
Then the list and all its items are removed
And I see a confirmation before the delete

Given I am in a personal household
When I view my task lists
Then I only see lists I created

Given I am in a shared household
When I view task lists
Then I see all lists created by any household member

Given I have an empty list "Groceries"
When I open it
Then I see "No items yet — add your first task"
```

---

## INVEST Checklist

- ✅ **I**ndependent — no other stories required
- ✅ **N**egotiable — exact UI for rename/delete is flexible
- ✅ **V**aluable — user can structure tasks into groups
- ✅ **E**stimable — clear scope (~2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

---
title: "Assign Task Items to Household Members"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0003
---

## Story

**As a** household member,
**I want** to assign task items to myself or others in the household,
**so that** everyone knows who's responsible for what.

---

## Acceptance Criteria

```gherkin
@AC-001
Given I am in my personal household
When I create a task item
Then I am automatically assigned as the owner
And no assignee picker is shown

@AC-002
Given I am in a shared household
When I create a task item
Then the item starts unassigned (no assignee)
And I can select one or more household members from a picker

@AC-003
Given I am viewing a task item in a shared household
When I tap "Assign"
Then I see a list of all household members (including myself)

@AC-004
Given I select a household member from the picker
When the assignment is saved
Then that member's name/avatar appears on the task item

@AC-005
Given I am assigned to a task item
When I look at the item detail
Then I see my name as the assignee
And other members can see who is assigned

@AC-006
Given a household member is removed from the household
When task items were assigned to them
Then their assignments are cleared from those items
```

---

## INVEST Checklist

- ✅ **I**ndependent — depends on task items existing
- ✅ **N**egotiable — single assignee vs multiple assignees open to discussion
- ✅ **V**aluable — clarifies responsibility in shared households
- ✅ **E**stimable — clear scope (~2 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** S

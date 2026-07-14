---
title: "Push Notifications for Task Assignments and Due Dates"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0006
---

## Story

**As a** household member,
**I want** to receive a notification when I'm assigned a task and when a task's due date is approaching,
**so that** I don't miss important deadlines or forget my responsibilities.

---

## Acceptance Criteria

```gherkin
@AC-001 @TestExempt
# ExemptReason: Push notification delivery requires a physical device or OS-level mock; cannot be automated in CI
Given I am a member of a shared household
When another member assigns me a task item
Then I receive a push notification with the task title and list name

@AC-002 @TestExempt
# ExemptReason: Notification tap interaction requires OS-level integration that cannot be automated in headless CI
Given I tap the notification
When the app opens
Then I am taken to the task list containing that item

@AC-003
Given I have a task item with a due date tomorrow
When I open the app
Then I see a badge or indicator for upcoming due dates

@AC-004
Given I have opted out of notifications
When a task is assigned to me
Then I do not receive a push notification

@AC-005
Given I was offline when a notification was sent
When I come back online
Then I do not receive stale/backdated notifications
```

---

## INVEST Checklist

- ✅ **I**ndependent — depends on task items + assignees existing
- ✅ **N**egotiable — exact timing of due-date reminders is configurable
- ✅ **V**aluable — prevents missed deadlines in shared households
- ✅ **E**stimable — clear scope (~2–3 days)
- ✅ **S**mall — fits in one sprint
- ✅ **T**estable — every path has a Gherkin scenario

**Size:** M

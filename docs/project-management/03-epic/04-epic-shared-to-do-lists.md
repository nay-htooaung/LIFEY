---
title: "Shared To-Do Lists"
status: Draft
type: epic
theme: Shared To-Do Lists
feature_area: "Task Management — task lists with items, assignees, due dates, and notifications"
scope_boundary: "Covers task list and item CRUD scoped to households, member assignment, due dates, filtering/search, push notifications, and a defined AI agent interface. Does NOT include recurring tasks, subtasks, comments, or alternative views (kanban, calendar)."
dependencies:
  - "Household Management"
  - "User Authentication"
---

> **Instructions:** This epic defines the first real daily-use feature — household to-do lists.

---

# Epic: Shared To-Do Lists

## Description

Shared to-do lists are the first real feature users interact with daily. Users create **task lists** (e.g., "Groceries", "Cleaning Roster", "This Week") that belong to the currently selected household. Each list contains **task items** that can be checked off, assigned to household members, and given due dates.

- In your **personal household** — only you see and manage your lists. Assignees default to yourself.
- In a **shared household** — everyone sees and collaborates on lists. Assignees can be any member, defaulting to unassigned.

Push notifications fire for assignments and upcoming due dates. This epic also lays the groundwork for future AI agent integration by defining a clean API that agents can use to manage tasks autonomously.

This epic connects to the **Shared To-Do Lists** roadmap theme: it is our first daily-use feature — simple, fast, and immediately useful. It depends on Household Management (tasks belong to a household) and User Authentication (users need accounts).

---

## Success Criteria (Epic DoD)

- [ ] User can create, rename, and delete task lists within a household.
- [ ] User can add, edit, complete, and delete task items inside a list.
- [ ] Task lists in personal household are visible only to you; lists in shared households visible to all members.
- [ ] User can assign task items to household members (auto-assigned in personal, selectable in shared).
- [ ] User can set due dates on task items.
- [ ] User can filter task items by assignee, list, status, and due date.
- [ ] Push notifications fire for new assignments and upcoming due dates.
- [ ] API/interface is defined for future AI agent integration.
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation is published.

## Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- Recurring tasks
- Subtasks / nested checklists
- Task comments or discussion threads
- Kanban / board view
- Calendar or timeline view
- Task templates

---

## User Stories

> *Decompose the epic into sprint-sized stories. Story titles must use [[Wiki Link]] syntax to auto-link to story docs.*

| Story | Status |
|-------|--------|
| Create and manage task lists | Draft |
| Add, complete, and manage task items | Draft |
| Assign task items to household members | Draft |
| Set due dates on task items | Draft |
| Filter and search task items | Draft |
| Push notifications for task assignments and due dates | Draft |
| AI agent integration interface | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |
| 2026-07-14 | 1.1 | Tech Lead | Revised for task list model — removed categories, added lists + items with assignees |

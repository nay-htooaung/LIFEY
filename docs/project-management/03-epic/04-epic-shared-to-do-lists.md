---
title: "Shared To-Do Lists"
status: Draft
type: epic
theme: Shared To-Do Lists
feature_area: "Task Management — create, assign, filter, and be notified about tasks within a household"
scope_boundary: "Covers task CRUD scoped to households, personal vs. shared visibility, member assignment, categories/due dates, filtering/search, push notifications, and a defined AI agent interface. Does NOT include recurring tasks, subtasks, comments, or alternative views (kanban, calendar)."
dependencies:
  - "Household Management"
  - "User Authentication"
---

> **Instructions:** This epic defines the first real daily-use feature — household to-do lists.

---

# Epic: Shared To-Do Lists

## Description

Shared to-do lists are the first real feature users interact with daily. Tasks are scoped to the currently selected household — the personal household gives you private tasks, while shared households give you collaborative task management. Users can create tasks, assign them to household members, set categories and due dates, and filter or search through their tasks. Push notifications fire for new assignments and upcoming due dates. This epic also lays the groundwork for future AI agent integration by defining a clean API/interface that agents can use to create, read, update, and complete tasks autonomously.

This epic connects to the **Shared To-Do Lists** roadmap theme: it is our first daily-use feature — simple, fast, and immediately useful. It depends on Household Management (tasks belong to a household) and User Authentication (users need accounts).

---

## Success Criteria (Epic DoD)

- [ ] User can create, edit, complete, and delete tasks in the current household.
- [ ] Tasks in personal household are visible only to you.
- [ ] Tasks in shared household are visible to all members.
- [ ] User can assign shared tasks to household members.
- [ ] User can set categories/labels and due dates.
- [ ] User can filter tasks by assignee, category, status.
- [ ] Push notifications fire for task assignments and upcoming due dates.
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
| Create, view, edit, delete tasks (scoped to household) | Draft |
| Personal vs. shared task visibility | Draft |
| Task assignment to household members | Draft |
| Task categories and due dates | Draft |
| Filter and search tasks | Draft |
| Push notifications for tasks | Draft |
| AI agent integration interface | Draft |

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-07-12 | 1.0 | Project Manager | Initial draft — updated to template format |

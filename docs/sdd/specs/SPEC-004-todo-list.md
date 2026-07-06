# SPEC-004: To-Do List

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. Task management (CRUD, assignment, completion, projects, recurrence, ordering) is a single domain.

## 2. The 5W1H Intent
- **Who:** Any household member.
- **What:** Manage shared household tasks — create, assign, reorder, complete, and organise tasks across multiple projects/lists with recurring schedules and due dates.
- **Where:** Frontend (`/todos` module) ↔ Backend (`/api/v1/todos/*`, `/api/v1/todo-lists/*`) ↔ PostgreSQL.
- **When:** Daily household operations — chores, errands, projects, maintenance.
- **Why:** To distribute household work transparently, track what's due, and reduce friction around task coordination.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: CRUD tasks
- **Given** a logged-in household member,
- **When** the user creates a task with title, optional description, due date, priority (low/medium/high), and list/project,
- **Then** the task is saved and displayed in the appropriate list.
- **When** the user edits or deletes a task,
- **Then** the change is persisted immediately.

### US-002: Assign to member
- **Given** a logged-in household member,
- **When** the user assigns a task to a household member (including themselves),
- **Then** the assignee sees the task in their view and the task shows the assignee's name.
- **When** a task is unassigned,
- **Then** it appears as unassigned in the shared list.

### US-003: Completion tracking
- **Given** a task exists,
- **When** a household member marks it as complete,
- **Then** the task is visually marked done, showing who completed it and when.
- **When** the task is reopened (unmarked),
- **Then** it returns to the active list with completion data cleared.

### US-004: Task lists / projects
- **Given** a logged-in household member,
- **When** the user creates a task list/project (e.g., "Kitchen Renovation", "Weekly Cleaning"),
- **Then** tasks can be grouped under that project and the project appears as a filterable view.
- **When** the user edits or archives a project,
- **Then** tasks in an archived project are preserved but hidden from the default active view.

### US-005: Recurring tasks
- **Given** a logged-in household member,
- **When** the user creates a task with a recurrence rule (daily/weekly/monthly/fortnightly),
- **Then** after completion, a new task instance is auto-created for the next due period.
- **When** the user deactivates the recurring rule,
- **Then** no further instances are created.

### US-006: Due dates & overdue warnings
- **Given** tasks with due dates,
- **When** the current date passes a task's due date without it being completed,
- **Then** the task is visually marked as overdue (red/highlighted) and sorted to the top of its list.
- **Given** a task is due today,
- **Then** it shows a "due today" indicator.

### US-007: Drag-and-drop reorder
- **Given** a logged-in household member viewing a task list,
- **When** the user drags a task to a new position within the list,
- **Then** the task order is persisted and reflected for all household members (on next refresh).

## 4. Out of Scope (Guardrails)
- Do NOT implement calendar integration (Google Calendar, iCal sync).
- Do NOT implement push/email notifications for due dates or assignments.
- Do NOT implement time tracking (time spent per task).
- Do NOT implement checklist/subtask within a task.
- Do NOT implement Kanban board view (drag across status columns) in this spec — reorder within a single list only.
- Do NOT implement real-time sync — save-and-refresh model.

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/todo-lists` | Yes | List projects/lists |
| POST | `/api/v1/todo-lists` | Yes | Create project/list |
| PUT | `/api/v1/todo-lists/{id}` | Yes | Update project/list |
| DELETE | `/api/v1/todo-lists/{id}` | Yes | Archive project/list |
| GET | `/api/v1/todos` | Yes | List tasks (filterable by list, assignee, status, date range) |
| POST | `/api/v1/todos` | Yes | Create task |
| GET | `/api/v1/todos/{id}` | Yes | Get task detail |
| PUT | `/api/v1/todos/{id}` | Yes | Update task |
| DELETE | `/api/v1/todos/{id}` | Yes | Delete task |
| PATCH | `/api/v1/todos/{id}/complete` | Yes | Mark complete (with user_id, timestamp) |
| PATCH | `/api/v1/todos/{id}/reopen` | Yes | Reopen task |
| PATCH | `/api/v1/todos/{id}/assign` | Yes | Assign/unassign member |
| PUT | `/api/v1/todos/reorder` | Yes | Bulk update sort order (drag-and-drop result) |

## 6. Data Model (Summary)

**Tables:**
- `todo_lists` — id, household_id, name, description, is_archived, sort_order, created_at
- `todos` — id, household_id, todo_list_id (FK), title, description, priority (enum), due_date, is_completed, completed_by_user_id (FK, nullable), completed_at, assigned_to_user_id (FK, nullable), sort_order, is_recurring, recurrence_frequency (enum, nullable), recurrence_parent_id (FK self-ref, nullable), created_at, updated_at

All tables carry `household_id` and filter queries by it. Recurrence is handled by creating the next instance on completion of the current one (application-level, not DB triggers).

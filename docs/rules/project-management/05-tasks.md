# Tasks

The **smallest unit of execution** in the project hierarchy. Tasks are the technical breakdown of a user story — the concrete steps a developer takes to ship the story.

---

## 1. Definition

A **task** is a single, actionable piece of work that contributes to completing a user story. Unlike stories, tasks are not written from the user's perspective — they are written from the **implementer's** perspective.

### Characteristics
- Takes **hours to a few days** (ideally < 1 day).
- Assigned to a **single person**.
- Has a **clear definition of done** (e.g., "PR merged", "test passes").
- **Not estimable** in story points — tracked in hours or simply checked off.

---

## 2. Hierarchy

```
Epic: "Auto-split recurring bills"
  └── Story: "Set up a recurring bill template"
        ├── Task: Create `recurring_bills` DB migration
        ├── Task: Scaffold API endpoints (CRUD for recurring bill templates)
        ├── Task: Build frontend form for recurring bill setup
        ├── Task: Add form validation (amount, frequency, date)
        ├── Task: Write unit tests for the split calculation
        └── Task: Write integration test for the full flow
```

---

## 3. Task Template

```
Title: [Short action-oriented name]

Story: [Link to parent user story]

Description:
- What exactly needs to be done?
- Any context or constraints?

DoD:
- [ ] Code written and pushed
- [ ] PR opened and reviewed
- [ ] Tests pass (unit + integration)
- [ ] No lint/type errors
```

---

## 4. Task vs. Story

| Aspect | Story | Task |
|--------|-------|------|
| **Perspective** | User | Developer |
| **Value** | Delivers user-facing value | Enables the story to ship |
| **Size** | 2–3 days | Hours–1 day |
| **Estimable** | Story points | Hours or binary (done/not) |
| **Assigned to** | Team (pairing) | Individual |
| **Template** | "As a… I want… so that…" | "Create X", "Implement Y" |

### When a task becomes a story
If a task takes **more than 2–3 days**, it may actually be a story that was missed during refinement. Escalate to the team and consider splitting.

---

## 5. Common Task Categories

| Category | Examples |
|----------|---------|
| **Database** | "Create migration for `grocery_items` table" |
| **Backend** | "Implement `POST /api/expenses` endpoint" |
| **Frontend** | "Build expense list component with sorting" |
| **Testing** | "Write unit test for split calculator" |
| **DevOps** | "Configure staging environment" |
| **Docs** | "Update API docs for expense endpoints" |
| **Design** | "Create mockups for the dashboard" |

---

## 6. Task Lifecycle

```
To Do → In Progress → In Review → Done
          (active)    (PR open)   (merged)
```

### Workflow rules
- A developer picks one task at a time (no multitasking).
- If a task is blocked, label it **Blocked** and unassign yourself.
- Tasks are updated daily during standup (not tracked in hours).

---

## 7. Task Board

A typical sprint board columns:

| To Do | In Progress | In Review | Done |
|-------|-------------|-----------|------|
| Tasks not yet started | Task actively being worked on | PR submitted, awaiting review | Merged to main |

Tasks live **under** their parent story. The story is "Done" only when all its tasks are Done.

---

## 8. Anti-Patterns

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| **Task-creep** | 20+ micro-tasks for one story. | Keep tasks at a granularity of ~1 day. |
| **Missing story** | Task exists without a parent story. | A task without a story has no user value. |
| **Over-estimated** | "Task: Build entire feature" (3 weeks). | That's a story, not a task. |
| **No DoD** | Task marked "done" without a PR merged. | Every task must have a verifiable completion. |
| **Too vague** | "Work on expense stuff." | Be specific: "Add amount field to expense form." |

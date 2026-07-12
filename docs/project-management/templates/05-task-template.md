---
# ──────────────────────────────────────────────
# Task — Template
# ──────────────────────────────────────────────
title: "[Short, action-oriented task name — verb + noun]"
status: todo              # todo | in_progress | in_review | done
type: task
story: "[Parent User Story Title]"
category: backend         # database | backend | frontend | testing | devops | docs | design
assignee: ""              # Name of the person working on this
created: YYYY-MM-DD
---

> **Instructions:** Replace all `[bracketed]` placeholders with your content.
> Tasks live under their parent story. The story is **Done** only when all its tasks are Done.

---

# [Task Title]

## 1. Description

> *What exactly needs to be done? Be specific — a developer should know exactly what to build.*

**[Detailed description of the implementation work, including any constraints, references, or context.]**

### ✅ Example

> Create a database migration to add the `recurring_bills` table with columns: `id`, `household_id`, `amount`, `frequency` (enum: weekly|monthly|yearly), `assigned_members` (JSON array of user IDs), `next_due_date`, `is_active`, `created_at`, `updated_at`. Include the rollback migration.

---

## 2. Parent Story

> **Story:** [Parent User Story Title]

### ✅ Example

> **Story:** Set up a recurring bill template (amount, frequency, members)

---

## 3. Definition of Done

> *Clear, verable completion criteria. Every task must have at least a PR merge check.*

- [ ] Code written and pushed to branch
- [ ] Pull request opened
- [ ] PR reviewed and approved
- [ ] Tests pass (unit + integration)
- [ ] No lint or type errors
- [ ] Documentation updated (if applicable)

### ✅ Example (Backend Task)

- [x] Migration script written and tested locally
- [x] API endpoint `POST /api/recurring-bills` implemented
- [x] PR opened (#142) and approved
- [x] Unit tests covering create, validate, and error cases
- [x] All existing tests still pass

---

## 4. Technical Notes

> *Implementation details, design decisions, gotchas, or references.*

- **[Note 1]**
- **[Note 2]**

---

## 5. Common Task Categories

| Category | When to use | Example |
|----------|-------------|---------|
| **database** | Schema changes, migrations, seed data | "Create migration for `grocery_items` table" |
| **backend** | API endpoints, business logic, services | "Implement `POST /api/expenses` endpoint" |
| **frontend** | UI components, pages, forms | "Build expense list component with sorting" |
| **testing** | Test coverage not tied to a single code change | "Write E2E test for bill split flow" |
| **devops** | CI/CD, infrastructure, monitoring | "Configure staging environment auto-deploy" |
| **docs** | Documentation separate from code changes | "Update API docs for expense endpoints" |
| **design** | Mockups, prototypes, design system | "Create Figma mockups for dashboard" |

---

## 6. Granularity Check

- [ ] This task takes **less than 1 day** of work.
- [ ] It can be assigned to **one person**.
- [ ] It has a **single, clear outcome** (one PR, one concern).
- [ ] It is **not** a user story masquerading as a task.

> ⚠️ **If this task takes more than 2–3 days, it may be a hidden story. Escalate to the team.**

---

## 7. Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

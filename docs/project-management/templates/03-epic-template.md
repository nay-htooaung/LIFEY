---
# ──────────────────────────────────────────────
# Epic — Template
# ──────────────────────────────────────────────
title: "[Short, descriptive epic name]"
status: backlog          # backlog | refined | in_progress | review | done
type: epic
theme: "[Roadmap Theme this epic belongs to]"
size: M                  # XS | S | M | L | XL
feature_area: "[Feature domain — e.g., Receipt Scanning, Invites, Payments]"
scope_boundary: "[One sentence defining what's in and out of scope]"
dependencies:
  - "[Dependency 1, if any]"
  - "[Dependency 2, if any]"
author: "[Name]"
created: YYYY-MM-DD
---

> **Instructions:** Replace all `[bracketed]` placeholders with your content.
> The completed file should be saved as `docs/project-management/03-epics.md` (appended to the epics registry).

---

# Epic: [Title]

## 1. Description

> *What problem does this solve, who benefits, and how does it connect to the roadmap theme?*

**[2–3 paragraphs explaining the epic's purpose, context, and user value.]

---

### ✅ Example

> **Epic:** Auto-Split Recurring Bills
>
> Households pay recurring bills like rent, utilities, and internet every month. Currently, one person pays the full amount and then has to manually chase others for their share. This epic automates the entire cycle: set up a bill template once, and on each due date, the system calculates each member's share, applies it to their balance, and sends a notification. This connects to the **Core Expense Management** roadmap theme by reducing friction in the most common household expense scenario.

---

## 2. Scope Boundary

> *A single sentence that crisply defines what this epic covers — and implicitly what it doesn't.*

**This epic covers [what's included — starting point to ending point]. Nothing before [X] and nothing after [Y].**

### ✅ Example

> This epic covers everything needed for a user to **define a recurring bill, have it automatically split on each due date, and notify all members** — nothing before bill template creation and nothing after the split is recorded in each member's balance.

### ✅ Another Example (Receipt Scanning)

> This epic covers everything needed for a user to **capture a receipt photo, extract line items via OCR, and save them as an expense** — nothing before camera permissions and nothing after the expense is categorized.

---

## 3. Success Criteria (Epic DoD)

> *Delete the `[ ]` that don't apply. Add epic-specific criteria.*

- [ ] All constituent stories are **Done**.
- [ ] Feature is deployed and usable by real users.
- [ ] **Scope boundary is respected** — no scope creep outside the boundary statement.
- [ ] Performance benchmarks pass (if applicable).
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation (user-facing) is published.
- [ ] Feature flag (if used) is flipped to GA.
- [ ] Monitoring and alerts are configured (if applicable).
- [ ] Release notes are drafted.

---

## 4. Out of Scope

> *Items explicitly NOT covered, to prevent scope creep.*

- [Item 1]
- [Item 2]
- [Item 3]

### ✅ Example (Auto-Split Recurring Bills)

- **One-time expense splitting** — covered by a separate epic.
- **Multi-currency bills** — out of scope for this quarter.
- **Automatic bill detection from bank feeds** — future enhancement.

---

## 5. User Stories

> *Decompose the epic into sprint-sized stories. Each story should represent a single user action or goal.*

| # | Story Title | Size (S/M/L) | Status |
|:-:|-------------|:------------:|--------|
| 1 | [Story 1 — e.g., Set up a recurring bill template] | M | Refined |
| 2 | [Story 2] | S | Refined |
| 3 | [Story 3] | S | Backlog |
| 4 | [Story 4] | L | Backlog |
| 5 | [Story 5 — nice-to-have, could defer] | S | Backlog |

### ✅ Example

| # | Story Title | Size | Status |
|:-:|-------------|:----:|--------|
| 1 | Set up a recurring bill template (amount, frequency, members) | M | Refined |
| 2 | Auto-apply split rules on due date | M | Refined |
| 3 | Notify members when a split is applied | S | Backlog |
| 4 | Edit or cancel a pending auto-split | S | Backlog |
| 5 | View history of all auto-splits for a bill | S | Backlog |

---

## 6. Size Reference

| Size | Meaning | Typical Stories | Typical Sprints |
|:----:|---------|:---------------:|:---------------:|
| XS   | A single story masquerading as an epic — consider demoting | 1–2 | < 1 |
| S    | Small, well-understood feature | 3–5 | 1–2 |
| M    | Standard epic | 5–10 | 2–4 |
| L    | Large initiative — consider splitting | 10–15 | 4–6 |
| XL   | Very large — **must** split before committing | 15+ | 6+ |

---

## 7. Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

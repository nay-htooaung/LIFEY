# Epics

A **container** for a large body of work that spans multiple sprints. Epics sit between the Roadmap (strategic) and User Stories (sprint-sized), bridging high-level themes to concrete execution.

---

## 1. Definition

An **epic** is a significant initiative that is too large to complete in a single sprint. It is decomposed into several **user stories** that each deliver incremental value.

### Characteristics
- Spans **weeks to months** (typically 2–6 sprints).
- Aligns to a **roadmap theme** or strategic goal.
- Has a **clear definition of done** — when the epic is "shipped."
- Represents a **coherent feature area** (e.g., "Receipt scanning" or "Household invites").

---

## 2. Hierarchy

```
Roadmap Theme: "Expense Management"
  └── Epic: "Auto-split recurring bills"
        ├── Story: "Set up a recurring bill template"
        ├── Story: "Auto-apply split rules on due date"
        ├── Story: "Notify members when split is applied"
        └── Story: "Edit or cancel a pending auto-split"
```

---

## 3. Epic Template

```
Title: [Short, descriptive name]

Description:
- What problem does this solve?
- Who benefits?
- How does it connect to the roadmap theme?

Success Criteria (Epic DoD):
- [ ] All constituent stories are Done.
- [ ] Feature is deployed and usable by real users.
- [ ] Acceptance criteria for the epic-level behavior are met.
- [ ] Performance benchmarks pass (if applicable).

Out-of-Scope:
- Things explicitly NOT covered (to prevent scope creep).

Key Stories:
- [Link to story or short description] — [estimated size]
```

---

## 4. Epic vs. Story vs. Task

| Level | Size | Timeframe | Who writes it |
|-------|------|-----------|--------------|
| **Epic** | Large (multiple sprints) | Weeks–months | Product Manager |
| **Story** | Small (one sprint) | Days | PM + Devs refine together |
| **Task** | Tiny (hours–days) | Hours–days | Developers |

### Rules
- Epics should be **estimable at a high level** (t-shirt sizes: S/M/L/XL or story point ranges).
- An epic without decomposed stories is **not sprint-ready**.
- If an epic spans more than 3 months, consider **splitting the epic**.

---

## 5. Splitting Epics

| Strategy | When to use | Example |
|----------|------------|---------|
| **By feature slice** | Epic has multiple distinct features. | "Receipt scanning" → "Photo capture" + "OCR text extraction" + "Auto-categorize" |
| **By workflow step** | Epic covers a multi-step user flow. | "Household onboarding" → "Invite members" + "Accept invite" + "Set roles" |
| **By MVP vs. Enhancement** | Some parts are must-have, others nice-to-have. | "Basic expense split" (MVP) → "Uneven split" (v2) → "Multi-currency" (v3) |
| **By platform** | Different rollout cadence per platform. | "Web dashboard" → "Mobile app" (separate epics) |

---

## 6. Epic Lifecycle

```
Backlog → Refined → Committed → In Progress → Review → Done
  (theme identified)  (stories defined)  (sprint planning)  (implementation)  (epic demo)  (epic DoD met)
```

---

## 7. Epic DoD (Definition of Done)

An epic is **Done** when:

- [ ] All user stories are closed as Done.
- [ ] Feature has been demoed to stakeholders.
- [ ] No known P0/P1 bugs remain.
- [ ] Documentation (user-facing) is published.
- [ ] Feature flag (if used) is flipped to GA.
- [ ] Monitoring and alerts are configured (if applicable).
- [ ] Release notes are drafted.

---

## 8. Anti-Patterns

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| **Evergreen epic** | Stories keep getting added; epic never closes. | Freeze scope when sprints start. |
| **Epic-as-a-label** | Every story is tagged as an epic. | Use epics only for multi-sprint initiatives. |
| **No visible progress** | Epic lives for months with no demo. | Demo after each constituent story. |
| **Too small** | Epic contains 2 stories = it's a story. | Skip the epic level; just write stories. |

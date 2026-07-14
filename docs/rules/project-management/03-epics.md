# Epics

A **container** for a large body of work that spans multiple sprints. Epics sit between the Roadmap (strategic) and User Stories (sprint-sized), bridging high-level themes to concrete execution.

---

## 0. Naming Convention

Every epic gets a unique identifier `EPxxxx` (e.g., `EP0001`, `EP0002`).

### File name
```
EPxxxx-<short-kebab-slug>.md
```

### Frontmatter
The `epic_number` field is **required** in YAML frontmatter:
```yaml
title: "Mobile App Shell (SPA)"
status: Draft
type: epic
theme: Shared Foundation
epic_number: EP0001
```

### Numbering rules
- `EP` prefix, zero-padded to 4 digits.
- Numbers are assigned sequentially: EP0001, EP0002, EP0003…
- Once assigned, an epic number is **never reused** — even if the epic is deleted or deprecated.
- Epic numbers are referenced in story file names: `EPxxxx-STxxxx-<name>.md`.

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
- `[Story title](path/to/story.md)` — links to the story document using a relative file path
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

---

## 9. Agent Workflow — Epic Creation

When an agent creates a new epic, follow this collaborative workflow:

### 9.1 Gather info first
Ask the user for the epic's:
- Title and description (problem, beneficiaries, roadmap theme connection)
- Success criteria / definition of done
- Scope boundary (what's in vs. out of scope)
- Dependencies on other epics
- Feature area classification

### 9.2 Do NOT auto-generate stories
**Never write the story list yourself.** The story decomposition must be a conversation, not an assumption.

### 9.3 Propose stories one by one
For each story:
1. **Propose one story** to the user with a brief description.
2. **Wait for confirmation** — the user must explicitly approve, reject, or request a change before moving on.
3. **Move to the next story** only after the current one is confirmed.
4. **Ask if there are more** — after each confirmed story, ask: *"Should I add another story, or is that all for this epic?"*

### 9.4 Finalize only on user confirmation
The User Stories table in the epic doc is written only after all stories have been individually confirmed. If the user confirms "that's all," write the table and save the epic.

### 9.5 Rationale
- Prevents scope creep from the outset (every story is intentional).
- Keeps the user in control of decomposition — they know their domain best.
- Avoids the "dumping ground" anti-pattern where an epic accumulates unvalidated stories.

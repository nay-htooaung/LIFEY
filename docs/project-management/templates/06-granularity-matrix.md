---
# ──────────────────────────────────────────────
# Granularity Decision Matrix — Cheat Sheet
# ──────────────────────────────────────────────
title: "Granularity Decision Matrix"
status: approved
version: 1.0
last_updated: YYYY-MM-DD
author: "Team"
type: reference
---

# Granularity Decision Matrix

> **Purpose:** Decide which level of the hierarchy a piece of work belongs to — based on *meaning and scope*, not just time. Use this cheat sheet during backlog grooming, refinement, and sprint planning.

---

## 1. Hierarchy Overview

```
                    ┌──────────────────────────┐
                    │      PRODUCT VISION       │  "Where are we going?"
                    │   (singular, enduring)    │
                    └──────────┬───────────────┘
                               │ informs
                    ┌──────────▼───────────────┐
                    │         ROADMAP           │  "What are we doing this quarter?"
                    │   (time-bounded themes)   │
                    └──────────┬───────────────┘
                               │ decomposes into
               ┌───────────────┼───────────────┐
               │               │               │
    ┌──────────▼──────────┐ ┌──▼────────────┐ ┌▼──────────────┐
    │       EPIC          │ │    EPIC       │ │    EPIC       │  "What feature area?"
    │ (feature-bounded)   │ │               │ │               │
    └──────────┬──────────┘ └───────────────┘ └───────────────┘
               │ decomposes into stories
       ┌───────┼───────┐
       │       │       │
    ┌──▼──┐ ┌──▼──┐ ┌──▼──┐                    "What can a user do?"
    │STORY│ │STORY│ │STORY│                    (single user action)
    └──┬──┘ └──┬──┘ └──┬──┘
       │       │       │
   ┌───┴┐  ┌───┴┐  ┌───┴┐                     "How do we build it?"
   │TASK│  │TASK│  │TASK│                     (technical step)
   └────┘  └────┘  └────┘
```

---

## 2. Decision Matrix — "What level should this go in?"

> *Start with the question in the left column. The answer tells you the level.*

| ❓ Ask this question | ✅ If yes → | ❌ If no → | Gut check |
|---------------------|-------------|------------|-----------|
| **Is this a single, enduring statement of our long-term direction?** | **VISION** | Try Roadmap | A vision doesn't have features or timelines — it's a compass. |
| **Is this a time-bounded plan of what we'll build and why?** | **ROADMAP** | Try Epic | A roadmap has quarters/horizons, themes, and key results. |
| **Is this a complete feature area with clear scope boundaries?** | **EPIC** | Try Story | An epic is a coherent feature — "Receipt scanning" not "OCR library integration." |
| **Is this a single user action or goal?** | **STORY** | Try Task or promote to Epic | A story has one verb: "add expense," not "manage expenses." |
| **Is this a technical implementation step?** | **TASK** | This is a story (promote it) | A task has no user-facing value on its own. |

---

## 3. Granularity by Level — Feature-Based Reference

| Level | Answered by | Scope defined by | Decomposed by | Output format | Example |
|-------|-------------|------------------|---------------|---------------|---------|
| **Vision** | "Where are we going?" | The problem space | *Not decomposed* (singular) | One paragraph | "For households who struggle… LIFEY is a household management platform…" |
| **Roadmap** | "What are we building and when?" | Time horizons (Now/Next/Later) | Themes → Epics | One-page table | Q3: Core Expense Management → Auto-split, Receipt Scanning |
| **Epic** | "What feature area are we building?" | **Scope boundary statement** | User Stories | 1-pager per epic | "Receipt scanning — from camera capture to saved expense" |
| **Story** | "What can a user do?" | Single user goal/action | Tasks | Card with AC | "As a member, I want to snap a receipt photo so that…" |
| **Task** | "How do we build it?" | A single PR / concern | *Not decomposed* (leaf node) | Checklist item | "Create POST /api/receipts endpoint" |

---

## 4. Granularity Anti-Patterns — "Does this feel wrong?"

| Symptom | Likely problem | Action |
|---------|---------------|--------|
| An epic has only 2 stories | Might be a story, not an epic | Demote to story (skip epic level) |
| An epic has 20+ stories | Too large — split by feature boundary | Split into 2+ epics |
| A story has 5+ acceptance criteria scenarios | Might be an epic — too many behaviors | Promote to epic or split into multiple stories |
| A story lists multiple verbs ("add, edit, delete, export") | Compound story | Split into one story per verb |
| A task takes 3+ days | Hidden story | Promote to story, add AC |
| A task has no parent story | Orphan — no user value | Assign to a story or remove |
| A story has no acceptance criteria | Not testable | Add Gherkin scenarios before sprint |
| A roadmap item has no key result | Activity, not outcome | Define a measurable outcome |
| An epic has no scope boundary | Scope creep guaranteed | Write a one-sentence boundary statement |

---

## 5. Level Transitions — "When does something change levels?"

| Transition | Trigger | How |
|------------|---------|-----|
| **Idea → Vision** | Foundational insight about the user/problem | Synthesize into vision statement |
| **Vision → Roadmap** | Strategy review (quarterly) | Extract themes from vision pillars |
| **Roadmap → Epic** | Theme is prioritized into "Now" or "Next" | Scope and define the first epic |
| **Epic → Stories** | Epic is "refined" and ready for sprint planning | Decompose by user actions |
| **Story → Tasks** | Sprint planning | Break story into implementation steps |
| **Story → Epic (promotion)** | Story has >5 scenarios or feels too large | Promote to epic, split into sub-stories |
| **Epic → Story (demotion)** | Epic has only 1–2 stories | Collapse into a single story, skip epic level |

---

## 6. Size Reference (T-Shirt)

| Level | XS | S | M | L | XL |
|-------|:--:|:--:|:--:|:--:|:--:|
| **Epic** | Demote to story | 3–5 stories (1–2 sprints) | 5–10 stories (2–4 sprints) | 10–15 stories (4–6 sprints) | Split! (15+ stories) |
| **Story** | — | < 1 day of work | 1–2 days | 2–3 days (maximum) | Split! (>3 days) |
| **Task** | — | < 2 hours | 2–4 hours | 4–8 hours | Promote to story! |

---

## 7. Quick Decision Flowchart (Text)

```
Is it a long-term direction statement, not a plan?
├── YES → VISION
└── NO
    ↓
Is it a time-bounded plan with themes and quarters?
├── YES → ROADMAP
└── NO
    ↓
Is it a complete feature area with a clear scope boundary?
├── YES → EPIC
└── NO
    ↓
Is it a single user action/goal (one verb)?
├── YES → USER STORY
└── NO
    ↓
Is it a technical implementation step?
├── YES → TASK
└── NO → It may not belong in the hierarchy at all, or needs rethinking.
```

---

## 8. Key Principles

1. **Feature-bounded epics, not time-bounded ones.** An epic isn't "4 weeks of work" — it's "the complete Receipt Scanning feature." Size follows scope, not the other way around.

2. **One verb per story.** If you use "and" in the story title, split it. A story is a single user action.

3. **Tasks are leaves.** They are not decomposed further. If a task needs sub-tasks, promote it to a story.

4. **Vision changes slowly.** If your vision changes every sprint, it's not a vision — it's a strategy or a feature list.

5. **Every artifact traces upward.** A task answers "which story?" A story answers "which epic?" An epic answers "which roadmap theme?" A roadmap theme answers "which vision pillar?" If the chain breaks, the work is orphaned.

---

## 9. References

| Level | Rules file (reference) | Template | Output location |
|-------|------------------------|----------|-----------------|
| Vision | `docs/rules/project-management/01-product-vision.md` | `templates/01-product-vision-template.md` | `docs/project-management/01-product-vision.md` |
| Roadmap | `docs/rules/project-management/02-roadmap.md` | `templates/02-roadmap-template.md` | `docs/project-management/02-roadmap.md` |
| Epic | `docs/rules/project-management/03-epics.md` | `templates/03-epic-template.md` | `docs/project-management/03-epics.md` |
| Story | `docs/rules/project-management/04-userstory.md` | `templates/04-userstory-template.md` | `docs/project-management/` (in epics or stories file) |
| Task | `docs/rules/project-management/05-tasks.md` | `templates/05-task-template.md` | `docs/project-management/` (under parent story) |

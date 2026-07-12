# Roadmap

The **strategic plan** that translates the Product Vision into a sequence of initiatives over time. It communicates what the team will build, in what order, and why.

---

## 1. Purpose

The Roadmap connects the long-term **vision** to short-term **execution**. It is:

- **Outcome-oriented** — Organized by themes and goals, not a list of features.
- **Time-bounded** — Grouped by quarters or releases.
- **Living** — Updated monthly/quarterly as new information emerges.
- **Transparent** — Shared with stakeholders, the team, and (optionally) users.

---

## 2. Hierarchy

```
Product Vision
  └── Roadmap (now → next → later)
        ├── Theme: "Onboarding" → Epics → Stories → Tasks
        ├── Theme: "Expense Management" → Epics → Stories → Tasks
        └── Theme: "AI Agent" → Epics → Stories → Tasks
```

---

## 3. Time Horizons

| Horizon | Timeframe | Certainty | Detail Level |
|---------|-----------|-----------|-------------|
| **Now** | This quarter | High | Epics + key stories estimated |
| **Next** | Next quarter | Medium | Themes + epics (not yet detailed) |
| **Later** | 2–4 quarters out | Low | Themes only (placeholder) |

Do **not** assign dates further out than "later." Certainty decreases sharply with time.

---

## 4. Roadmap Elements

| Element | Description | Example |
|---------|-------------|---------|
| **Theme** | A strategic goal or outcome area. | "Make expense tracking effortless." |
| **Epic** | A large body of work within a theme. | "Auto-split recurring bills." |
| **Key Result** | How we measure success. | "Reduce manual split edits by 50%." |
| **Now / Next / Later** | Time allocation. | "Now: auto-split. Next: receipt scanning." |

---

## 5. Roadmap Formats

### 5.1. Structured Frontmatter (Required)

The roadmap data for the diagram lives in the YAML frontmatter under a `phases` key. This is parsed directly — no regex, no body parsing.

```yaml
---
title: "Roadmap — LIFEY"
status: Draft
type: roadmap
quarter: Q3 2026
phases:
  - label: NOW
    quarter: "Q3 2026"
    title: "Foundation & To-Do Lists"
    themes:
      - name: Shared Foundation
        epics:
          - Mobile app shell       # existing epic doc → shows real name
          - User Authentication
          - Household management
      - name: Shared To-Do Lists
        epics:
          - TBD                    # no epic doc yet → shows italic TBD
  - label: NEXT
    quarter: "Q4 2026"
    title: "AI Agent & Expense Tracking"
    themes:
      - name: AI Agent
        epics:
          - TBD
      - name: Expense Tracking
        epics:
          - TBD
  - label: LATER
    quarter: "H1 2027+"
    title: "Chat, Recipes, Groceries & Custom Agents"
    themes:
      - name: Household Chat
        epics:
          - TBD
      - name: Recipe Management
        epics:
          - TBD
      - name: Grocery Integration
        epics:
          - TBD
      - name: Custom Agents
        epics:
          - TBD
      - name: Advanced AI
        epics:
          - TBD
---
```

Rules:
- `label` must be `NOW`, `NEXT`, or `LATER` (case-sensitive — drives CSS color).
- `quarter` is a short string (`"Q3 2026"`, `"H1 2027+"`, etc.).
- `title` is a short human-readable title for the phase.
- Each `theme` has a `name` and an `epics` list.
- Epic names that match an existing epic doc title (case-insensitive) will be cross-referenced automatically — their status dot reflects the epic's status.
- Epic names set to `TBD` render as dimmed italic placeholders.

### 5.2. Body Markdown (Detail View)

The body after the frontmatter is free-form markdown for the detail view. It should stay consistent with the frontmatter but can include descriptions, dependencies, and other context.

```
## NOW — Q3 2026: "Foundation & To-Do Lists"

### Theme: Shared Foundation
*The app exists and we can use it together.*

| Epic | Description | Dependencies |
|------|-------------|-------------|
| Mobile app shell | iOS + Android project, navigation, UI components | — |
| User Authentication | Sign up, log in, profile management | Mobile app shell |
| Household management | Create households, invite members, context switching | User auth |

### Theme: Shared To-Do Lists
*Our first daily-use feature — simple, fast, and immediately useful.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |
```

### 5.3. Theme-Based (Alternative Format Reference)

```
Q3 2026 — "Core Expense Management"
  Epic: Auto-split recurring bills
  Epic: Receipt image capture
  Epic: Expense categories and budgets

Q4 2026 — "Household Collaboration"
  Epic: Shared grocery lists
  Epic: Chore assignment and tracking
  Epic: Household chat / comments

H1 2027 — "AI-Powered Insights"
  Epic: Spending summaries and recommendations
  Epic: AI assistant for household Q&A
```

### 5.4. Outcome-Based
```
Goal: Reduce time spent on expense reconciliation by 80%
  - Integrate bank feed API (Q3)
  - Auto-categorize transactions with ML (Q4)
  - Monthly spending reports via AI agent (Q1 2027)
```

---

## 6. Roadmap Principles

- **Say "no" publicly** — Explicitly state what is not planned to manage expectations.
- **Don't promise dates** — Use quarters, not months, for "Next" and "Later."
- **Keep it short** — One page. If it needs scrolling, trim scope.
- **Update after each sprint** — Review progress and adjust next-quarter items.
- **Link to vision** — Every theme should trace back to a vision pillar.

---

## 7. Anti-Patterns

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| **Gantt chart detail** | Over-specified dates for everything. | Use Now / Next / Later. |
| **Feature dumping ground** | Every idea added without prioritization. | Score each item against vision. |
| **Set in stone** | Never updated; team works from outdated plan. | Review monthly, reprioritize quarterly. |
| **No "why"** | Lists features without rationale. | Always state the outcome or goal. |
| **Too far ahead** | Detailed plan 18 months out. | Keep "Later" vague — themes only. |

---

## 8. Roadmap Review Cadence

| Frequency | Activity |
|-----------|----------|
| **Monthly** | Check progress on "Now" items; adjust scope if needed. |
| **Quarterly** | Move "Next" → "Now"; add/remove themes based on data. |
| **Annually** | Revisit vision alignment; adjust long-term themes. |

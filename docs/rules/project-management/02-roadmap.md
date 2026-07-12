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

### 5.1. Theme-Based (Recommended)
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

### 5.2. Outcome-Based
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

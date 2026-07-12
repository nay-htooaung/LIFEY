---
name: adr-management
description: >-
  Conventions, template, lifecycle, and cross-referencing rules for
  Architecture Decision Records in this project. Use this skill when
  creating, updating, reviewing, or deprecating an ADR.
---

# ADR Management

Architecture Decision Records capture every significant architectural decision with its context, options, rationale, and consequences.

---

## Location

All ADRs live in `docs/adr/` as individual markdown files.

Naming convention: `NNNN-title-with-hyphens.md`

- `NNNN` — 4-digit sequential number (0001, 0002, ...)
- Never re-use or re-number ADRs, even if one is deprecated.

Example: `0001-use-postgresql-for-primary-database.md`

---

## ADR Lifecycle

```
Proposed → Accepted → Deprecated → Superseded
                ↓
            (amendments via new ADR)
```

| Status | Meaning |
|--------|---------|
| **Proposed** | Under discussion, not yet adopted |
| **Accepted** | Approved and currently in effect |
| **Deprecated** | No longer recommended; still in use but should be phased out |
| **Superseded** | Replaced by a newer ADR (specify which) |

---

## Required Frontmatter

Every ADR must start with YAML frontmatter:

```yaml
---
title: Use PostgreSQL as the primary database
status: Accepted
date: 2026-07-12
deciders: [tech-lead, team]
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Human-readable title (not the filename) |
| `status` | Yes | One of: Proposed, Accepted, Deprecated, Superseded |
| `date` | Yes | ISO 8601 date of the decision |
| `deciders` | No | Who made the decision (list of roles/names) |
| `supersedes` | No | ADR number this one replaces (e.g., `0003`) |
| `superseded-by` | No | ADR number that replaces this one |
| `revision` | No | Increment when amending (1, 2, 3...) |

---

## ADR Template

```markdown
---
title: [Title]
status: Proposed
date: [YYYY-MM-DD]
deciders: [who decided]
---

# [ADR-NNNN]: [Title]

## Context

What problem are we solving? What constraints, assumptions, or forces are at play?

## Options

### Option A: [Name]
[Brief description of this option]

### Option B: [Name]
[Brief description of this option]

### Option C: [Name] (if applicable)

## Evaluation

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| [Criterion 1] | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ | ✅ / ⚠️ / ❌ |
| [Criterion 2] | ... | ... | ... |
| Operational cost | ... | ... | ... |
| Team familiarity | ... | ... | ... |

## Decision

**Accepted: Option A**

[Why this option was chosen over the others.]

## Consequences

- **Positive:** What becomes easier or better?
- **Negative:** What becomes harder or more complex?
- **Neutral:** What must the team learn or adopt?

## Compliance

How will we verify this decision is followed? (linting, review gates, automated checks)
```

---

## Cross-Referencing Rules

1. When an ADR **supersedes** another, add these fields to both files:
   - New ADR: `supersedes: 0003`
   - Old ADR: `status: Superseded`, `superseded-by: 0005`
2. An ADR can reference other ADRs inline: `see [ADR-0003](0003-use-postgresql.md)`
3. Never delete an ADR — even deprecated ones serve as historical record.
4. If an ADR needs amendment, create a new ADR that supersedes it rather than editing the original (unless the decision hasn't been implemented yet and the change is minor — then use `revision: 2`).

---

## ADR Review Checklist

Before marking an ADR as Accepted, verify:
- [ ] Context clearly states the problem and constraints
- [ ] At least 2-3 viable options are explored
- [ ] Evaluation criteria are relevant and consistently applied
- [ ] Consequences are identified (positive, negative, neutral)
- [ ] Cross-references are correct (if superseding or being superseded)
- [ ] No contradiction with existing Accepted ADRs — if there is, one must supersede the other

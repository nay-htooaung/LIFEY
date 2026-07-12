---
name: tech-evaluation
description: >-
  Framework for evaluating and selecting technologies, maintaining a tech
  radar, managing tech debt, and planning upgrades or deprecations. Use
  this when making technology stack decisions.
---

# Tech Evaluation

A structured approach to evaluating technologies, building a tech radar, and managing technical debt.

---

## Core Principles

1. **Prefer boring technology.** Choose mature, well-understood technologies unless there's a concrete reason to do otherwise. "Boring" means predictable, well-documented, and easy to hire for.
2. **Every new technology has a cost.** Learning curve, integration effort, operational overhead, hiring difficulty. Factor these into the decision.
3. **Write down the decision.** Every technology choice becomes an ADR. Future teams need to know why something was chosen.
4. **Revisit decisions periodically.** The right choice at the time may not be the right choice two years later. Set a review cadence.

---

## Technology Selection Framework

### Step 1: Define the problem
What concrete problem is this technology solving? Avoid "new shiny" syndrome — if there's no clear problem, there's no decision to make.

### Step 2: Identify options
Research 2-4 viable alternatives. Include:
- The "boring" incumbent/fallback option (even if it's "do nothing")
- 1-2 modern alternatives
- The "stretch" option (something unconventional that might be worth considering)

### Step 3: Define evaluation criteria

| Criterion | Weight | What to assess |
|-----------|--------|----------------|
| **Fit for purpose** | High | Does it solve the problem well? |
| **Maturity** | High | Stable release? Community size? Corporate backing? |
| **Operational cost** | High | Infrastructure cost, maintenance effort, monitoring needs |
| **Team capability** | Medium | Does the team know it? How hard is it to learn/hire for? |
| **Ecosystem** | Medium | Libraries, tools, integrations available |
| **Performance** | Medium | Meets our requirements? Benchmarks? |
| **License** | High | Compatible with our project? Any restrictions? |
| **Migration path** | Medium | How hard is it to switch away later? |

### Step 4: Score and decide

```
Option A                  Option B
──────────────            ──────────────
Fit:       9/10           Fit:       7/10
Maturity:  8/10           Maturity:  9/10
Ops cost:  6/10           Ops cost:  8/10  ← better
Team:      7/10           Team:      5/10  ← worse
...
```

Use a weighted score or simple pro/con table. The recommendation should be clear and justified by the evaluation.

### Step 5: Document as ADR

Write the decision as an ADR in `docs/adr/`. Include the options considered, evaluation, and consequences.

---

## Tech Radar

Maintain a tech radar in `docs/architecture/tech-radar.md` to track the team's stance on technologies.

### Quadrants

| Quadrant | Meaning | Examples |
|----------|---------|----------|
| **Adopt** | Proven, recommended, use by default | PostgreSQL, React, Docker |
| **Trial** | Worth pursuing with low risk — use on a small project first | A new ORM, a new queue system |
| **Assess** | Worth watching — evaluate if an opportunity arises | Emerging technologies |
| **Hold** | Known but not recommended — avoid new usage | Deprecated libraries, past experiments |

### Tech radar format

```markdown
# Tech Radar

Last updated: 2026-07-12

## Adopt
- PostgreSQL — primary database
- Docker — all services
- TypeScript — frontend and backend

## Trial
- Grafana — monitoring dashboard (pilot on staging)

## Assess
- DuckDB — for analytical queries
- Bun — JavaScript runtime alternative

## Hold
- MongoDB — previous project experience showed schema-less caused consistency issues
```

Update the tech radar at least once per quarter or after any significant tech evaluation.

---

## Tech Debt Management

### Classification

| Type | Example | Impact |
|------|---------|--------|
| **Prudent & deliberate** | "We'll hardcode this config now and extract it later" | Short-term speed, known trade-off |
| **Reckless & deliberate** | "We don't need tests" | Certain future pain |
| **Prudent & inadvertent** | "We didn't know the framework would be deprecated" | Unavoidable, learn from it |
| **Reckless & inadvertent** | "We copy-pasted this without understanding it" | Tech debt compound interest |

### Tech debt workflow

1. Identify the debt (during development, review, or incidents)
2. Document it in `docs/architecture/tech-debt.md` with:
   - What the debt is
   - Why it was incurred
   - Estimated effort to fix
   - Impact if not fixed
3. Classify severity: **Critical** (fix within the sprint), **Major** (fix within the quarter), **Minor** (fix when in the area)
4. Schedule repayment as part of regular development (e.g., 20% of each sprint)

### When to accept tech debt

- **Reversible decisions** — If it's easy to fix later, accepting debt may be pragmatic
- **Learning phase** — Early in a project, you don't yet know the right abstraction
- **Time-sensitive delivery** — A deadline that matters more than perfect code
- **Never** — for security, data integrity, or compliance issues

---

## Upgrade & Deprecation Planning

### Upgrade workflow

1. **Identify the upgrade** — new major version of a dependency
2. **Read the changelog** — identify breaking changes
3. **Evaluate impact** — what code/config needs to change?
4. **Test in isolation** — upgrade in a branch/environment, run full test suite
5. **Roll out incrementally** — canary deploy if possible
6. **Document** — any migration steps needed by the team

### Deprecation workflow

1. **Mark as deprecated** in the tech radar and codebase
2. **Communicate** — tell the team: what is deprecated, what to use instead, timeline
3. **Grace period** — keep the old path working with a warning
4. **Remove** — after the grace period, remove the old path
5. **ADR** — document the deprecation decision

### Dependency review cadence

Review all major dependencies quarterly:
1. Is this dependency still actively maintained?
2. Are we on a supported version?
3. Is there a compelling reason to upgrade?
4. Is there a compelling reason to replace it?

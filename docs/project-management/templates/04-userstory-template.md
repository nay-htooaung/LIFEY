---
# ──────────────────────────────────────────────
# User Story — Template
# ──────────────────────────────────────────────
title: "[Short, action-oriented story title]"
status: backlog            # backlog | refined | in_progress | review | done
type: user_story
epic: "[Parent Epic Title]"
story_points:              # Optional: Fibonacci (1, 2, 3, 5, 8, 13)
author: "[Name]"
created: YYYY-MM-DD
invest:
  independent: true
  negotiable: true
  valuable: true
  estimable: true
  small: true
  testable: true
---

> **Instructions:** Replace all `[bracketed]` placeholders with your content.
> The completed file should be saved under `docs/project-management/` in the epics registry or as a separate stories document.

---

# [Story Title]

## 1. User Story

```text
As a [role],
I want [goal / action]
so that [benefit / reason].
```

### ✅ Example

```text
As a household member,
I want to set up a recurring bill template with the amount, frequency, and assigned members
so that the system automatically splits the bill on each due date without manual re-entry.
```

---

## 2. Acceptance Criteria

> *Gherkin-style (Given / When / Then). Each scenario tests one behavior.*

### Scenario: [Happy path — scenario name]

```gherkin
Given [precondition]
When  [action]
Then  [expected result]
```

### Scenario: [Edge case — scenario name]

```gherkin
Given [precondition]
When  [action]
Then  [expected result]
```

### Scenario: [Error path — scenario name]

```gherkin
Given [precondition]
When  [action]
Then  [expected result]
```

### ✅ Example

#### Scenario: Successful bill template creation

```gherkin
Given I am logged in as a household member with "admin" role
When I create a recurring bill template for "$100 monthly rent" split evenly among 3 members
Then the template is saved with recurring schedule "monthly"
And each member's share is calculated as "$33.33"
And a confirmation message is shown
```

#### Scenario: Edit pending auto-split before due date

```gherkin
Given I have a recurring bill template with a pending auto-split due in 3 days
When I edit the split percentages
Then the updated split is recalculated
And all members are notified of the change
```

#### Scenario: Invalid amount entered

```gherkin
Given I am on the "create recurring bill" form
When I enter an amount of "$0"
Then I see a validation error "Amount must be greater than $0"
And the form is not submitted
```

---

## 3. INVEST Checklist

> *Validate the story against INVEST before promoting it to sprint-ready.*

| Letter | Criterion | Check |
|--------|-----------|:-----:|
| **I** | **Independent** — Can this story be built, tested, and shipped in any order? | ☐ |
| **N** | **Negotiable** — Are details open to change through conversation (not a rigid spec)? | ☐ |
| **V** | **Valuable** — Does it deliver concrete value to an end-user? | ☐ |
| **E** | **Estimable** — Can the team roughly estimate effort? | ☐ |
| **S** | **Small** — Can one developer complete it in 2–3 days? | ☐ |
| **T** | **Testable** — Are there clear acceptance criteria that can be verified? | ☐ |

### ✅ Example (filled)

| Letter | Criterion | Check |
|--------|-----------|:-----:|
| **I** | Independent — Can this story be built, tested, and shipped in any order? | ✅ |
| **N** | Negotiable — Are details open to change? | ✅ |
| **V** | Valuable — Does it deliver concrete value to an end-user? | ✅ |
| **E** | Estimable — Can the team roughly estimate effort? | ✅ |
| **S** | Small — Can one developer complete it in 2–3 days? | ✅ |
| **T** | Testable — Are there clear acceptance criteria? | ✅ |

---

## 4. Definition of Ready (DoR) vs. Done (DoD)

### DoR — Ready for Sprint

- [ ] Clear title & description
- [ ] Acceptance criteria written (Gherkin)
- [ ] Estimated by the team (story points or t-shirt)
- [ ] Attached to a parent epic
- [ ] Dependencies identified and resolved
- [ ] INVEST-compliant (all checked above)

### DoD — Ready for Release

- [ ] Code merged to main
- [ ] Tests pass (unit + integration)
- [ ] Peer-reviewed
- [ ] Deployed to staging
- [ ] Acceptance criteria verified by QA
- [ ] No P0/P1 bugs

---

## 5. Notes / Conversation Log

> *Capture decisions made during refinement conversations — not a spec, just key outcomes.*

- **[Date]:** [Decision or clarification]
- **[Date]:** [Decision or clarification]

---

## 6. Technical Tasks

> *Filled in during sprint planning. These are the tasks that decompose this story.*

- [ ] [Task 1 — e.g., Create DB migration for recurring bills table]
- [ ] [Task 2 — e.g., Implement POST /api/recurring-bills]
- [ ] [Task 3 — e.g., Build frontend form for bill template]

---

## 7. Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

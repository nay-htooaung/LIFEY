---
title: "[Short, action-oriented story title]"
status: Draft
type: user_story
epic: "[Parent Epic Title — must match an epic doc's title exactly]"
story_number: STxxxx
---

> **Instructions:** Replace all `[bracketed]` placeholders with your content.
> The completed file should be saved as `docs/project-management/04-story/EPxxxx-STxxxx-<short-kebab-slug>.md`.
> Story numbering: ST prefix, zero-padded to 4 digits, restarts from ST0001 per epic.

---

## Story

**As a** [role],  
**I want** [goal / action],  
**so that** [benefit / reason].

### ✅ Example

```text
As a household member,
I want to set up a recurring bill template with the amount, frequency, and assigned members
so that the system automatically splits the bill on each due date without manual re-entry.
```

---

## Acceptance Criteria

> *Gherkin-style (Given / When / Then). Each scenario tests one behavior. Number each AC with `@AC-NNN` for test traceability.*

### Scenario: [Happy path — scenario name]

```gherkin
@AC-001
Given [precondition]
When  [action]
Then  [expected result]
```

### Scenario: [Edge case — scenario name]

```gherkin
@AC-002
Given [precondition]
When  [action]
Then  [expected result]
```

### Scenario: [Error path — scenario name]

```gherkin
@AC-003
Given [precondition]
When  [action]
Then  [expected result]
```

### ✅ Example: Successful bill template creation

```gherkin
@AC-001
Given I am logged in as a household member with "admin" role
When I create a recurring bill template for "$100 monthly rent" split evenly among 3 members
Then the template is saved with recurring schedule "monthly"
And each member's share is calculated as "$33.33"
And a confirmation message is shown
```

### ✅ Example: Invalid amount entered

```gherkin
@AC-002
Given I am on the "create recurring bill" form
When I enter an amount of "$0"
Then I see a validation error "Amount must be greater than $0"
And the form is not submitted
```

---

## INVEST Checklist

- [ ] **I**ndependent — can be developed, tested, and shipped in any order
- [ ] **N**egotiable — details are open to change through conversation
- [ ] **V**aluable — delivers concrete value to the end-user or business
- [ ] **E**stimable — the team can roughly estimate effort
- [ ] **S**mall — fits within one sprint (ideally 2–3 days of work)
- [ ] **T**estable — has clear acceptance criteria that can be verified

**Size:** [XS / S / M / L]

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

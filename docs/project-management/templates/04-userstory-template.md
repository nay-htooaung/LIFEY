---
title: "[Short, action-oriented story title]"
status: Draft
type: user_story
epic: "[Parent Epic Title — must match an epic doc's title exactly]"
---

> **Instructions:** Replace all `[bracketed]` placeholders with your content.
> The completed file should be saved as `docs/project-management/XX-story-your-story-name.md`.

---

# [Story Title]

## User Story

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

## Acceptance Criteria

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

### ✅ Example: Successful bill template creation

```gherkin
Given I am logged in as a household member with "admin" role
When I create a recurring bill template for "$100 monthly rent" split evenly among 3 members
Then the template is saved with recurring schedule "monthly"
And each member's share is calculated as "$33.33"
And a confirmation message is shown
```

### ✅ Example: Edit pending auto-split before due date

```gherkin
Given I have a recurring bill template with a pending auto-split due in 3 days
When I edit the split percentages
Then the updated split is recalculated
And all members are notified of the change
```

### ✅ Example: Invalid amount entered

```gherkin
Given I am on the "create recurring bill" form
When I enter an amount of "$0"
Then I see a validation error "Amount must be greater than $0"
And the form is not submitted
```

---

## Definition of Ready (DoR) — Ready for Sprint

- [ ] Clear title & description
- [ ] Acceptance criteria written (Gherkin)
- [ ] Estimated by the team (story points or t-shirt)
- [ ] Attached to a parent epic via `epic` field
- [ ] Title matches a [[Wiki Link]] in the parent epic
- [ ] Dependencies identified and resolved

## Definition of Done (DoD) — Ready for Release

- [ ] Code merged to main
- [ ] Tests pass (unit + integration)
- [ ] Peer-reviewed
- [ ] Deployed to staging
- [ ] Acceptance criteria verified by QA
- [ ] No P0/P1 bugs

---

## Revision History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| YYYY-MM-DD | 1.0 | [Name] | Initial draft |

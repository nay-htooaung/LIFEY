# User Story — Manager Prompt

This document defines the **user story** concept, its boundaries, usage, rules, and modern best practices. Use this as a reference when writing, reviewing, or splitting user stories in an Agile workflow.

---

## 1. Definition

A **user story** is the smallest unit of work in an Agile framework. It describes a feature from the end-user's perspective with the sole goal of delivering value to the user. It is **not** a requirements document — it is a placeholder for a conversation.

### Standard Template
```
As a <role>,
I want <goal>
so that <reason / benefit>.
```

### Example
> As a household member, I want to split an expense with my roommate so that we each pay our fair share.

---

## 2. The 3 C's (Boundaries)

A user story is defined by three elements:

| C | What it means | Guardrail |
|---|---------------|-----------|
| **Card** | A written placeholder (brief description + acceptance criteria). | Keep it short — 1–3 sentences. |
| **Conversation** | The real requirements emerge through discussion with stakeholders, developers, and testers. | Don't over-detail the card; details live in conversation. |
| **Confirmation** | Acceptance criteria define when the story is "done." | Write clear, testable conditions of satisfaction. |

### Boundaries — What a user story is NOT
- **Not a spec** — It does not contain technical details, UI mockups, or implementation steps.
- **Not a task** — Tasks are the decomposition of a story (e.g., "create DB migration", "add API endpoint").
- **Not an epic** — Epics are large bodies of work that are broken into multiple stories.
- **Not a bug report** — Bugs are defects; stories are new value.

---

## 3. INVEST Principle (Quality Criteria)

Every well-formed user story should be:

| Letter | Meaning | How to check |
|--------|---------|-------------|
| **I** | **Independent** — Can be developed, tested, and shipped in any order. | If story A blocks story B, split or reorder. |
| **N** | **Negotiable** — Details are not locked in; open to change through conversation. | If it reads like a legal contract, it's too rigid. |
| **V** | **Valuable** — Delivers concrete value to the end-user or business. | If it only benefits developers, it's a task, not a story. |
| **E** | **Estimable** — The team can roughly estimate effort. | If it's too vague or too large, split it. |
| **S** | **Small** — Fits within one sprint (ideally 2–3 days of work). | If it takes more than a few days, decompose further. |
| **T** | **Testable** — Has clear acceptance criteria that can be verified. | If you can't write a test for it, it's not done. |

---

## 4. Usage in the Workflow

### Where user stories fit

```
Product Vision
  └── Roadmap
        └── Epics (large initiatives)
              └── User Stories (sprint-ready)
                    └── Tasks (technical breakdown)
```

### Lifecycle

1. **Backlog** — Raw ideas, unrefined.
2. **Refined** — Acceptance criteria added; estimated; INVEST-compliant.
3. **Sprint Planning** — Committed to the upcoming sprint.
4. **In Progress** — Being implemented (developer + QA pairing).
5. **Review** — Demo to stakeholders; acceptance criteria verified.
6. **Done** — Meets Definition of Done (DoD); deployed.

### Writing tips
- Write from the **user's perspective**, not the system's.
  - ❌ "The API returns 404 if the expense is not found."
  - ✅ "As a user, I want to see a helpful error when I try to view a missing expense."
- Keep one **verb per story** ("I want to add", "I want to delete") — not a list of verbs.
- Include **edge cases** in acceptance criteria, not in the title.

---

## 5. Splitting Large Stories (Epic → Stories)

When a story is too large (not **S**mall or not **E**stimable), split it using:

| Strategy | Example |
|----------|---------|
| **By workflow step** | "Add expense" → "Enter amount" → "Select category" → "Confirm" |
| **By CRUD operation** | "Manage recipes" → "Create recipe" / "Edit recipe" / "Delete recipe" |
| **By user role** | "Household admin can delete members" / "Member can leave household" |
| **By data boundary** | "Desktop view" / "Mobile view" |
| **By happy vs. error path** | "Successful login" / "Login with wrong password" |
| **By business rule** | "Basic expense split" / "Uneven split with custom percentages" |

### Rule of thumb
If a story cannot be completed in **2–3 days** by one developer, split it.

---

## 6. Acceptance Criteria (Confirmation)

AC defines the **boundary** of a user story — what is in scope and what is out of scope.

### Format (Gherkin-style)
```gherkin
Given <precondition>
When  <action>
Then  <expected result>
```

### Example:
```
Given I am logged in as a household member
When I add an expense of $50 split evenly with my roommate
Then each person's share shows as $25
And my balance is updated by -$25
```

### Rules:
- Each AC must be **independently testable**.
- Avoid testing internal implementation (test behavior, not code).
- Include **negative cases**: error messages, validation, edge values.

---

## 7. Modern Best Practices

### 7.1. Outcomes over Outputs
Focus on the **value delivered**, not the number of stories completed. Ask: "Will this story change user behavior?"

### 7.2. Story Mapping
Use **User Story Mapping** (Jeff Patton) to arrange stories on two axes:
- **Horizontal**: user activities (walkthrough steps)
- **Vertical**: priority (MVP → future iterations)

This prevents building features nobody uses.

### 7.3. Just-in-Time Refinement
Do not write all acceptance criteria upfront. Refine stories **2–3 days before sprint planning** — just enough to estimate and commit.

### 7.4. Include Non-Functional Requirements as Constraints
Instead of a separate "performance story," attach constraints as acceptance criteria:
```
Given the household has 10,000 expenses
When I load the expense list
Then the page renders within 2 seconds
```

### 7.5. Vertical Slicing
Each story should cut across all layers (UI → API → DB), delivering a complete, usable feature slice — not a horizontal layer (e.g., "design the database schema" is not a user story).

### 7.6. Continuous Backlog Grooming
- Dedicate **10% of sprint capacity** to backlog refinement.
- Remove stories that no longer align with product vision.
- Regularly re-estimate and re-prioritize.

### 7.7. Definition of Ready (DoR) vs. Definition of Done (DoD)

| DoR (Ready for Sprint) | DoD (Ready for Release) |
|------------------------|------------------------|
| Clear title & description | Code merged |
| Acceptance criteria written | Tests pass (unit + integration) |
| Estimated by the team | Peer-reviewed |
| Attached to a sprint goal | Deployed to staging |
| Dependencies identified | Documentation (if applicable) |

---

## 8. Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| **Zombie story** | Story sits in backlog for months without conversation. | Remove or re-prioritize. |
| **Waterfall story** | Over-detailed spec disguised as a story. | Keep it short; let conversation fill gaps. |
| **Compound story** | "As a user, I can add, edit, delete, and export expenses." | Split into 4 separate stories. |
| **Task-as-story** | "As a developer, I want to set up the database." | No user value. Make it a task under a real story. |
| **No AC** | Story without confirmation criteria is not testable. | Always write at least one Given/When/Then. |

---

## 9. Quick Reference Checklist

Use this before promoting a story to sprint-ready:

- [ ] Follows the "As a… I want… so that…" template
- [ ] Delivers value to an end-user (not the system)
- [ ] Fits in one sprint (2–3 days work)
- [ ] Acceptance criteria written (Given/When/Then)
- [ ] INVEST-compliant (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- [ ] Dependencies identified and resolved
- [ ] Team has estimated it (story points or t-shirt sizing)
- [ ] No technical implementation details in the description
- [ ] Sliced vertically (touches UI + API + DB if applicable)
- [ ] Non-functional constraints captured in AC

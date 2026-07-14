# User Story — Manager Prompt

This document defines the **user story** concept, its boundaries, usage, rules, and modern best practices. Use this as a reference when writing, reviewing, or splitting user stories in an Agile workflow.

---

## 0. Naming Convention

Every story gets a unique identifier `STxxxx` within its parent epic (e.g., `ST0001`, `ST0002`).

### File name
```
EPxxxx-STxxxx-<short-kebab-slug>.md
```

### Frontmatter
The `story_number` field is **required** in YAML frontmatter:
```yaml
title: "Sign Up with Invite Code and Magic Link"
status: Draft
type: user_story
epic: "User Authentication"
story_number: ST0001
```

### Numbering rules
- `ST` prefix, zero-padded to 4 digits.
- Numbers restart from `ST0001` per epic (e.g., EP0001 has ST0001–ST0004, EP0002 has ST0001–ST0004).
- The full identifier `EPxxxx-STxxxx` is globally unique.
- A story's `epic` field (in frontmatter) must match the parent epic's `title` field exactly.

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
- **Not a task** — Stories are user-facing; avoid stories written from the implementer's perspective (e.g., "create DB migration", "add API endpoint").
- **Not an epic** — Epics are large bodies of work that are broken into multiple stories.
- **Not a bug report** — Bugs are defects; stories are new value.

---

## 3. INVEST Principle (Quality Criteria)

Every well-formed user story should be:

| Letter | Meaning | How to check |
|--------|---------|-------------|
| **I** | **Independent** — Can be developed, tested, and shipped in any order. | If story A blocks story B, split or reorder. |
| **N** | **Negotiable** — Details are not locked in; open to change through conversation. | If it reads like a legal contract, it's too rigid. |
| **V** | **Valuable** — Delivers concrete value to the end-user or business. | If it only benefits developers, it's not a story. |
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

## 7. Acceptance Criteria Numbering & Traceability

Every acceptance criterion must have a unique ID so that E2E / scenario tests can be linked back to a specific criterion, and a script can verify that each criterion has a corresponding test.

### 7.1. AC ID Format

- **Format:** `AC-NNN` (zero-padded to 3 digits).
- **Scope:** IDs are sequential within a single story (starting from `AC-001`).
- **Globally unique path:** The combination `<story-id>/AC-NNN` (e.g., `EP0002-ST0001/AC-003`) is globally unique.
- **Placement:** Add `@AC-NNN` as the first line of each Gherkin scenario inside the ` ```gherkin ` block.

### 7.2. Test Exemption

Some criteria cannot be automated due to platform constraints, third-party dependencies, or hardware requirements. Mark them with:

- **`@TestExempt`** — placed after the AC ID tag on the same line.
- **`# ExemptReason: <explanation>`** — on the next line, documents why.

```
@AC-003 @TestExempt
# ExemptReason: Push notification permission prompts cannot be automated on mobile CI runners
Given push notification permissions are denied
When the system tries to send a notification
Then the failure is silently logged
```

### 7.3. Example in a story

```markdown
## Acceptance Criteria

```gherkin
@AC-001
Given I am in my personal household
When I create a task item
Then I am automatically assigned as the owner

@AC-002
Given I am in a shared household
When I create a task item
Then the item starts unassigned (no assignee)

@AC-003 @TestExempt
# ExemptReason: Push notification prompts require real device or OS-level mocking not available in CI
Given push notification permissions are denied
When the system tries to send a notification
Then the failure is silently logged
```
```

### 7.4. Script Traceability

A verification script can:

1. **Parse stories** — Extract all `@AC-NNN` tags from Gherkin blocks in story files. Record: story ID, AC ID, whether `@TestExempt` is present.
2. **Parse tests** — Search test files for AC references (e.g., `AC-001` in test titles or `// @AC-001` comments).
3. **Cross-reference** — Report:
   - ACs without a matching test (missing coverage)
   - Tests that reference a non-existent AC (orphaned test)
   - Test-exempt ACs (expected to have no test)

**Reference patterns for test files:**
```
// In Playwright / Vitest:
test('@AC-001: Task item automatically assigned in personal household', ...)
test('AC-002 — Assignee picker in shared household', ...)

// Or in a test metadata comment:
// Covers: @AC-001, @AC-002
```

### 7.5. Validation

The documentation build script (`build-docs.js`) will validate:
- AC IDs are sequential within each story (no gaps, no skips).
- No duplicate `@AC-NNN` values within the same story.
- `@TestExempt` tags are accompanied by an `# ExemptReason:` comment.
- The total AC count is reported in the validation dashboard.

---

## 8. Modern Best Practices

### 8.1. Outcomes over Outputs
Focus on the **value delivered**, not the number of stories completed. Ask: "Will this story change user behavior?"

### 8.2. Story Mapping
Use **User Story Mapping** (Jeff Patton) to arrange stories on two axes:
- **Horizontal**: user activities (walkthrough steps)
- **Vertical**: priority (MVP → future iterations)

This prevents building features nobody uses.

### 8.3. Just-in-Time Refinement
Do not write all acceptance criteria upfront. Refine stories **2–3 days before sprint planning** — just enough to estimate and commit.

### 8.4. Include Non-Functional Requirements as Constraints
Instead of a separate "performance story," attach constraints as acceptance criteria:
```
Given the household has 10,000 expenses
When I load the expense list
Then the page renders within 2 seconds
```

### 8.5. Vertical Slicing
Each story should cut across all layers (UI → API → DB), delivering a complete, usable feature slice — not a horizontal layer (e.g., "design the database schema" is not a user story).

### 8.6. Continuous Backlog Grooming
- Dedicate **10% of sprint capacity** to backlog refinement.
- Remove stories that no longer align with product vision.
- Regularly re-estimate and re-prioritize.

### 8.7. Definition of Ready (DoR) vs. Definition of Done (DoD)

| DoR (Ready for Sprint) | DoD (Ready for Release) |
|------------------------|------------------------|
| Clear title & description | Code merged |
| Acceptance criteria written | Tests pass (unit + integration) |
| Estimated by the team | Peer-reviewed |
| Attached to a sprint goal | Deployed to staging |
| Dependencies identified | Documentation (if applicable) |

---

## 9. Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | Fix |
|-------------|-------------|-----|
| **Zombie story** | Story sits in backlog for months without conversation. | Remove or re-prioritize. |
| **Waterfall story** | Over-detailed spec disguised as a story. | Keep it short; let conversation fill gaps. |
| **Compound story** | "As a user, I can add, edit, delete, and export expenses." | Split into 4 separate stories. |
| **Developer story** | "As a developer, I want to set up the database." | No user value. Rewrite from the user's perspective or scope it as technical work under a real story. |
| **No AC** | Story without confirmation criteria is not testable. | Always write at least one Given/When/Then. |

---

## 10. Quick Reference Checklist

Use this before promoting a story to sprint-ready:

- [ ] Follows the "As a… I want… so that…" template
- [ ] Delivers value to an end-user (not the system)
- [ ] Fits in one sprint (2–3 days work)
- [ ] Acceptance criteria written and numbered (@AC-NNN)
- [ ] Test-exempt criteria documented with @TestExempt + ExemptReason
- [ ] Acceptance criteria written (Given/When/Then)
- [ ] INVEST-compliant (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- [ ] Dependencies identified and resolved
- [ ] Team has estimated it (story points or t-shirt sizing)
- [ ] No technical implementation details in the description
- [ ] Sliced vertically (touches UI + API + DB if applicable)
- [ ] Non-functional constraints captured in AC

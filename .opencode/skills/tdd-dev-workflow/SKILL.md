---
name: tdd-dev-workflow
description: >-
  Repeatable TDD workflow for implementing user stories. Defines the RED → GREEN → REFACTOR
  cycle, test mapping conventions, commit/branch format, and the completion checklist. Use
  this skill when implementing a story from the project management hierarchy.
---

# TDD Dev Workflow

This skill defines the repeatable TDD cycle for implementing user stories one acceptance
criterion at a time. It is **instructional** — it tells you the rules and the structure,
but does not include code examples. For concrete patterns, follow the existing codebase.

---

## TDD Contract

The fundamental rule: **write the test first, then the implementation, then refactor.**

```
For each acceptance criterion (@AC-NNN):
  1. RED   — Write a single failing test that proves the AC
  2. GREEN — Write the minimal implementation to pass
  3. REFACTOR — Clean up without changing behavior
```

Rules:
- Never write implementation code before the test for that AC exists and fails.
- Never commit code with failing tests except in a `red:` commit (where the test itself
  is the only change).
- One AC per RED → GREEN → REFACTOR cycle. Do not batch multiple ACs.
- After each GREEN phase, demo the passing test to the user before proceeding.

### Before implementing UI components

Before writing any frontend code, check existing Brilliant designs:
1. Call `init` on the `Lifey` canvas (`docs/design/Lifey.design`)
2. Look up relevant screen frames by name (e.g. "Welcome Screen", "Sign Up Screen")
3. Export or blueprint the design to get exact layout, colors, spacing, typography
4. Implement the React component to match the design faithfully
5. If the screen doesn't exist yet, flag to the user — don't guess the design

---

## Test Mapping Convention — Traceability Chain

Tests must be traceable through the full hierarchy:

```
Epic (EP0004)  →  Story (ST0001)  →  ACs (@AC-001, @AC-002, ...)  →  Test functions
```

This chain enables the validation tool (`scripts/validate-tests.js`) to validate coverage
at any level — run it with `mise vts`, `mise vte`, or `mise vta`.

### File Naming — Story-to-File Mapping

Test files **must** include the epic and story reference in the filename:

```
EP<EP_NUMBER>_ST<STORY_NUMBER>_<short-description>.<ext>
```

| Component | Format | Example |
|-----------|--------|---------|
| Epic ref | `EP0004` | |
| Story ref | `ST0001` | |
| Separator | Underscores, not hyphens | `EP0004_ST0001` |
| Description | Snake_case of the story title | `create_and_manage_task_lists` |
| Extension | `.test.*` or `.spec.*` | `.test.py`, `.spec.ts`, `.test.js` |

Full example: `EP0004_ST0001_create_and_manage_task_lists.test.py`

### File Header — Story Identification

The first comment block of every test file must identify the story:

```
# Story: EP0004-ST0001 — Create and Manage Task Lists
```

This is used by validation tooling and human readers alike.

### Function Naming — AC-to-Test Mapping

Each Gherkin acceptance criterion maps to exactly one test function.

| Gherkin tag | Test function name |
|-------------|-------------------|
| `@AC-001` | `test_ac_001_short_description` |
| `@AC-002` | `test_ac_002_short_description` |

The AC number (`001`, `002`, ...) must appear in the function name immediately
after `test_ac_` so that the validation script can parse it automatically.

### Recommended Directory Layout

Organize tests to mirror the epic structure for larger projects:

```
backend/tests/
  epics/
    EP0004/
      EP0004_ST0001_create_and_manage_task_lists.test.py
      EP0004_ST0002_add_complete_and_manage_task_items.test.py
    EP0005/
      ...

frontend/src/
  __tests__/
    EP0004_ST0001_create_and_manage_task_lists.test.tsx
    EP0004_ST0002_add_complete_and_manage_task_items.test.tsx
```

Flat layouts (all tests in a single `tests/` directory) are also valid as long
as the file naming convention is followed.

### Validation

The validation tool (`scripts/validate-tests.js`) uses these conventions to:
1. Scan test files matching `EP*_ST*_*` patterns
2. Parse `test_ac_NNN_*` function names to determine AC coverage
3. Cross-reference against expected ACs from the story `.md` files
4. Report missing tests, uncovered ACs, and overall coverage per epic

Run it with the mise task aliases (mise tasks auto-resolve relative to project root):

```bash
mise vts -- EP0004-ST0001       # validate one story
mise vte -- EP0004              # validate an entire epic
mise vta                        # validate all stories across all epics
mise vta -- --json              # machine-readable JSON output
```

### Consistency Rules

- Every story must have at least one test file matching its ref.
- Every `@AC-*` in the story must have a corresponding `test_ac_NNN_*` function.
- A test function should validate exactly one AC — not multiple.
- When the codebase uses multiple languages, apply the same naming convention
  across all test files regardless of language.

---

## Commit Convention

```
<story-ref> <phase>: <message>
```

| Component | Rule |
|-----------|------|
| Story ref | `[EP0004-ST0001]` — bracket-enclosed, matches the story identifier |
| Phase | One of: `red:` / `green:` / `refactor:` / `chore:` |
| Message | Imperative mood, lowercase, ≤ 72 characters |

Examples:
- `[EP0004-ST0001] red: test AC-001 create list`
- `[EP0004-ST0001] green: implement AC-001 create list endpoint`
- `[EP0004-ST0001] refactor: extract list service`

Semantics:
- `red:` commits contain **only** test code (failing by design).
- `green:` commits contain test + implementation (passing).
- `refactor:` commits change structure, not behavior (tests stay green).
- `chore:` commits for tooling, config, or non-functional changes.

---

## Branch Convention

```
story/EP0004-ST0001-short-descriptive-name
```

- One branch per story. Branch from `main` (or the current development branch).
- Never merge a branch without passing all gates: full suite, linter, type checker,
  and review approval.

---

## Completion Checklist

Before signalling that a story is ready to merge, verify every item:

- [ ] All acceptance criteria (`@AC-*`) are covered by passing tests
- [ ] Full test suite passes — not just the story's tests, but the entire project
- [ ] Linter reports zero errors using the project's configured linter
- [ ] Type checker passes at the project's configured strictness level
- [ ] Code follows project-wide conventions — naming, structure, formatting,
      error handling patterns as observed in existing code
- [ ] No `TODO`, `FIXME`, or `HACK` comments remain in new or modified code
- [ ] Config files were only modified with tech-lead confirmation
- [ ] User has seen the demo and approved each AC after its GREEN phase
- [ ] Review agent has validated against ADRs, conventions, and ACs
- [ ] Review report is attached for the user
- [ ] Branch is pushed and ready for user merge

---

## Code Standards Reference

This skill does not define independent code standards. Instead, the project's standards
are discovered from the codebase itself:

- **Naming:** Follow the casing, prefix, and naming patterns already used in existing
  modules.
- **Structure:** Mirror the directory layout, file grouping, and module organization
  already in place.
- **Formatting:** The project's configured formatter (prettier, ruff, etc.) is
  authoritative — do not override or fight it.
- **Error handling:** Match the error patterns used in existing code (return types,
  exception hierarchy, error response shape).
- **Testing infrastructure:** Use the same test utilities, fixtures, factories, and
  helper patterns already present in the test suite.
- **Imports:** Follow the import ordering and grouping conventions of the existing
  codebase (stdlib → third-party → local).

When no precedent exists for something new, flag it to the user rather than guessing.
When precedents conflict, ask the user which to follow.

---

## Subagent Collaboration Points

| Situation | Action |
|-----------|--------|
| Architectural decision missing | Pause → delegate to `tech-lead` via `task` → wait for ADR → confirm with user |
| Config file modification needed | Pause → propose to `tech-lead` → wait for confirmation before editing |
| Screen design missing on Brilliant canvas | Flag to user — ask if frontend-designer should create the design first |
| Pre-merge review | Delegate to `review-agent` via `task` — provide story ref and branch name |

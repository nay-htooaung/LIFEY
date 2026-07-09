# TST-<NNN>: <Design Title> — Test Matrix

**Linked to:** `DSN-<NNN>` | **Spec:** `SPEC-<N>`

Test cases are numbered `TC-XXX` uniquely within this file. When referencing from outside, use the qualified form `TST-<N>:TC-XXX`.

## 1. Test Case Overview

| TC ID | Use Case | Area | Type | Description |
|-------|----------|------|------|-------------|
| TC-001 | SPEC-<N>:US-001 | Backend | Unit | ... |
| TC-002 | SPEC-<N>:US-001 | Backend | Integration | ... |
| TC-003 | SPEC-<N>:US-002 | Frontend | Component | ... |

## 2. Backend Test Cases

### TC-001: <title> (SPEC-<N>:US-001)
- **Type:** Unit / Integration
- **Given:** precondition
- **When:** action
- **Then:** expected result / assertion
- **Mock:** what to mock (if any)

## 3. Frontend Test Cases

### TC-003: <title> (SPEC-<N>:US-002)
- **Type:** Component / Hook / E2E
- **Given:** initial state
- **When:** user interaction
- **Then:** expected UI state / API call
- **Mock:** MSW handler for which endpoint

## 4. Coverage Notes
- Which lines/branches are intentionally not covered and why.
- Any manual testing scenarios.

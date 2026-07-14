---
title: "AI Agent Integration Interface"
status: Draft
type: user_story
epic: "Shared To-Do Lists"
story_number: ST0007
---

## Story

**As** an AI agent (future),
**I want** a documented API to create, read, update, complete, and assign task items,
**so that** I can help users manage their to-do lists through natural-language conversation.

---

## Acceptance Criteria

```gherkin
@AC-001
Given the AI agent service exists (future)
When it calls POST /agents/task-items with a title and list ID
Then a new task item is created in the specified list
And the response includes the new item's ID

@AC-002
Given the AI agent service calls GET /agents/task-items?list_id={id}
When the list exists and the user has access
Then the response returns all items in that list

@AC-003
Given the AI agent service calls PATCH /agents/task-items/{id}
When the payload includes status: "completed"
Then the task item is marked as complete
And the response includes the updated item

@AC-004
Given the AI agent service calls POST /agents/task-items/{id}/assign
When the payload includes a valid profile_id
Then that member is assigned to the task item

@AC-005
Given the AI agent service makes a request without a valid user context
When the endpoint evaluates the token
Then the request is rejected with 401 Unauthorized

@AC-006
Given the AI agent service tries to access a task in a household it doesn't belong to
When the endpoint evaluates RLS
Then the request is rejected with 403 Forbidden
```

---

## Technical Notes

This story defines the API contract for the future AI agent service (Q4 2026). The endpoints listed here are **not built now** — instead, the story ensures the data model and RLS policies support this interface. When the AI service is implemented, it connects directly to the same PostgreSQL database (not through the REST API), so these endpoints may be internal gRPC or database functions rather than HTTP endpoints.

---

## INVEST Checklist

- ✅ **I**ndependent — no code needed now, just documentation
- ✅ **N**egotiable — exact protocol (REST vs gRPC vs DB functions) deferred
- ✅ **V**aluable — ensures future AI integration doesn't require a data model refactor
- ✅ **E**stimable — well-bounded (documentation + interface spec)
- ✅ **S**mall — fits in one sprint (mostly docs + optional validation endpoints)
- ✅ **T**estable — API contract can be verified with contract tests

**Size:** S

# SPEC-006: AI Agent Chat

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. The entire agent subsystem (chat proxy, MCP tools, agent config, conversation history) forms a single domain.

## 2. The 5W1H Intent
- **Who:** Any household member.
- **What:** Chat with an AI assistant that can answer questions and perform actions across all household domains (expenses, todos, groceries, recipes) via natural language — powered by OpenCode SDK + embedded MCP server.
- **Where:** Frontend (`/agent` module) ↔ Backend (`/api/v1/agent/*`) ↔ OpenCode SDK → OpenCode Zen (external LLM). MCP server runs embedded in the same Python process.
- **When:** On demand — asking questions, issuing commands, reviewing household data.
- **Why:** To provide a natural-language interface to the entire household management system — reducing clicks and making data access as simple as asking a question.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: Chat interface (send, receive, stream)
- **Given** a logged-in household member on the agent chat page,
- **When** the user types a message and presses Enter or clicks Send,
- **Then** the message appears in the chat as a user bubble, a loading indicator is shown, and the agent's response streams into the view token-by-token.
- **Given** an active agent response is streaming,
- **When** the user sends a new message or navigates away,
- **Then** the stream is cancelled gracefully (no orphaned state).

### US-002: Chat proxy endpoint (backend)
- **Given** a logged-in household member,
- **When** the frontend calls `POST /api/v1/agent/chat` with `{ message, agent_id, conversation_id? }`,
- **Then** the backend validates the request, loads the agent configuration and conversation history, calls OpenCode SDK with the system prompt, and streams the response as chunked JSON lines.
- **Given** the OpenCode SDK call fails (network, auth, timeout),
- **Then** the backend returns a structured error within the stream and the UI displays a user-friendly error message.

### US-003: Conversation persistence
- **Given** a logged-in household member,
- **When** the user sends messages in a conversation,
- **Then** each message (user + agent) is persisted in `agent_messages` with role, content, and metadata.
- **Given** an existing `conversation_id` is provided,
- **Then** the conversation history is loaded and sent as context to the agent.
- **When** the user views their conversation history,
- **Then** a list of past conversations (title, date, preview) is displayed, sorted by most recent.
- **When** the user selects a past conversation or starts a new one,
- **Then** the full message history is loaded or a fresh conversation is created.

### US-004: Agent configuration (multi-agent, per household)
- **Given** a logged-in household admin,
- **When** the admin navigates to agent settings,
- **Then** a list of household agents is displayed, including at least one default agent.
- **When** the admin creates a new agent with a name and custom system prompt instructions,
- **Then** the agent is saved and available for all household members to select when chatting.
- **When** the admin edits or deletes an agent,
- **Then** the change is reflected immediately. Deleting an agent preserves conversation history but prevents new chats with it.
- **Given** a non-admin household member,
- **When** they view the agent list,
- **Then** they can see all household agents but cannot create, edit, or delete them.

### US-005: MCP domain tools (create/update/delete)
- **Given** the agent is processing a user request,
- **When** the agent decides to create, update, or delete a record (expense, todo, grocery item, recipe, etc.),
- **Then** the agent calls the appropriate MCP domain tool (e.g., `agent_create_expense`, `agent_update_todo`, `agent_add_grocery_item`).
- **Given** the tool call succeeds,
- **Then** the result is returned to the agent, and the agent confirms the action in natural language.
- **Given** the tool call fails (validation, not found, permission),
- **Then** the agent receives a structured error and reports it to the user in natural language — never exposing raw error details.

### US-006: Read-only SQL tool for agent
- **Given** the agent needs to query household data (read-only),
- **When** the agent invokes `agent_query_sql(household_id, sql)`,
- **Then** the tool validates that the SQL is a SELECT statement, executes it against PostgreSQL with the household_id filter, and returns the result rows.
- **Given** the SQL is not a SELECT statement,
- **Then** the tool rejects the call with an error.
- **Given** the SQL is valid but fails at the database level,
- **Then** the tool returns a sanitized error (no raw SQL traceback exposed to the agent or user).

### US-007: Tool call visibility in UI
- **Given** the agent invokes one or more MCP tools while processing a request,
- **When** the response is streamed to the frontend,
- **Then** tool calls and their results (summarised) are displayed inline in the chat as collapsible expandable blocks, so the user sees what the agent is doing.

### US-008: Default agent
- **Given** a new household is created,
- **Then** a default agent is automatically seeded in the `agents` table with a sensible default system prompt covering all household domains.
- **When** any member opens the chat for the first time,
- **Then** the default agent is pre-selected.

## 4. Out of Scope (Guardrails)
- Do NOT implement real-time sync — agent chat uses chunked HTTP streaming (no WebSockets, no SSE).
- Do NOT implement file uploads / image analysis via the agent in this spec.
- Do NOT implement third-party integrations (email, calendar, SMS) via the agent.
- Do NOT implement user-customizable agent temperature or LLM parameters.
- Do NOT implement agent voice interface (text-only).
- Do NOT expose raw MCP tool names or SQL to the end user — they are agent-internal.
- Do NOT implement conversation summarization or auto-archiving.

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/agent/chat` | Yes | Send message, stream response (chunked JSON lines) |
| GET | `/api/v1/agent/conversations` | Yes | List user's conversations |
| POST | `/api/v1/agent/conversations` | Yes | Create new conversation (auto) |
| GET | `/api/v1/agent/conversations/{id}` | Yes | Get conversation with messages |
| DELETE | `/api/v1/agent/conversations/{id}` | Yes | Delete conversation |
| GET | `/api/v1/agent/configs` | Yes | List household agent configs |
| POST | `/api/v1/agent/configs` | Yes (admin) | Create agent config |
| PUT | `/api/v1/agent/configs/{id}` | Yes (admin) | Update agent config |
| DELETE | `/api/v1/agent/configs/{id}` | Yes (admin) | Delete agent config |

### Stream format (chat response)
```
data: {"type": "token", "content": "Hello..."}
data: {"type": "token", "content": " world!"}
data: {"type": "tool_call", "tool": "agent_get_expenses", "args": {...}, "result_summary": "..."}
data: {"type": "token", "content": "Here are your expenses..."}
data: {"type": "done"}
data: {"type": "error", "code": "...", "message": "..."}
```

## 6. Data Model (Summary)

**Tables:**
- `agent_configs` — id, household_id, name, is_default, system_prompt (text), created_by_user_id (FK), created_at, updated_at
- `agent_conversations` — id, household_id, user_id (FK), agent_config_id (FK), title (auto-generated), created_at, updated_at
- `agent_messages` — id, conversation_id (FK), role (user/agent), content (text), metadata (JSON: tool_calls, tokens, etc.), created_at

All tables carry `household_id` and filter queries by it. The default agent is seeded via Alembic migration or a post-household-creation hook.

**MCP Tools (defined in code, not DB):**
- `agent_get_expenses(household_id, filters...)`
- `agent_create_expense(household_id, amount, category_id, ...)`
- `agent_update_expense(household_id, expense_id, updates...)`
- `agent_delete_expense(household_id, expense_id)`
- `agent_get_todos(household_id, filters...)`
- `agent_create_todo(household_id, title, ...)`
- `agent_update_todo(household_id, todo_id, updates...)`
- `agent_get_grocery_items(household_id, filters...)`
- `agent_add_grocery_item(household_id, list_id, name, ...)`
- `agent_get_recipes(household_id, filters...)`
- `agent_query_sql(household_id, sql)` — SELECT-only

(Full tool list expanded during implementation. Each tool receives `household_id` as the first parameter for scoping.)

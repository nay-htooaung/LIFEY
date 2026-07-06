# AGENTS.md — LIFEY

## Reality check

This repo is **docs-only** right now. No `frontend/`, `backend/`, `docker-compose.yml`, `package.json`, or `.env.example` exist yet — only `docs/`, `mise.toml`, and `opencode.json`. Every agent session starts in a blank codebase guided by specification files.

## Specs (the build plan)

All implementation specs live under `docs/sdd/specs/SPEC-*.md`. Read the relevant one before writing any code for that module:

| # | Module | File |
|---|--------|------|
| 1 | Auth & Household | `SPEC-001-auth-household.md` |
| 2 | Expense Management | `SPEC-002-expense-management.md` |
| 3 | Recipe Management | `SPEC-003-recipe-management.md` |
| 4 | To-Do List | `SPEC-004-todo-list.md` |
| 5 | Grocery Management | `SPEC-005-grocery-management.md` |
| 6 | AI Agent Chat | `SPEC-006-agent-chat.md` |
| 7 | Shared Infrastructure | `SPEC-007-shared-infrastructure.md` |

Global design tenets are in `docs/global/` (VISION, ARCHITECTURE, CONVENTIONS, INFRASTRUCTURE). Cross-reference specs against them.

## Commands

Everything runs via `mise` (Windows, tool versions pinned in `mise.toml`):

| Command | What it does |
|---------|-------------|
| `mise run dev` | `docker compose up --build` (all services) |
| `mise run dev-backend` | `uvicorn app.main:app --reload` outside Docker |
| `mise run test` | pytest + vitest |
| `mise run test-backend` | `pytest` (in `backend/`) |
| `mise run test-frontend` | `npx vitest run` (in `frontend/`) |
| `mise run lint` | ruff check/format + ESLint + Prettier |
| `mise run typecheck` | mypy + tsc --noEmit |
| `mise run migrate` | `alembic upgrade head` |
| `mise run build` | `docker compose build` |

Preferred verification order: `lint` → `typecheck` → `test`.

## Architecture rules (non-negotiable)

- **Monolith backend.** Single Python process. No microservices, no message broker.
- **No WebSockets, no SSE.** Agent chat uses chunked HTTP streaming only.
- **Every DB table carries `household_id`.** All queries filter by it. Cross-household leakage is prohibited.
- **Access token in memory; refresh token in `httpOnly` cookie.**
- **API envelope:** `{ success, data, error }` on every response.
- **MCP server is embedded** in the Python process (not a separate service).
- **No export default** in TypeScript. Named exports only. Path alias `@/` → `src/`.
- **No OAuth, no social login.** Self-managed JWT (HS256) only.
- **Open data:** every category exportable to JSON/CSV.
- **No telemetry, no analytics, no tracking.**
- `opencode.json` permissions: `ask` for `bash`, `task`, `external_directory`; all else `allow`. Do not change.

## Agent conventions

- Agents are stored in `agent_configs` DB table (per household). System prompt is a text field editable by household admins via UI. Not a `.md` file.
- MCP tools in `backend/app/modules/agent/mcp_tools/`. Prefix: `agent_` (e.g., `agent_create_expense`). Every tool receives `household_id` as first param.
- SQL tool `agent_query_sql` is SELECT-only enforced at the tool level.
- Tool calls and results stream to frontend as typed events for inline display.

## SDD document chain

- `SPEC-*` specs → `DSN-*` designs → `TST-*` test matrices.
- Templates exist in `docs/sdd/{specs,designs,matrices}/`.
- Write specs first, then designs, then implementation code.

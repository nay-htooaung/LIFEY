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

Global design tenets are in `docs/global/`:

| File | Covers |
|------|--------|
| `VISION.md` | Product north star, pillars, target audience, non-negotiables |
| `ARCHITECTURE.md` | System diagram, tech stack, module structure, communication patterns |
| `CONVENTIONS.md` | Cross-cutting conventions: naming, imports, error handling, database, API design, PWA, Docker, testing, linting, git, agents, file layout |
| `INFRASTRUCTURE.md` | Docker Compose, env vars, CI/CD, image strategy, network/security, guardrails |
| `BACKEND.md` | Backend-specific implementation patterns: core module, shared module, app factory, Dockerfile, linting config |
| `FRONTEND.md` | Frontend-specific implementation patterns: API client, types, Vite config, PWA, Dockerfile, nginx, linting config |

Cross-reference specs against these. Infrastructure conventions (API envelope, error handling, pagination, PWA, Docker, CI/CD, linting) are global — there is no SPEC-007 for them; they live directly in the global docs above.

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

## SDD document chain (feature modules only)

- `SPEC-*` specs → `DSN-*` designs → `TST-*` test matrices.
- Templates exist in `docs/sdd/{specs,designs,matrices}/`.
- Infrastructure conventions (envelope, error handling, pagination, PWA, Docker, CI, linting, mise tasks) live in `docs/global/` — not as SDD specs.
- Write specs first, then designs (matching DSN-* number), then implementation code.
- Read both the spec **and** its corresponding design doc before writing any code for a module.

## Shared infrastructure implementation order

Before implementing any feature module, establish shared infrastructure in this order:

1. **mise.toml** — Confirm all tasks are defined (dev, test, lint, typecheck, migrate, build).
2. **Backend config** — `app/core/config.py`, `.env.example`.
3. **Backend security** — `app/core/security.py` (JWT + bcrypt).
4. **Backend exceptions** — `app/core/exceptions.py`, `app/core/exception_handlers.py`.
5. **Backend shared** — `app/shared/base.py`, `app/shared/schemas.py`, `app/shared/pagination.py`.
6. **Backend deps** — `app/core/dependencies.py` (`get_current_user`).
7. **Backend app factory** — `app/main.py` with CORS, exception handlers, placeholder routers.
8. **Backend Dockerfile** — `backend/Dockerfile`, `backend/requirements.txt`.
9. **Frontend scaffolding** — `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`.
10. **Frontend API layer** — `src/api/types.ts`, `src/api/client.ts`.
11. **Frontend PWA** — `public/manifest.json`, `src/service-worker.ts`, PWA icons, `index.html` meta.
12. **Frontend Dockerfile** — `frontend/Dockerfile`, `frontend/nginx.conf`.
13. **Frontend linting** — `.eslintrc.cjs`, `.prettierrc`.
14. **Backend linting** — `pyproject.toml` (ruff + mypy config).
15. **Docker Compose** — `docker-compose.yml`.
16. **CI/CD** — `.github/workflows/ci.yml`.
17. **Verification** — `mise run lint` → `mise run typecheck` → `mise run build`.

Refer to `BACKEND.md` and `FRONTEND.md` for detailed conventions during each step.

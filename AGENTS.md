# AGENTS.md — LIFEY — Global Agent Constitution

This file is the **single source of truth** for all agents and developers working on LIFEY. Read it before any code generation, refactoring, or decision-making.

## 1. Project Identity

LIFEY is a **household management application** — expense tracking, recipe management, to-do lists, grocery management, and **AI agent chat** — delivered as a **SPA + PWA** (installable on Android/iOS via browser). It is **always-online** with a cloud-only PostgreSQL database, serving a **single household/family** (invite-only, no public sign-up).

**North Star:** One unified command centre for household operations — assisted by an AI agent that can answer questions and perform actions via natural language.

## 2. Non-Negotiable Tenets

1. **SPA + PWA** — Browser-delivered SPA, installable on mobile home screens. No native SDK builds.
2. **Always-online** — No offline mode.
3. **Household isolation** — Data is scoped by `household_id`. Cross-household leakage is prohibited.
4. **No external service dependency** — No third-party SaaS that could disappear (auth is self-managed). Exceptions: OpenCode SDK / OpenCode Zen for the AI agent chat, which is a deliberate architectural dependency.
5. **Privacy-first** — No telemetry, no analytics, no tracking.
6. **Open data** — All categories exportable to JSON/CSV.

## 3. Tech Stack (Mandated)

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript (strict) + Vite + Tailwind CSS |
| State | React Query (server) + Zustand (client) |
| Backend | Python 3.13 / FastAPI |
| AI Agent SDK | OpenCode SDK (openframework) — agent orchestration, LLM access via OpenCode Zen |
| MCP Protocol | MCP Python SDK — embedded MCP server exposes domain tools + read-only SQL |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 |
| Auth | JWT (self-managed, HS256) |
| API | REST, prefix `/api/v1/` |
| Deployment | Docker Compose (local); production TBD |

## 4. Architecture Rules

- **Monolith backend.** A single Python process. No microservices, no message broker.
- **No WebSockets, no SSE.** Polling or manual refresh. Agent chat uses chunked HTTP streaming.
- Every database table carries `household_id`. All queries filter by it.
- Access token in memory; refresh token in `httpOnly` cookie.
- API responses use a consistent envelope: `{ success, data, error }`.
- MCP server is embedded in the Python process. Not a separate service.
- Agent LLM access is via OpenCode SDK → OpenCode Zen (external HTTPS, not self-hosted).
- Domain tools for writes (create/update/delete); read-only SQL for queries.

## 5. Code Conventions

- **Python:** `snake_case`, absolute imports, async routes, type hints required (mypy strict).
- **TypeScript:** `camelCase` (vars/funcs), `PascalCase` (components/types), named exports only, path alias `@/` → `src/`.
- **State:** React Query for all API data. Zustand only for UI-global state.
- **Error handling:** Custom exception classes + global FastAPI handler on backend. Axios interceptors + React Error Boundaries on frontend.
- **Linting:** ruff (Python), ESLint + Prettier (TypeScript).
- **Testing:** pytest + pytest-asyncio (backend), vitest + testing-library + msw (frontend). Coverage: 80% backend, 70% frontend.
- **Automation:** mise (Windows) manages tool versions and defines tasks (`mise run dev`, `mise run test`, etc.).
- **Git:** Conventional Commits. Branches: `feat/`, `fix/`, `chore/`.

## 6. File Layout

```
lifey/
├── frontend/       # React SPA
│   └── src/features/agent/   # Chat UI
├── backend/        # FastAPI monolith
│   └── app/modules/agent/    # Chat proxy, MCP server, agent config, default prompt
├── mise.toml
├── docker-compose.yml
├── .env.example
├── docs/
│   └── global/     # VISION, ARCHITECTURE, INFRASTRUCTURE, CONVENTIONS
└── AGENTS.md       # ← THIS FILE
```

## 7. Agent Behaviour Rules

1. **Never write application code** unless explicitly instructed by a user task. This file defines the rules — feature agents write the code.
2. **Never change `opencode.json`** unless asked.
3. **If a user request conflicts with a tenet above**, flag the conflict before proceeding.
4. **Read this file first** every time you enter a new session.
5. **Prefer editing over creating new files** unless the task requires a new module.

## 8. OpenCode Config

- `opencode.json` permission: `ask` for all tools. Do not change this.

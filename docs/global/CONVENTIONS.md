# CONVENTIONS — LIFEY

## 1. Language & Naming

### Python (Backend)

| Construct | Convention | Example |
|-----------|------------|---------|
| Variables / functions / methods | `snake_case` | `get_user_by_email()` |
| Classes (Pydantic, SQLAlchemy) | `PascalCase` | `ExpenseCreate`, `UserModel` |
| Modules / files | `snake_case` | `expense_service.py` |
| Constants | `UPPER_SNAKE_CASE` | `JWT_ALGORITHM` |
| Private helpers | prefix `_` | `_build_filters()` |

### TypeScript (Frontend)

| Construct | Convention | Example |
|-----------|------------|---------|
| Variables / functions / hooks | `camelCase` | `useExpenseList()` |
| React components | `PascalCase` | `ExpenseCard` |
| Types / interfaces | `PascalCase` | `Expense`, `CreateExpenseDTO` |
| Files (components) | `PascalCase` | `ExpenseCard.tsx` |
| Files (hooks, utils) | `camelCase` | `useExpenseList.ts` |
| Constants / enums | `UPPER_SNAKE_CASE` | `EXPENSE_CATEGORIES` |

## 2. Document Numbering & Cross-References

### Specs (SPEC-*)
- Each acceptance criterion is numbered `US-XXX` uniquely **within its spec file** (e.g., `US-001`, `US-002`).
- When referencing from outside the file, use the qualified form `SPEC-<N>:US-XXX` (e.g., `SPEC-001:US-003` for use case 3 in spec 1).

### Designs (DSN-*)
- Sections are numbered `1`, `2`, `3`... uniquely **within the design file**.
- When referencing from outside the file, use `DSN-<NNN>:<section>` (e.g., `DSN-001:2` refers to section 2 of DSN-001).

### Test Matrices (TST-*)
- Each test case is numbered `TC-XXX` uniquely **within its matrix file**.
- When referencing from outside, use `TST-<N>:TC-XXX`.

### Rationale
- Keeps numbering local — no global ID registry needed.
- Avoids merge conflicts when multiple specs are written in parallel.
- Cross-references are always unambiguous when qualified with the document ID.

## 3. Imports

### Python
```
# Standard library
import json
from pathlib import Path

# Third-party
from fastapi import APIRouter
from sqlalchemy import select

# Local
from app.modules.expense import schemas, services
from app.shared.base import CRUDBase
```
- Group: stdlib → third-party → local, separated by blank line.
- Absolute imports only. No relative imports.

### TypeScript
```
// Third-party
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

// Local — absolute (use path alias `@/`)
import { api } from '@/api/client'
import { Expense } from '@/features/expense/types'
```
- Group: third-party → local, separated by blank line.
- Path alias: `@/` maps to `src/`.
- **Named exports only.** No `export default` in any file (except pages/route files if necessary).

## 4. State Management

### Server state (data from API)
- **React Query** (`@tanstack/react-query`) for all API data fetching, caching, mutations.
- Every feature module defines its own query key factory and hooks.
- Mutations use `useMutation` + `queryClient.invalidateQueries()` on success.

### Client state (UI-only)
- **Zustand** for global client state (sidebar open, theme toggle, active filters).
- Local state stays in `useState` / `useReducer` within the component.

### Derivation
- Derived state is computed with `useMemo` or selector functions. No syncing between stores.

## 5. Error Handling

### Backend
- All API responses follow a consistent envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
- On error:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "message": "..." }
}
```
- HTTP status codes: 200 (success), 201 (created), 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 422 (Pydantic validation), 500 (internal).
- Use custom exception classes inheriting from `AppException` in `app/core/exceptions.py`.
- Unhandled exceptions are caught by a global FastAPI exception handler that logs the traceback and returns 500.
- Error response format:
  ```json
  { "success": false, "data": null, "error": { "code": "ERROR_CODE", "message": "..." } }
  ```

#### Error codes

| Code | HTTP Status | When |
|------|-------------|------|
| `VALIDATION_ERROR` | 422 | Pydantic validation failure |
| `UNAUTHORIZED` | 401 | Missing / expired / invalid JWT |
| `FORBIDDEN` | 403 | Wrong household, non-admin action |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource (email, name) |
| `INTERNAL_ERROR` | 500 | Unhandled exception |

### Frontend
- API client (axios) interceptors handle 401 → attempt token refresh → redirect to login on failure.
- React Query's `onError` callbacks show toast notifications.
- React Error Boundaries at the route level (one per feature page).
- No `try/catch` in components unless interacting with non-query side effects.

#### Axios client pattern (src/api/client.ts)
- Base URL: `/api/v1`.
- Request interceptor attaches `Authorization: Bearer <token>` from in-memory store.
- Response interceptor:
  - On success (2xx): unwrap `response.data.data` so callers receive the payload directly.
  - On 401: attempt refresh token call, retry original request; if refresh fails, redirect to `/login`.
  - On other errors: throw structured `ApiError { code: string, message: string }`.

#### Typed response wrappers (src/api/types.ts)
```typescript
interface ApiResponse<T> { success: true; data: T; error: null }
interface ApiError { code: string; message: string }
interface ApiErrorResponse { success: false; data: null; error: ApiError }
interface PaginatedResponse<T> { items: T[]; total: number; page: number; page_size: number; pages: number }
```

## 6. Database

- **SQLAlchemy 2.0 async** style (`select()`, not legacy `Query` API).
- A shared `Base` (`DeclarativeBase`) lives in `app/shared/base.py` with mixins:
  - `TimestampMixin`: provides `id` (PK autoincrement), `created_at`, `updated_at` (auto-updated).
  - `HouseholdMixin`: provides `household_id` FK to `households.id`.
  - Feature models inherit both: `class ExpenseModel(Base, TimestampMixin, HouseholdMixin)`.
- Alembic migrations are the single source of truth for schema changes.
- Every query that reads or writes user data includes a `household_id` filter.
- Agent-specific tables (`agent_conversations`, `agent_messages`) also carry `household_id` and `user_id`.

## 7. API Design

- URL prefix: `/api/v1/`.
- Resourceful endpoints: `GET /api/v1/expenses`, `POST /api/v1/expenses`, `GET /api/v1/expenses/{id}`, etc.
- Pagination via query params `?page=1&page_size=20` (defaults: page=1, page_size=20, max page_size=100). Response shape:
  ```json
  { "items": [...], "total": 100, "page": 1, "page_size": 20, "pages": 5 }
  ```
- Sort via `?sort_by=date&sort_order=desc`.
- JWT passed as `Authorization: Bearer <token>`.
- Protected routes (all `/api/v1/*` except `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/reset-password/*`) depend on `get_current_user` FastAPI dependency which injects `user_id` and `household_id`.
- JWT payload structure:
  ```json
  { "sub": "user_id", "household_id": 1, "exp": 1700000000, "type": "access" }
  ```
- **Agent chat endpoint:** `POST /api/v1/agent/chat` — accepts `{ message, conversation_id? }`, streams response as chunked JSON lines (`data: {...}\n\n`). No WebSockets.
- **Agent conversation history:** `GET /api/v1/agent/conversations` and `GET /api/v1/agent/conversations/{id}` for listing/viewing past chats.

## 8. Testing

### Backend
- **pytest** with `pytest-asyncio`.
- Test database: separate PostgreSQL database spun up in Docker Compose (or testcontainers).
- Factories using `factory_boy` for model instances.
- Coverage target: 80%+ (business logic layers: services, schemas, use cases).
- Test files mirror module structure: `tests/modules/expense/test_services.py`.

### Frontend
- **vitest** + **@testing-library/react**.
- Mock API calls with `msw` (Mock Service Worker).
- Test files co-located with their feature: `ExpenseCard.test.tsx` next to `ExpenseCard.tsx`.
- Coverage target: 70%+ (components and hooks).

## 9. Linting & Formatting

### Backend
- **ruff** for both linting and formatting (single tool).
- `ruff format` — line length 100.
- `ruff check` — all rules enabled except those explicitly suppressed.
- **mypy** in strict mode as a type check gate.

### Frontend
- **ESLint** with `@typescript-eslint` (strict type-checked rules).
- **Prettier** for formatting — line length 100, single quotes, trailing commas all.
- Run as pre-commit hook (lint-staged + husky).

## 10. Progressive Web App (PWA)

- **Manifest** (`public/manifest.json`): `name: "LIFEY"`, `short_name: "LIFEY"`, `start_url: "/"`, `display: "standalone"`, icons at 192x192 and 512x512, theme color and background color set.
- **Service worker:** Managed by `vite-plugin-pwa` (Workbox). Cache-first for static assets, network-first for API calls. Offline fallback page displayed when offline.
- **Index.html meta:** `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable">`.
- **Registration:** Service worker registers on app load via `VitePWA` plugin with `registerType: 'autoUpdate'`.

## 11. Container & Build Conventions

### Docker
- **Multi-stage builds** for both frontend and backend to minimise image size.
- **Frontend Dockerfile:** Stage 1 builds the SPA with `node:22-alpine`. Stage 2 serves via `nginx:1.27-alpine` with SPA fallback config (`try_files $uri $uri/ /index.html`). API calls proxied to `backend:8000`.
- **Backend Dockerfile:** Stage 1 installs Python deps with pip. Stage 2 runs `python:3.13-slim` with uvicorn.
- **docker-compose.yml:** Three services — `frontend` (port 80), `backend` (no exposed port), `db` (postgres:16-alpine with named volume). Backend depends on db health check. All read env vars from `.env`.
- **Named volume:** `postgres_data` for database persistence.

### nginx
- SPA fallback: all non-file routes rewrite to `/index.html`.
- API proxy: `/api/v1/` forwarded to `http://backend:8000`.

## 12. Automation & Tools

### mise

- **mise** is the project's tool version manager and task runner (Windows).
- Versions pinned in `mise.toml` at the project root: Python, Node.js, and any CLI tooling.
- Common tasks (dev, build, test, lint, migrate) are defined as `mise run <task>` — see `mise.toml` for the full list.
- Run `mise install` after cloning to install the correct tool versions.

### Task names (convention)

| mise task | Purpose |
|-----------|---------|
| `dev` | Start all local dev services (frontend + backend + db) |
| `test` | Run both frontend and backend test suites |
| `lint` | Run ruff + ESLint across the codebase |
| `typecheck` | Run mypy + tsc |
| `migrate` | Run Alembic migrations |
| `build` | Build Docker images |

## 13. Git

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`.
- Branch naming: `feat/expense-crud`, `fix/auth-refresh`, `chore/update-deps`.
- PRs squash-merged into `main`. Single commit per PR after review.

## 14. Agent & MCP Conventions

### Agent Configuration
- Agents are stored in the `agent_configs` database table (per household).
- Each household ships with one default agent on creation; admins can create, edit, and delete additional named agents.
- The system prompt is stored as a text field in `agent_configs.system_prompt` and is editable via the chat config UI (admin only).
- A fallback default prompt is defined in `app/modules/agent/default_prompt.py` (or seeded via Alembic migration) and loaded when a new household is created.

### MCP Tool Definitions
- Tools are defined as Python async functions in `backend/app/modules/agent/mcp_tools/`.
- Each tool file is named after the domain: `expense_tools.py`, `todo_tools.py`, `grocery_tools.py`, `sql_tools.py`.
- Every tool accepts `household_id: int` as its first parameter.
- Tool naming:
  - Prefix: `agent_`
  - Action verb + domain noun: `agent_get_expenses`, `agent_add_grocery_item`, `agent_update_todo`
  - SQL tool: `agent_query_sql` (SELECT-only enforced at the tool level)
- Tool descriptions are written for the LLM (not for developers) — they are the agent's manual for when to call each tool.
- Domain tools (create/update/delete) use SQLAlchemy async sessions. The SQL tool uses raw SQL with parameterized queries.
- Tool calls and their results are streamed to the frontend as typed events so the UI can display them inline.

### Agent Error Handling
- If the MCP server or a tool call fails, the agent receives a structured error response and reports it to the user in natural language.
- The agent never exposes raw SQL errors or stack traces to the user.
- Agent module errors (auth failures, missing API key, LLM timeout) return standard API envelope errors to the frontend.

### Conversation Persistence
- Agent conversations are stored in `agent_conversations` (metadata) and `agent_messages` (individual messages).
- Messages are stored with `role` (user/agent), `content`, and `metadata` (tool calls, timestamps).
- Conversation history is loaded when a `conversation_id` is provided; otherwise a new conversation is created.
- Old conversations are retained for review but not automatically summarized.

## 15. File & Folder Layout

```
lifey/
├── .github/
│   └── workflows/
│       └── ci.yml
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── expense/
│   │   │   ├── recipe/
│   │   │   ├── todo/
│   │   │   ├── grocery/
│   │   │   ├── household/
│   │   │   └── agent/        # Chat UI, conversation list, message components
│   │   ├── api/
│   │   │   ├── client.ts     # Axios instance, interceptors, token refresh
│   │   │   └── types.ts      # ApiResponse<T>, PaginatedResponse<T>, ApiError
│   │   ├── shared/           # UI primitives, hooks, utils
│   │   ├── router/
│   │   └── service-worker.ts # Workbox service worker (PWA)
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   └── icons/            # 192x192.png, 512x512.png
│   ├── index.html
│   ├── vite.config.ts        # VitePWA plugin, @/ alias, proxy
│   ├── .eslintrc.cjs
│   ├── .prettierrc
│   ├── Dockerfile            # Multi-stage: node build → nginx serve
│   ├── nginx.conf            # SPA fallback, API proxy
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # App factory: CORS, exception handlers, routers
│   │   ├── core/
│   │   │   ├── config.py     # pydantic-settings, env vars
│   │   │   ├── security.py   # JWT create/verify, bcrypt hash/verify
│   │   │   ├── exceptions.py # AppException hierarchy
│   │   │   ├── exception_handlers.py  # Global FastAPI handlers
│   │   │   └── dependencies.py        # get_current_user
│   │   ├── shared/
│   │   │   ├── base.py       # SQLAlchemy Base, TimestampMixin, HouseholdMixin
│   │   │   ├── schemas.py    # APIResponse[T], PaginatedResponse[T], ErrorSchema
│   │   │   └── pagination.py # PaginationParams, paginate()
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── expense/
│   │   │   ├── recipe/
│   │   │   ├── todo/
│   │   │   ├── grocery/
│   │   │   ├── household/
│   │   │   └── agent/        # Chat proxy, MCP server, agent orchestration
│   │   └── migrations/       # Alembic
│   ├── tests/
│   ├── Dockerfile            # Multi-stage: pip deps → python:3.13-slim runtime
│   ├── requirements.txt
│   └── pyproject.toml        # ruff config, mypy config
├── docker-compose.yml        # Three services: frontend, backend, db
├── mise.toml                 # Tool versions + tasks
├── .env.example
├── docs/
│   └── global/
│       ├── VISION.md
│       ├── ARCHITECTURE.md
│       ├── CONVENTIONS.md
│       ├── INFRASTRUCTURE.md
│       ├── BACKEND.md
│       └── FRONTEND.md
└── AGENTS.md
```

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

## 2. Imports

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

## 3. State Management

### Server state (data from API)
- **React Query** (`@tanstack/react-query`) for all API data fetching, caching, mutations.
- Every feature module defines its own query key factory and hooks.
- Mutations use `useMutation` + `queryClient.invalidateQueries()` on success.

### Client state (UI-only)
- **Zustand** for global client state (sidebar open, theme toggle, active filters).
- Local state stays in `useState` / `useReducer` within the component.

### Derivation
- Derived state is computed with `useMemo` or selector functions. No syncing between stores.

## 4. Error Handling

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
- Use custom exception classes inheriting from `HTTPException` in `app/core/exceptions.py`.
- Unhandled exceptions are caught by a global FastAPI exception handler that logs the traceback and returns 500.

### Frontend
- API client (axios) interceptors handle 401 → redirect to login.
- React Query's `onError` callbacks show toast notifications.
- React Error Boundaries at the route level (one per feature page).
- No `try/catch` in components unless interacting with non-query side effects.

## 5. Database

- **SQLAlchemy 2.0 async** style (`select()`, not legacy `Query` API).
- All models inherit from a shared `Base` with `id`, `created_at`, `updated_at`, `household_id`.
- Alembic migrations are the single source of truth for schema changes.
- Every query that reads or writes user data includes a `household_id` filter.

## 6. API Design

- URL prefix: `/api/v1/`.
- Resourceful endpoints: `GET /api/v1/expenses`, `POST /api/v1/expenses`, `GET /api/v1/expenses/{id}`, etc.
- Pagination via query params `?page=1&page_size=20`. Response includes `total`, `page`, `page_size`, `items`.
- Sort via `?sort_by=date&sort_order=desc`.
- JWT passed as `Authorization: Bearer <token>`.
- All routes (except `/auth/login`, `/auth/register`) depend on `get_current_user` FastAPI dependency.

## 7. Testing

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

## 8. Linting & Formatting

### Backend
- **ruff** for both linting and formatting (single tool).
- `ruff format` — line length 100.
- `ruff check` — all rules enabled except those explicitly suppressed.
- **mypy** in strict mode as a type check gate.

### Frontend
- **ESLint** with `@typescript-eslint` (strict type-checked rules).
- **Prettier** for formatting — line length 100, single quotes, trailing commas all.
- Run as pre-commit hook (lint-staged + husky).

## 9. Automation & Tools

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

## 10. Git

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`.
- Branch naming: `feat/expense-crud`, `fix/auth-refresh`, `chore/update-deps`.
- PRs squash-merged into `main`. Single commit per PR after review.

## 10. File & Folder Layout

```
lifey/
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── expense/
│   │   │   ├── recipe/
│   │   │   ├── todo/
│   │   │   ├── grocery/
│   │   │   └── household/
│   │   ├── shared/
│   │   ├── api/
│   │   └── router/
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── expense/
│   │   │   ├── recipe/
│   │   │   ├── todo/
│   │   │   ├── grocery/
│   │   │   └── household/
│   │   ├── shared/
│   │   ├── core/
│   │   └── migrations/
│   ├── tests/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pyproject.toml
├── mise.toml
├── docker-compose.yml
├── .env.example
├── docs/
│   └── global/
└── AGENTS.md
```

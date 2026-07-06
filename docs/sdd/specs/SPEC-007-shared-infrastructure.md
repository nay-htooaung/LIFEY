# SPEC-007: Shared Infrastructure

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. All cross-cutting infrastructure concerns (API foundation, error handling, pagination, PWA, Docker, CI, linting, tasks) are implemented once and affect every module.

## 2. The 5W1H Intent
- **Who:** All developers and the application runtime.
- **What:** Establish shared infrastructure — API conventions (envelope, auth middleware, CORS), error handling, pagination, PWA capabilities, local Docker development environment, CI pipeline, mise task runner, and linting/formatting tooling.
- **Where:** Across the entire codebase — frontend (`src/`, `vite.config.ts`, `index.html`) and backend (`app/core/`, `app/shared/`, `Dockerfile`, `mise.toml`, `docker-compose.yml`).
- **When:** Before or concurrently with feature module implementation. Infrastructure must be in place for feature specs to build on.
- **Why:** To ensure consistency, reduce boilerplate duplication, and enforce the project conventions (envelope format, data isolation, code quality gates) from the start.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: API foundation (envelope, auth middleware, CORS)
- **Given** any API endpoint is called,
- **When** the request succeeds,
- **Then** the response follows the envelope:
  ```json
  { "success": true, "data": { ... }, "error": null }
  ```
- **When** the request fails (validation, auth, not found, etc.),
- **Then** the response follows:
  ```json
  { "success": false, "data": null, "error": { "code": "ERROR_CODE", "message": "..." } }
  ```
- **Given** a request to any protected endpoint (`/api/v1/*` except `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/reset-password/*`),
- **When** no valid JWT is provided,
- **Then** the middleware returns 401 with a standard error envelope.
- **When** a valid JWT is provided,
- **Then** `get_current_user` dependency injects the authenticated `user_id` and `household_id` into the route handler.
- **Given** a request from `FRONTEND_URL`,
- **When** the origin matches the configured CORS origin,
- **Then** the request is allowed (CORS headers set appropriately).

### US-002: Error handling (exceptions, global handler)
- **Given** a route handler raises a known custom exception (e.g., `NotFoundException`, `ForbiddenException`, `ConflictException`, `ValidationException`),
- **When** the exception propagates,
- **Then** the global FastAPI exception handler catches it and returns the appropriate HTTP status code with the envelope format.
- **Given** an unhandled exception occurs (500),
- **When** it propagates,
- **Then** the global handler logs the traceback (server-side) and returns `{ "success": false, "data": null, "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred" } }` — never exposing internals.

### US-003: Pagination schema
- **Given** any list endpoint that supports pagination,
- **When** the request includes `?page=1&page_size=20`,
- **Then** the response includes:
  ```json
  {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20,
    "pages": 5
  }
  ```
- **Given** no pagination params are provided,
- **Then** sensible defaults are applied (page=1, page_size=20).

### US-004: PWA configuration
- **Given** a user visits the app in a supported browser (Chrome, Safari, Firefox),
- **When** the page loads,
- **Then** a service worker is registered and the app is installable via the browser's "Add to Home Screen" prompt.
- **Given** the PWA manifest,
- **When** the browser reads `manifest.json`,
- **Then** it contains app name (`LIFEY`), short name, icons (192px, 512px), start URL (`/`), display (`standalone`), background color, and theme color.
- **Given** the app is opened from the home screen,
- **When** the page loads,
- **Then** it displays without browser chrome (standalone mode).
- **Given** a user is offline (no network),
- **When** they navigate to any page,
- **Then** a basic offline fallback page is displayed (cached via service worker).

### US-005: Docker Compose (dev environment)
- **Given** a developer runs `docker compose up`,
- **When** all services start,
- **Then** the following containers are running:
  - `frontend` — nginx:1.27-alpine serving the built SPA (or Vite dev proxy in dev mode).
  - `backend` — python:3.13-slim running uvicorn with `--reload`.
  - `db` — postgres:16-alpine with persistent volume `postgres_data`.
- **Given** the backend starts,
- **When** it connects to the database,
- **Then** it uses `DATABASE_URL` from the `.env` file and waits for PostgreSQL to be ready (health check or wait-for-it script).
- **Given** only the frontend port (80) is exposed,
- **When** a developer visits `http://localhost`,
- **Then** the SPA is served and API calls are proxied to the backend.

### US-006: CI/CD (GitHub Actions)
- **Given** a push to `main` or a PR targeting `main`,
- **When** CI runs,
- **Then** the following jobs execute:
  1. **Lint** — ruff check (Python), ESLint (TypeScript).
  2. **Typecheck** — mypy (Python), tsc (TypeScript).
  3. **Test** — pytest (Python), vitest (TypeScript).
  4. **Build** — Docker Compose build (smoke test, no push).
- **Given** any job fails,
- **When** the CI run completes,
- **Then** the PR is marked as failed and the commit status is updated.

### US-007: mise task definitions
- **Given** a developer clones the repo and installs mise,
- **When** they run `mise run dev`,
- **Then** all local dev services (frontend + backend + db) start.
- **When** they run `mise run test`,
- **Then** both frontend and backend test suites run.
- **When** they run `mise run lint`,
- **Then** ruff + ESLint run across the codebase.
- **When** they run `mise run typecheck`,
- **Then** mypy + tsc run.
- **When** they run `mise run migrate`,
- **Then** Alembic migrations are applied.
- **When** they run `mise run build`,
- **Then** Docker images are built.

### US-008: Linting/formatting configuration
- **Given** a developer runs `ruff format` in the backend directory,
- **When** Python files exist,
- **Then** they are formatted according to the ruff configuration (line length 100, etc.).
- **Given** a developer runs `eslint` in the frontend directory,
- **When** TypeScript files exist,
- **Then** they are linted according to the ESLint configuration (strict type-checked rules).
- **Given** a developer runs `prettier` in the frontend directory,
- **When** TypeScript/CSS/JSON files exist,
- **Then** they are formatted according to the Prettier configuration (line length 100, single quotes, trailing commas all).

## 4. Out of Scope (Guardrails)
- Do NOT implement production deployment orchestrator (Kubernetes, Nomad, etc.) in this spec — Docker Compose is for local dev only.
- Do NOT implement monitoring, logging aggregation, or APM.
- Do NOT implement secrets management beyond `.env` (no Vault, no AWS Secrets Manager).
- Do NOT implement SSL/TLS termination in local dev (handled in production deployment).
- Do NOT implement database connection pooling beyond SQLAlchemy's built-in pool.

## 5. API Contracts (Summary)

This spec does not introduce domain endpoints. It establishes shared utilities:

**Backend:**
- `app/core/config.py` — Settings from environment (pydantic-settings)
- `app/core/security.py` — JWT encode/decode, password hashing (bcrypt)
- `app/core/dependencies.py` — `get_current_user` FastAPI dependency
- `app/core/exceptions.py` — Custom exception classes
- `app/core/exception_handlers.py` — Global exception handler registration
- `app/shared/schemas.py` — `APIResponse[T]`, `PaginatedResponse[T]`, `ErrorSchema`
- `app/shared/pagination.py` — Pagination dependency and response builder
- `app/shared/base.py` — Base SQLAlchemy model with `id`, `created_at`, `updated_at`, `household_id`

**Frontend:**
- `src/api/client.ts` — Axios instance with interceptors (auth header, 401 redirect, envelope unwrapping)
- `src/api/types.ts` — Shared API response types
- `vite.config.ts` — Vite config with PWA plugin, path alias `@/`, proxy to backend in dev
- `public/manifest.json` — PWA manifest
- `src/service-worker.ts` — Service worker (caching strategy, offline fallback)

**Infrastructure:**
- `docker-compose.yml` — Service definitions
- `frontend/Dockerfile` — Multi-stage build (node build → nginx serve)
- `backend/Dockerfile` — Multi-stage build (deps → runtime)
- `.github/workflows/ci.yml` — CI pipeline
- `mise.toml` — Tool versions and task definitions
- `backend/pyproject.toml` — Ruff config
- `frontend/.eslintrc.cjs` — ESLint config
- `frontend/.prettierrc` — Prettier config

## 6. Data Model

This spec does not introduce database tables (all tables belong to feature specs). It establishes:
- `app/shared/base.py` — `BaseModel` (SQLAlchemy declarative base) with mixin for `id`, `created_at`, `updated_at`, `household_id`
- `app/shared/schemas.py` — Generic Pydantic models for envelopes and pagination

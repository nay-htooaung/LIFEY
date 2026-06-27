# INFRASTRUCTURE — LIFEY

## Local Development Environment

| Component | Technology |
|-----------|------------|
| Tool version manager | [mise](https://mise.jdx.dev) (Windows) — pins Python 3.13.14, Node.js 22.23.1 |
| Task runner | mise tasks (defined in `mise.toml`) replace Makefile / npm scripts for workflow automation |
| Container runtime | Docker Desktop + Docker Compose V2 |
| Frontend serve | Vite dev server (hot-reload) — proxied through Compose |
| Backend serve | uvicorn with `--reload` in dev |

## Production Deployment (TBD by user)

The current setup targets a **single Linux VM** via Docker Compose. The user will evaluate dedicated servers after completion. This document captures the local-first Docker Compose topology; production hardening (orchestration, SSL termination, monitoring) is deferred.

## Docker Compose Topology (Local)

```
services:
  frontend:    # nginx:1.27-alpine serving built SPA
  backend:     # python:3.12-slim running uvicorn
  db:          # postgres:16-alpine
```

- All services communicate over an internal Docker network.
- Only the frontend (port 80) is exposed to the host.
- The backend and database are not exposed externally.

## Secrets & Environment Variables

Managed via a single `.env` file at the project root (gitignored). Docker Compose references `${VAR}` placeholders.

| Variable | Purpose |
|----------|---------|
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |
| `DATABASE_URL` | Full connection string for SQLAlchemy |
| `JWT_SECRET_KEY` | HMAC signing key for JWT |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRE_MINUTES` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL |
| `FRONTEND_URL` | CORS origin (e.g., `http://localhost` or `http://localhost:5173` in dev) |

## Docker Image Strategy

- **Frontend:** Multi-stage build. Stage 1 builds the SPA with `node:22-alpine`. Stage 2 serves via `nginx:1.27-alpine` with a custom config that rewrites all routes to `index.html` (SPA fallback).
- **Backend:** Multi-stage build. Stage 1 installs system deps and Python packages. Stage 2 runs with `python:3.13-slim`.
- **Database:** Stock `postgres:16-alpine` with an init SQL script for schema bootstrap (if Alembic is not used at first run).

## CI/CD

| Concern | Choice |
|---------|--------|
| Platform | GitHub Actions |
| Trigger | Push to `main`, pull requests targeting `main` |
| Checks | Lint (ruff for Python, ESLint/Prettier for TS), typecheck (mypy + tsc), test (pytest + vitest) |
| Image build | Docker Compose build on every PR as a smoke test |
| Deploy | Not configured — user-managed after server choice |

## OS & System Dependencies

- **Base image:** `python:3.12-slim` (Debian-based)
- **Required system packages:** `libpq-dev` (psycopg2 build dep), `gcc` (for some Python extensions)
- **Frontend build:** Node.js 22+ (alpine)

## Network & Security (Dev)

- No TLS in local dev. `FRONTEND_URL` controls CORS.
- JWT signing key must be a high-entropy random string. Generate with `openssl rand -hex 32`.
- PostgreSQL port (5432) is not exposed to the host in Docker Compose.

## Volumes

- `postgres_data` named volume for database persistence across Compose restarts.
- No volume for uploaded files (none planned for v1). If images are added later (recipe photos), an object store (S3-compatible) or a named volume will be introduced.

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
  frontend:    # nginx:1.27-alpine serving built SPA (port 80 exposed)
  backend:     # python:3.13-slim running uvicorn with --reload (not exposed)
  db:          # postgres:16-alpine with named volume (not exposed)
```

- All services communicate over an internal Docker network.
- Only the frontend (port 80) is exposed to the host.
- Backend depends on db health check (`pg_isready`). Frontend depends on backend.
- Named volume `postgres_data` for database persistence across restarts.
- Backend and frontend mount their source directories as volumes for hot-reload in dev.

## Secrets & Environment Variables

Managed via a single `.env` file at the project root (gitignored). Docker Compose references `${VAR}` placeholders. `app/core/config.py` reads them via `pydantic-settings`.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | Full connection string for SQLAlchemy |
| `POSTGRES_DB` | Yes | — | Database name (Docker Compose) |
| `POSTGRES_USER` | Yes | — | Database user (Docker Compose) |
| `POSTGRES_PASSWORD` | Yes | — | Database password (Docker Compose) |
| `JWT_SECRET_KEY` | Yes | — | HMAC signing key for JWT (generate via `openssl rand -hex 32`) |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | No | `30` | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | Refresh token TTL |
| `FRONTEND_URL` | No | `http://localhost` | CORS origin |
| `OPENCODE_API_KEY` | No | `""` | API key for OpenCode SDK / OpenCode Zen (agent LLM access) |
| `DEBUG` | No | `False` | Enable debug mode |

## Docker Image Strategy

- **Frontend:** Multi-stage build. Stage 1 builds the SPA with `node:22-alpine`. Stage 2 serves via `nginx:1.27-alpine` with a custom config that rewrites all routes to `index.html` (SPA fallback).
- **Backend:** Multi-stage build. Stage 1 installs system deps and Python packages (including `opencode-sdk` and `mcp`). Stage 2 runs with `python:3.13-slim`.
- **Database:** Stock `postgres:16-alpine` with an init SQL script for schema bootstrap (if Alembic is not used at first run).

## CI/CD

| Concern | Choice |
|---------|--------|
| Platform | GitHub Actions |
| Trigger | Push to `main`, pull requests targeting `main` |
| Pipeline | Lint → Typecheck → Test → Build (sequential, each depends on prior) |
| Lint | `ruff check backend/`, `npx eslint frontend/` |
| Typecheck | `mypy backend/`, `npx tsc --noEmit frontend/` |
| Test | `pytest backend/`, `npx vitest run frontend/` |
| Build | `docker compose build` as a smoke test (no push) |
| Deploy | Not configured — user-managed after server choice |

## Agent Configuration

Agent configurations are stored in the `agent_configs` database table (per household). The system prompt is a text field editable by household admins via the chat config UI. A default prompt is seeded for each new household. SDD agents (Phase 6) must not hardcode the system prompt in Python route code.

## Agent Dependencies

- **opencode-sdk** (Python package) — agent orchestration and LLM access via OpenCode Zen
- **mcp** (Python package) — Model Context Protocol server framework for exposing tools to the agent

## Network & Egress

- The backend container requires HTTPS egress to the OpenCode Zen API (`api.opencode.ai` or similar) for agent LLM calls.
- If deploying in a restricted network, ensure the `OPENCODE_API_KEY` allows outbound access.

## Guardrails (Out of Scope for Local Dev)

- No production deployment orchestrator (Kubernetes, Nomad). Docker Compose is for local dev only.
- No monitoring, logging aggregation, or APM.
- No secrets management beyond `.env` (no Vault, no AWS Secrets Manager).
- No SSL/TLS termination in local dev (handled in production deployment).
- No database connection pooling beyond SQLAlchemy's built-in pool.

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

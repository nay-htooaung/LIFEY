# ARCHITECTURE — LIFEY

## System Diagram (Logical)

```
┌─────────────────────────────────────────────────────┐
│                    PWA Shell                         │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │ Expense  │ │  Recipe  │ │  Todo  │ │  Grocery  │  │
│  │ Module   │ │  Module  │ │ Module │ │  Module   │  │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘  │
│       └────────────┼────────────┼────────────┘        │
│                    ▼            ▼                      │
│              ┌──────────────────────┐                 │
│              │   API Client Layer   │                 │
│              │  (axios / fetch)     │                 │
│              └──────────┬───────────┘                 │
└─────────────────────────┼─────────────────────────────┘
                          │ HTTPS / REST + JSON
┌─────────────────────────┼─────────────────────────────┐
│              ┌──────────▼───────────┐                 │
│              │   JWT Auth Middleware │                 │
│              └──────────┬───────────┘                 │
│                         ▼                             │
│         ┌───────────────────────────────┐             │
│         │       Python Monolith         │             │
│         │  (FastAPI)                    │             │
│         │                               │             │
│         │  ┌─────────┐ ┌────────────┐   │             │
│         │  │ Auth     │ │ Expense    │   │             │
│         │  │ Module   │ │ Module     │   │             │
│         │  ├─────────┤ ├────────────┤   │             │
│         │  │ Recipe   │ │ Todo       │   │             │
│         │  │ Module   │ │ Module     │   │             │
│         │  ├─────────┤ ├────────────┤   │             │
│         │  │ Grocery  │ │ Shared     │   │             │
│         │  │ Module   │ │ (users,    │   │             │
│         │  │          │ │  households)│  │             │
│         │  └─────────┘ └────────────┘   │             │
│         └───────────────┬───────────────┘             │
│                         ▼                             │
│              ┌──────────────────────┐                 │
│              │  PostgreSQL          │                 │
│              │  (single database,   │                 │
│              │   multi-household    │                 │
│              │   row-level security)│                 │
│              └──────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

## Frontend Architecture

| Concern | Choice |
|---------|--------|
| Framework | React (latest stable) |
| Language | TypeScript (strict) |
| Build tool | Vite |
| Routing | React Router v7+ |
| State management | React Query (server state) + Zustand (client state) |
| PWA | vite-plugin-pwa (Workbox) |
| HTTP client | axios |
| Styling | Tailwind CSS |
| Component library | None — custom components; Radix UI primitives if needed |
| Form handling | React Hook Form + Zod |

### Module structure (frontend)

```
src/
  features/
    auth/
    expense/
    recipe/
    todo/
    grocery/
    household/
  shared/        # UI primitives, hooks, utils, types
  api/           # API client configuration
  router/        # route definitions
```

## Backend Architecture

| Concern | Choice |
|---------|--------|
| Framework | FastAPI (Python 3.12+) |
| Language | Python 3.12+ |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Auth | PyJWT (RS256 or HS256) — self-managed |
| Password hashing | bcrypt (passlib) |
| API style | RESTful, versioned under `/api/v1/` |
| Background tasks | FastAPI BackgroundTasks / Celery (if needed later) |

### Module structure (backend)

```
app/
  modules/
    auth/
    expense/
    recipe/
    todo/
    grocery/
    household/
  shared/         # base CRUD, pagination, error handling, DB session
  core/           # config, security, dependencies
  migrations/     # Alembic
```

## Communication

- **Frontend → Backend:** REST over HTTPS. JSON request/response bodies. JWT in `Authorization: Bearer <token>` header.
- **No WebSockets.** No server-sent events. Polling or manual refresh is the pattern.
- **No GraphQL.** No tRPC.

## Data Isolation

- Every table carries a `household_id` foreign key.
- All queries are scoped by the authenticated user's household. No cross-household data leakage.
- PostgreSQL row-level security (RLS) is used as a defence-in-depth layer; application-layer scoping remains the primary gate.

## Auth Flow

1. Registration creates a user within a household. First user creates the household; subsequent users join via invite token.
2. Login returns a signed JWT (access + refresh token pair).
3. Access token lives in memory (JS variable). Refresh token in `httpOnly` cookie or local storage.
4. Every API request validates the JWT and extracts `user_id` + `household_id`.

## Deployment Topology

```
[Browser/PWA] ──HTTPS──► [Reverse Proxy (nginx)] ──► [Python Monolith (uvicorn)] ──► [PostgreSQL]
```

Single-server deployable. No microservices, no message broker, no cache layer (unless profiling proves a bottleneck).

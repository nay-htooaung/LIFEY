---
title: Supabase Local Development Environment
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0005: Supabase Local Development Environment

## Context

The team needs a development environment for building and testing features that depend on Supabase — PostgreSQL schema, Row Level Security policies, authentication flows, and real-time subscriptions. The architecture is SPA → Supabase (direct, no custom backend), so the local environment must provide a Supabase-compatible API endpoint.

Key constraints:
- Must allow **offline development** (no internet requirement for daily work)
- Must support **RLS policy testing** before deploying to production — policies are the sole authorization layer
- Must support running **database migrations** safely without touching production data
- Must work on Windows (WSL2 + Docker Desktop)
- Should **downgrade gracefully** to a remote project if Docker is not available
- Must be **scriptable** so new team members can bootstrap in one command

## Options

### Option A: Local Supabase stack via CLI (`supabase start`)
Use the official Supabase CLI to run the full stack locally via Docker Compose. The CLI wraps PostgreSQL, GoTrue (auth), PostgREST, Realtime, Storage, and Studio UI into a single `supabase start` command.

```
supabase init        # creates supabase/config.toml
supabase start       # pulls images, starts services, applies migrations
supabase db diff     # generates migration from local schema changes
supabase db push     # pushes migrations to linked remote project
```

Services:
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 54322 | Database |
| PostgREST | 54321 | Auto REST API (what supabase-js hits) |
| GoTrue | 9999 | Authentication (sign-up, log-in, sessions) |
| Realtime | 4000 | WebSocket subscriptions |
| Studio | 54323 | Web UI — table browser, SQL editor, RLS tester |

### Option B: Remote Supabase dev project
Create a free Supabase project on supabase.com and point the development SPA at its URL + anon key. All queries hit the cloud.

### Option C: Docker Compose from scratch
Write a custom `docker-compose.yml` with `postgres`, `postgrest`, `gotrue`, and `realtime` images. Maintain the config manually.

## Evaluation

| Criteria | A — Local CLI | B — Remote project | C — Custom Compose |
|----------|:---:|:---:|:---:|
| **Offline development** | ✅ Full | ❌ Requires internet | ✅ Full |
| **RLS testing before deploy** | ✅ Apply policy locally, test via Studio | ⚠️ Must push migration first, then test | ✅ Same as A |
| **Migration safety** | ✅ Apply locally first, then push | ❌ One fat-finger mistake corrupts dev DB | ✅ Same as A |
| **Setup time** | ⚠️ ~30 min (Docker download + pull images) | ✅ ~5 min (create project, copy URL) | ❌ ~2 hours (manual image config) |
| **Windows support** | ✅ Supabase CLI works via WSL2 + Docker Desktop | ✅ N/A — browser-based | ⚠️ Must write WSL-compatible compose file |
| **Team onboarding** | ✅ `supabase start` | ✅ `cp .env.example .env` | ❌ `docker compose up` but no migration tooling |
| **Production parity** | ✅ Same images, same config | ✅ Exact same service | ⚠️ Version drift risk |
| **Auth testing** | ✅ GoTrue — create real users locally | ❌ Email delivery for confirmation | ⚠️ Must configure mailhog |
| **Cost** | Free | Free (dev tier, 2 projects) | Free |
| **Graceful fallback** | ✅ Can point to remote if Docker unavailable (env switch) | ✅ Always works | ❌ Same infra issue as A |

## Decision

**Accepted: Option A — Local Supabase stack via `supabase start`.**

The local stack provides the tightest feedback loop for the most critical risk in this project: RLS policies. Every migration and every policy can be tested against real PostgreSQL before touching any environment that matters. The offline capability is a strong secondary benefit — the team can develop on a plane, train, or cafe with spotty WiFi.

The Supabase CLI is the standard tool maintained by Supabase Inc., which means: (1) it stays in sync with the hosted product, (2) `supabase db diff` generates migrations automatically from schema changes, and (3) `supabase link` + `supabase db push` provides a clean path to deploy migrations to staging/production.

**Fallback:** If Docker Desktop is unavailable for any reason (e.g., corporate laptop restrictions), the `.env` file can be pointed at a shared Supabase dev project instead. The codebase must support this via a single environment variable swap.

## Consequences

### Positive
- Full offline development — no internet needed for daily work
- RLS policies are validated locally before any deploy
- `supabase db diff` generates migrations automatically, reducing human error
- Studio UI (`localhost:54323`) provides a visual database browser for ad-hoc queries
- New team member onboards with `git clone → supabase start` — no shared dev project to configure

### Negative
- Requires Docker Desktop with WSL2 — ~2 GB download on first setup, ~2 GB RAM while running
- Initial `supabase start` pulls ~5 Docker images (~5-10 minutes on first run)
- Docker Desktop on Windows can be resource-heavy (consider setting memory limits)
- If Docker Desktop is not available, falls back to remote project (less safe for RLS testing)

### Neutral
- The team must install the Supabase CLI (`npm install -g supabase` or `brew install supabase/tap/supabase`)
- `.env.local` must have two configurations: one for local (`NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321`) and one for remote
- Project structure: a `supabase/` directory at the root with `config.toml`, `migrations/`, `seed.sql`

## Compliance

- The `supabase/` directory MUST be checked into version control (config, migrations, seeds — no secrets)
- `.env.local` with local Supabase URL must be the default for `npm run dev`
- All schema changes MUST go through migration files in `supabase/migrations/` — no manual SQL edits in Studio
- `supabase db diff` must be used to generate migration files from schema changes made via Studio or direct SQL
- CI must run `supabase start` (or equivalent) and apply migrations + seed data as part of the test suite
- If a team member cannot run Docker, they use a shared dev project via `NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co` — but RLS PRs must be verified by someone with a local environment

## References

- Supabase CLI docs: https://supabase.com/docs/guides/cli
- Local development guide: https://supabase.com/docs/guides/local-development

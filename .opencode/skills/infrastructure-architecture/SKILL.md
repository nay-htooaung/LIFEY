---
name: infrastructure-architecture
description: >-
  Guidance for infrastructure decisions: Docker Compose conventions,
  environment stratification, deployment topology, container networking,
  and CI/CD pipeline architecture. Use this when planning deployment
  architecture.
---

# Infrastructure Architecture

Guidance on containerisation, environments, deployment topology, and operational infrastructure.

---

## Core Principles

1. **Environments must match.** Staging should be as close to production as possible (same OS, same services, same versions).
2. **Infrastructure as code.** Every environment is defined in version-controlled config. No manual server setup.
3. **Services should be stateless.** Any instance can be replaced. State lives in databases, object storage, or caches.
4. **Least privilege.** Every service gets only the permissions and network access it needs.

---

## Containerisation (Docker)

### Supabase CLI workflow (LIFEY default)

LIFEY uses **`supabase start`** which manages Docker containers internally. No custom `docker-compose.yml` is needed for the Supabase stack.

```bash
supabase start    # pulls images, starts PostgreSQL, GoTrue, PostgREST, Realtime, Studio
supabase stop     # stops all containers
supabase status   # check which services are running
```

See [ADR-0005](../adr/0005-supabase-local-development.md) for details.

- The Supabase CLI manages Docker under the hood — no manual `docker compose up`
- Containers run in WSL2 (Windows) or natively (macOS/Linux)
- Studio UI is available at `http://localhost:54323`
- All config lives in `supabase/config.toml` (committed) and `.env.local` (gitignored)

### Custom Docker Compose (when needed)

Use a custom `docker-compose.yml` when running services outside the Supabase stack (e.g., a custom AI agent service in Q4).

- Use **specific version tags** for base images (`python:3.12-slim`, not `python:latest`)
- Prefer slim/distroless base images to reduce attack surface
- Multi-stage builds: build stage → runtime stage (only ship what's needed)
- Run as non-root user
- Use `.dockerignore` to exclude unnecessary files

### Docker Compose conventions (`docker-compose.yml`)

```yaml
version: "3.9"
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${API_PORT:-8000}:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    restart: unless-stopped
```

Rules:
- Use environment variables for all config (via `.env` file)
- Use `depends_on` with `condition: service_healthy` for proper startup ordering
- Define health checks for every service
- Use named volumes for persistent data
- Use a `.env` file (gitignored) for per-developer overrides; `.env.example` (committed) as template

---

## Environment Strategy

### Full stack (standard — custom API + database)

| Environment | Purpose | Data | Deploy method |
|-------------|---------|------|---------------|
| `dev` | Local development | Sample/seed data | `docker compose up` |
| `staging` | Pre-production validation | Anonymized production copy | CI/CD auto-deploy |
| `production` | Live | Real | CI/CD with approval gate |

### Supabase SPA (LIFEY default — no custom API server)

LIFEY's architecture (SPA → Supabase) means fewer environments:

| Environment | Purpose | SPA | Supabase |
|-------------|---------|-----|----------|
| `dev` | Local development | `vite dev` | `supabase start` (local Docker) |
| `production` | Live | Cloudflare Pages deploy | Supabase production project |

No staging environment in Q3 — migrations are tested locally first via `supabase db reset`, then applied directly to production via `supabase db push`. A staging Supabase project can be added in Q4 if needed.

### Environment parity checklist

- [ ] Same service versions (PostgreSQL, Redis, etc.)
- [ ] Same OS base images
- [ ] Same startup/shutdown order
- [ ] Same environment variable names (different values)
- [ ] Same health check configurations

---

## Deployment Topology

### SPA + managed backend (LIFEY default — Q3)

```
[Client (browser / installed PWA)]
        │ HTTPS
        ▼
[Cloudflare Pages CDN]
  Serves: index.html, JS, CSS, assets
  Fallback: /* → index.html (SPA routing)
        │
        ├── HTTPS ──► [Supabase PostgREST] ──► [PostgreSQL + RLS]
        │
        └── HTTPS ──► [Supabase Auth (GoTrue)] ──► JWT
             WS ────► [Supabase Realtime] ──► pg_replication_slot
```

No app servers to deploy. No reverse proxy to configure. No Docker in production.

### Single-server (custom API — Q4+ when AI agent service arrives)

```
[Client] → [Load Balancer] → [App Server: API + Web]
                                    │
                          [PostgreSQL] [Redis] [Object Storage]
```

Use Docker Compose with a reverse proxy (nginx/traefik) for TLS termination.

### Multi-service / scaling (growth stage)

```
[CDN] ← [Client]
  │
[Load Balancer]
  │
  ├─ [API Service (x N)]
  ├─ [Web Service (x N)]
  ├─ [Background Workers (x N)]
  │
  └─ [PostgreSQL Primary] → [Replica]
      [Redis Cluster]
      [Object Storage]
```

Consider orchestration (Kubernetes / Nomad) when:
- Running 5+ services
- Need auto-scaling
- Need zero-downtime deploys
- Team has ops capacity to manage it

---

## Networking & Service Discovery

- Internal services communicate over a dedicated Docker network (not via `localhost`)
- Use service names as hostnames: `http://api:8000`
- External-facing services go through a reverse proxy
- Database ports are never exposed to the host (only accessible within the Docker network)

---

## CI/CD Pipeline Architecture

### Pipeline stages

```
1. Lint & Format (fail fast)
2. Unit Tests
3. Build (Docker image)
4. Integration Tests (against ephemeral env)
5. Push Image to Registry
6. Deploy to Staging
7. Acceptance Tests
8. Deploy to Production (manual approval gate)
```

### CI/CD principles

- Build once, deploy everywhere (same image through all environments)
- Ephemeral environments for PRs (spin up on PR, destroy on merge)
- Database migrations run as a separate step before deploying new application version
- Rollback should be as fast as deploy (keep the previous image tagged)

---

## Operational Concerns

### Logging
- Services log to stdout/stderr (Docker collects)
- Structured logs (JSON format) with correlation IDs
- Centralised log aggregation (Loki, ELK, or cloud provider)

### Monitoring & Alerting
- Health endpoints (`/health`, `/ready`) for every service
- RED metrics: Rate, Errors, Duration per endpoint
- Alert on: error rate spikes, p99 latency degradation, service down

### Backup
- Automated daily database backups with point-in-time recovery
- Off-site/cloud backup for all persistent data
- Test restore process quarterly

### Secrets
- Never commit secrets to version control
- Use a secret manager (Vault, AWS Secrets Manager, Doppler) or encrypted `.env` files
- Rotate secrets on a schedule and immediately on compromise

# C2 — Container Diagram

> **Audience:** Developers, ops
> **Last updated:** 2026-07-14
> **Architecture decision:** [ADR-0002](../adr/0002-installable-spa-architecture.md)

```mermaid
flowchart TD
    member([Household Member])

    subgraph spa["LIFEY SPA (browser)"]
        react["React App Shell<br/>React + Router + TS"]
        sw["Service Worker<br/>vite-plugin-pwa"]
        host["Static Host<br/>Cloudflare Pages"]
    end

    subgraph supabase["Supabase (managed)"]
        pg[(PostgreSQL)]
        auth["Supabase Auth"]
        rt["Supabase Realtime"]
        store["Supabase Storage"]
        rest["PostgREST"]
    end

    subgraph future["Future (Q4 2026)"]
        ai["AI Agent Service<br/>Python / FastAPI"]
    end

    push>Browser Push API]

    host -->|Serves| react
    react -->|Registers| sw
    react -->|Sign up, log in| auth
    react -->|CRUD + JWT| rest
    react -->|Live sync| rt
    react -->|Upload / download| store
    auth -->|Reads/writes| pg
    rest -->|Auto queries| pg
    rt -->|Replication slot| pg
    store -->|Metadata| pg
    sw -->|Receives push| push
    react -.->|Chat API| ai
    ai -.->|DB pool| pg

    style member fill:#e1f5fe,stroke:#0288d1
    style spa fill:#e8f5e9,stroke:#388e3c
    style supabase fill:#fff3e0,stroke:#f57c00
    style future fill:#eceff1,stroke:#546e7a,stroke-dasharray: 5 5
    style push fill:#f3e5f5,stroke:#7b1fa2
```

## Data flow

### Authentication flow

```
Member → React Shell → invite code gate → enter email → magic link sent
                     → Click magic link → Supabase Auth authenticates
                     → Returns JWT token (stored in IndexedDB via persistQueryClient)
                     → Token attached to all subsequent requests
                     → RLS policies enforce per-household data isolation
```

### Real-time flow (e.g., to-do list updates)

```
Member A adds task → React Shell → PostgREST (INSERT with JWT)
                      → PostgreSQL (RLS validates household membership)
                      → Replication slot triggers Realtime broadcast
                      → Member B's React Shell receives WebSocket event
                      → UI updates
```

### Push notification flow

```
Service Worker registers push subscription → stored in Supabase DB
When task assigned → (Supabase Edge Function or future backend)
  → sends push via Web Push API → Service Worker receives
  → Shows notification, even if app is closed
```

## Notes

- There is **no custom API server** — PostgREST generates the REST API directly from the database schema
- Row Level Security (RLS) policies enforce multi-tenant data isolation — every query includes the JWT, RLS checks household membership
- The AI Agent Service will connect directly to the same PostgreSQL database (not through Supabase APIs) per ADR-0001 compliance rules
- Future native mobile apps will use the same Supabase JS client and endpoints

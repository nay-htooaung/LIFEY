---
title: State Management and Offline Strategy
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0004: State Management and Offline Strategy

## Context

The SPA needs a consistent approach for managing two distinct types of state:

1. **Server state** — data stored in Supabase (profiles, households, task lists, task items, assignees). This data is fetched over HTTP, can change on the server (other household members making edits), and needs caching, background refetching, optimistic updates, and error handling.

2. **Client state** — ephemeral UI state (current household selection, active modal, sidebar collapsed, filter selection, search text). This data lives only in the browser tab and resets on refresh.

Additionally, the SPA must function as an **installable PWA** where users may open the app without a network connection. The current architecture (ADR-0002) uses **direct SPA → Supabase** communication with no intermediary backend — so offline resilience must be solved client-side.

Constraints:
- No custom backend server — Supabase PostgREST is the only API
- Minimal bundle size for PWA installability
- Must work today (Q3 2026) and evolve to richer offline support in Q4 2026
- Supabase real-time subscriptions should eventually supersede polling for multi-user scenarios

### Future constraint (not required today)

- In Q4, when shared households actively use task assignment and push notifications, **offline writes** will become important — a user in a grocery store with no signal should be able to check off items and have them sync when the connection returns.

## Options

### Server state

| Option | Description |
|--------|-------------|
| **A — TanStack Query** | Declarative fetching, auto-caching, background refetch, optimistic updates, `persistQueryClient` for offline read cache |
| **B — Supabase JS + raw useState** | Manual fetch in useEffect, no cache layer |
| **C — Zustand server store** | Store server data in Zustand, manually manage fetches |

### Client state

| Option | Description |
|--------|-------------|
| **1 — Zustand** | ~1 KB, no boilerplate, no providers, works outside React |
| **2 — React Context** | Built-in, but causes unnecessary re-renders across large component trees |
| **3 — Jotai** | Atomic state, fine-grained reactivity, slightly more niche |

### Offline strategy (Q3)

| Option | Description |
|--------|-------------|
| **α — TanStack Query `persistQueryClient`** | Persist query cache to IndexedDB. Offline reads served from last-fetched data. Offline writes fail gracefully with user feedback. |
| **β — Service Worker stale-while-revalidate** | SW intercepts API calls, serves cached responses, updates cache in background. More complex for writes. |
| **γ — RxDB / local-first** | Full local database with sync engine. High complexity, high payoff. |

### Offline strategy (Q4 future)

| Option | Description |
|--------|-------------|
| **δ — SW mutation queue** | Service Worker queues POST/PATCH/DELETE in IndexedDB during offline, replays via Background Sync event on reconnection. Built on the SW already installed for push notifications. |
| **ε — Supabase real-time sync** | Use `supabase-js` channel subscriptions to push remote changes to the local cache when back online. |

## Evaluation

### State management pairing

| Criteria | TanStack Query + Zustand | TanStack Query + Context | Manual fetch + Zustand |
|----------|:---:|:---:|:---:|
| **Server caching** | ✅ Auto | ✅ Auto | ❌ Manual |
| **Optimistic updates** | ✅ Built-in hooks | ✅ Built-in hooks | ❌ Manual |
| **Bundle impact** | ✅ ~15 KB gzipped | ✅ Same | ✅ No TQ (~0 KB) |
| **Client state re-renders** | ✅ Zustand selectors | ⚠️ Context triggers subtree re-renders | ✅ Zustand selectors |
| **Team familiarity** | ✅ Industry standard | ✅ Low bar | ⚠️ More boilerplate |
| **Offline read support** | ✅ `persistQueryClient` | ⚠️ Must implement manually | ❌ None |
| **Scalability** | ✅ 20+ queries easy | ✅ 20+ queries easy | ❌ Becomes unwieldy |

### Offline strategy phasing

| Criteria | α (TQ persister) Q3 | β (SW R/W) Q3 | γ (RxDB) Q3 |
|----------|:---:|:---:|:---:|
| **Offline reads** | ✅ | ✅ | ✅ |
| **Offline writes** | ❌ | ⚠️ Partial (manual) | ✅ |
| **Implementation effort** | Low (~1 day) | Medium (~5 days) | High (~15 days) |
| **Operation cost** | None | Low | Medium |
| **Migration path to richer offline** | ✅ Add SW queue in Q4 | ⚠️ Redundant with Q4 plan | ⚠️ Overkill for Q3 |
| **Risk** | Low | Medium | High |

## Decision

**Accepted:**

- **Server state:** TanStack Query (React Query v5)
- **Client state:** Zustand
- **Q3 offline strategy:** TanStack Query `persistQueryClient` to IndexedDB — offline reads available, offline writes display a user-friendly message
- **Q4 offline strategy (future):** Service Worker mutation queue + Background Sync — queued writes replayed on reconnection, building on the SW installed for push notifications

## Consequences

### Positive
- Clear separation of concerns — TanStack Query owns server cache, Zustand owns UI state
- Users can open the app offline and see their last-fetched data (lists, items, assignees)
- Low implementation risk for Q3 — `persistQueryClient` is a well-documented plugin
- Q4 upgrade path is natural: the same SW that handles push notifications will handle mutation queuing
- No custom backend server needed — keeps deployment simple (static host + Supabase)

### Negative
- Offline writes in Q3 will show an error toast — users must be online to add, complete, or assign tasks
- `persistQueryClient` stores cached data, not a full local replica — stale data may show until refetch on reconnect
- TanStack Query adds ~15 KB gzipped to the bundle

### Neutral
- Team should learn TanStack Query patterns: `useQuery`, `useMutation`, `useQueryClient`, `invalidateQueries`
- Zustand stores should be small and focused — one store per domain concern (e.g., `useHouseholdStore`, `useUIStore`)
- Supabase real-time subscriptions can be layered on top later to push changes from other household members

## Compliance

- Every Supabase data operation must go through a TanStack Query hook or mutation — no direct `supabase-js` calls in components
- Client-only state (modals, filters, current household) must use Zustand, not React Context or useState lifted to a parent
- `persistQueryClient` must be configured with a TTL per query type (default: 5 minutes, tasks: 30 seconds for shared households)
- Q4 offline write implementation must be tracked as a new ADR (this ADR records the intent, not the final design)

## Future

The following evolution path is planned but not yet implemented:

| Phase | Capability | Mechanism | When |
|-------|-----------|-----------|------|
| Q3 | Offline reads | `persistQueryClient` → IndexedDB | Now |
| Q4 | Offline writes | SW `Background Sync` → replay queued mutations | Future ADR |
| Q4 | Multi-user live updates | Supabase real-time channel subscriptions | Future ADR |
| Future | Full local-first | Evaluate RxDB / wa-sqlite if offline becomes primary concern | If needed |

---
title: Push Notification Strategy — Web Push API
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0011: Push Notification Strategy — Web Push API

## Context

The Shared To-Do Lists epic includes a story ([EP0004-ST0006](../docs/project-management/04-story/EP0004-ST0006-push-notifications-for-task-assignments-and-due-dates.md)) for push notifications when:
- A household member is assigned a task item
- A task item's due date is approaching

The SPA is an installable PWA (per ADR-0002), which means push notifications must use the **Web Push API** — not native FCM or APNs. The service worker is already part of the architecture (per ADR-0002 and the service-worker-strategy.md doc).

Key constraints:
- No custom backend server in Q3 — the SPA talks directly to Supabase
- Supabase does not natively send Web Push notifications — we need a mechanism to trigger push from database events
- iOS Safari supports Web Push since iOS 16.4 — coverage is adequate for the target audience
- Push notification delivery is inherently unreliable on the web (especially iOS) — the app must not depend on notifications for core functionality
- The Epic marks push notifications as Q3, but the service-worker-strategy.md defers them to Q4 — this ADR resolves the timeline

## Options

### Option A: Supabase Edge Function + Web Push API (Q4)

A Supabase Edge Function (Deno/TypeScript) listens to database changes via `pg_notify` or a scheduled cron job, and sends Web Push notifications through the `web-push` library. The Edge Function runs on Supabase's managed infrastructure.

**Flow:**
```
1. User A assigns task to User B in the SPA
2. SPA calls Supabase INSERT on task_assignees
3. PostgreSQL trigger fires → sends pg_notify to Edge Function
4. Edge Function looks up User B's push subscription from push_subscriptions table
5. Edge Function calls Web Push API (via web-push library) → browser push
6. Service Worker receives push event → shows notification
```

### Option B: Third-party service (OneSignal, Firebase Cloud Messaging)

Integrate a third-party push service that abstracts Web Push complexity. OneSignal offers a generous free tier and handles subscription management, delivery, and analytics.

**Flow:**
```
1. User A assigns task to User B
2. SPA sends event to OneSignal API
3. OneSignal delivers push to User B's device via Web Push
```

### Option C: Client-side polling with notification API

No server-side push. The SPA periodically polls for new assignments (via TanStack Query's `refetchInterval`) and shows an in-app notification using the `Notification` API when the app is open. Background notifications require the service worker + Web Push.

### Option D: Defer to Q4 — build notification UI in Q3, push delivery in Q4

Build the **notification preferences UI** and **in-app notification banner** in Q3 (so the feature works when the app is open), but defer the actual Web Push delivery mechanism to Q4. Q3 ships with:
- In-app banner when a task is assigned (real-time via Supabase Realtime subscription)
- Notification preference toggle (opt-in/out)
- Push subscription registration

## Evaluation

| Criteria | A — Supabase EF + Web Push | B — OneSignal | C — Client polling | D — Defer to Q4 |
|----------|:---:|:---:|:---:|:---:|
| **Implementation effort** | ⚠️ Medium (Edge Function + push service setup) | ✅ Low (integrate SDK) | ✅ Low (already have TanStack Query) | ✅ Lowest (in-app only now) |
| **Operational cost** | ✅ Supabase free tier includes Edge Functions | ⚠️ OneSignal free: 10K subscribers, limited features | ✅ Zero additional cost | ✅ Zero |
| **Background delivery** | ✅ Web Push via SW | ✅ Web Push via SW | ❌ Only when app is open | ❌ Q3 only in-app |
| **iOS Safari support** | ✅ (since 16.4) | ✅ (since 16.4) | ❌ (would need SW push) | ⚠️ Not needed until Q4 |
| **Reliability** | ⚠️ Web Push is best-effort | ✅ OneSignal handles retries | ❌ Polling interval dependent | ⚠️ Same as A in Q4 |
| **Vendor lock-in** | ✅ Open standard (Web Push) | ❌ Third-party dependency | ✅ None | ✅ None |
| **Story AC coverage (EP0004-ST0006)** | ✅ Full coverage in Q4 | ✅ Full coverage | ❌ Cannot do background push | ⚠️ Partial — in-app only in Q3 |
| **Complexity** | ⚠️ Edge Function + VAPID keys + subscription table | ✅ OneSignal handles most complexity | ✅ Simple | ✅ Simplest |

## Decision

**Accepted: Option D — Defer push delivery to Q4. Build notification preferences UI + in-app real-time notifications in Q3.**

Rationale:
1. **Q3 is about proving the core to-do list feature works.** Push notifications are a nice-to-have for the first daily-use release. The core value (shared to-do lists that work reliably) doesn't depend on push.
2. **The in-app notification UI is easy** — a toast/banner when a real-time Supabase Realtime event fires for a new assignment. This covers the "app is open" case, which is the most common scenario for active household members.
3. **Web Push setup requires infrastructure** — Supabase Edge Functions, VAPID key management, push subscription table, service worker push event handling. Deferring avoids blocking story implementation on infrastructure that isn't needed for the first users.
4. **The notification preference toggle** (AC-004 in EP0004-ST0006) can be built now — a simple Zustand store toggle that blocks notification display. The same toggle feeds into push subscription registration in Q4.
5. **This aligns with the service-worker-strategy.md document**, which already marks push as Q4.

### Q3 scope (build now)
- **In-app notification banner**: When the SPA receives a real-time Supabase Realtime event for a new task assignment, show a toast/banner at the top of the screen
- **Due-date indicator**: Badge/icon on task items with approaching due dates (AC-003)
- **Notification preference store**: Zustand store with `notificationsEnabled` flag — when off, suppress all in-app notifications
- **Push subscription registration**: Register the `PushSubscription` via the service worker and store it in a `push_subscriptions` table — this is data capture for Q4, no push is sent in Q3
- **UI for notification preference**: Settings toggle to enable/disable notifications

### Q4 scope (deferred)
- **Supabase Edge Function** that listens to task_assignee inserts and due_date approaching
- **Web Push delivery** via the `web-push` library
- **Background push** received by the service worker even when the app is closed
- **Notification click handling** — tapping a push notification opens the correct task list

## Consequences

### Positive
- Q3 to-do list feature ships without blocking on push infrastructure
- In-app notifications work immediately for active users (Realtime subscription)
- Notification preferences UI is built once and reused when push is added
- Push subscription data is collected in Q3 so Q4 rollout hits already-opted-in users
- Less Q3 risk — no Edge Function debugging, no VAPID key management

### Negative
- Users who close the app won't get notified of new assignments until Q4
- In-app banner is easy to miss if the user is on a different tab or has their phone locked
- The push subscription table and service worker registration must be built with Q4 in mind — avoid a redesign when push is added

### Neutral
- Team must learn Supabase Realtime subscriptions for the in-app banner (already planned per ADR-0004)
- Team must learn Web Push API concepts (VAPID, PushSubscription, push event) in preparation for Q4
- The `push_subscriptions` table must be designed now to capture the right data for Q4

## Compliance

- Q3 notifications MUST use Supabase Realtime subscriptions — no polling for new assignments
- The notification preference toggle MUST be stored in Zustand (client-side only for Q3)
- The `push_subscriptions` table MUST include: `id`, `profile_id`, `endpoint`, `keys` (p256dh, auth), `created_at`, `updated_at`
- Push subscription registration MUST not block the app startup — fire-and-forget after login
- Q4 push implementation MUST use the Supabase Edge Function + `web-push` library approach (Option A) — unless a compelling reason to use a third party emerges
- The AC-001 and AC-002 tests for EP0004-ST0006 are marked `@TestExempt` — push delivery cannot be automated in CI, as noted in the story

## References

- [EP0004-ST0006](../docs/project-management/04-story/EP0004-ST0006-push-notifications-for-task-assignments-and-due-dates.md) — Push notification story
- [ADR-0002](0002-installable-spa-architecture.md) — PWA architecture (service worker foundation)
- [ADR-0004](0004-state-management-and-offline-strategy.md) — Real-time subscriptions via Supabase Realtime
- [service-worker-strategy.md](../docs/architecture/service-worker-strategy.md) — SW caching and push notification deferment
- Web Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

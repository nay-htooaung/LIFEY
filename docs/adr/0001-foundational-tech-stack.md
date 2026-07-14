---
title: Foundational Tech Stack
status: Superseded
superseded-by: 0002
date: 2026-07-12
deciders: [tech-lead]
---

# ADR-0001: Foundational Tech Stack

## Context

LIFEY is a shared-life hub mobile app targeting iOS and Android. The Q3 2026 roadmap ("NOW") requires:

- Mobile app shell with navigation, household switching, feature flags
- Email/password authentication with invite keycodes
- Household management (create, join, switch, leave)
- Shared to-do lists with assignment, categories, due dates, and push notifications

The Q4 2026 roadmap ("NEXT") adds expense tracking and an AI agent. Later phases add recipes, groceries, household chat, and custom agents.

No application code exists yet. This ADR establishes the foundational technology choices across mobile, backend, and database layers.

### Constraints

- Cross-platform mobile (iOS + Android) from a single codebase
- Must support real-time collaboration (shared lists, notifications)
- Must enable future AI agent integration
- Personal project — minimize operational overhead and cost
- TypeScript preferred (developer preference)

---

## Options

### Mobile Framework

#### Option A: React Native with Expo

React Native compiles to native iOS and Android from a shared TypeScript/JavaScript codebase. Expo is the recommended toolchain that manages native build complexity (Xcode/Android Studio project files, native module linking, OTA updates).

#### Option B: Flutter

Google's cross-platform UI toolkit using Dart. Compiles to native ARM code. Strong performance, excellent UI consistency, but requires learning Dart and has a smaller native module ecosystem than React Native.

#### Option C: Kotlin Multiplatform (KMP) with Compose Multiplatform

Shared business logic in Kotlin with platform-specific UI or shared Compose UI. Growing ecosystem but still maturing. Requires Kotlin expertise.

---

### Backend & Database

#### Option A: Supabase

Supabase is an open-source Firebase alternative built on PostgreSQL. Provides: hosted PostgreSQL database, built-in authentication (email/password, OAuth), real-time subscriptions (WebSocket), Row Level Security, file storage, and Edge Functions for serverless logic.

#### Option B: Custom Node.js API + PostgreSQL

A traditional architecture: Node.js/Express or Fastify API server (TypeScript), PostgreSQL database (self-hosted or managed like Railway/Render), and separate services for auth (JWT), real-time (WebSocket/Socket.IO), and push notifications (Firebase Cloud Messaging).

#### Option C: Firebase

Google's BaaS: Firestore (NoSQL), Firebase Auth, Cloud Messaging, Cloud Functions. Good developer experience but NoSQL database is a poor fit for relational data (expenses, tasks with assignees, categories) and creates vendor lock-in.

---

## Evaluation

### Mobile Framework

| Criteria | React Native + Expo | Flutter | KMP + Compose |
|----------|--------------------|---------|---------------|
| Code sharing | ✅ Single codebase | ✅ Single codebase | ⚠️ Shared logic only |
| Ecosystem maturity | ✅ Very mature | ✅ Mature | ⚠️ Growing |
| TypeScript | ✅ Native | ❌ Dart required | ❌ Kotlin required |
| Native module access | ✅ Expo SDK covers most needs | ✅ Strong | ⚠️ More manual work |
| AI/ML library access | ✅ JavaScript/TS ecosystem | ⚠️ Smaller | ❌ Limited |
| Team familiarity | ✅ | ⚠️ | ❌ |

### Backend & Database

| Criteria | Supabase | Node.js + PostgreSQL | Firebase |
|----------|----------|---------------------|----------|
| Database | ✅ PostgreSQL (relational) | ✅ PostgreSQL (relational) | ❌ Firestore (NoSQL) |
| Auth | ✅ Built-in (email, OAuth) | ⚠️ Manual implementation | ✅ Built-in |
| Real-time | ✅ PostgreSQL replication → WebSocket | ⚠️ Must build yourself | ✅ Built-in |
| Push notifications | ✅ Built-in | ⚠️ Must integrate FCM | ✅ Built-in |
| Row-level security | ✅ PostgreSQL RLS | ⚠️ Manual middleware | ⚠️ Security Rules (NoSQL) |
| Operational overhead | ✅ Managed platform | ⚠️ Must manage/choose host | ✅ Managed platform |
| Vendor lock-in | ⚠️ Open source, self-hostable | ✅ Full control | ❌ Proprietary |
| AI agent future | ⚠️ Edge Functions limited; separate service needed | ✅ Can add Python service later | ⚠️ Cloud Functions limited |
| Data model fit for shared households | ✅ PostgreSQL RLS per household ID | ✅ PostgreSQL RLS per household ID | ❌ NoSQL complex for relational queries |
| Cost (early stage) | ✅ Generous free tier | ⚠️ Requires at least one paid host | ✅ Generous free tier |

---

## Decision

**Accepted: React Native with Expo (mobile) + Supabase (backend/database)**

### Why React Native + Expo

- TypeScript end-to-end (mobile, potential future backend functions)
- Largest mobile ecosystem — navigation, UI kits, notifications, everything we need is mature and well-documented
- Expo eliminates native build complexity for a small team
- Same language across stack reduces context-switching
- Expo's EAS Build handles iOS/Android deployment

### Why Supabase

- PostgreSQL is the right database for this domain: relational data (users, households, tasks, expenses), complex queries (who owes what in a household), and Row Level Security for multi-tenant data isolation
- Built-in auth covers our immediate needs (email/password, invite keycodes) and future OAuth
- Real-time subscriptions via WebSocket enable live-updating to-do lists and notifications without building a separate WebSocket server
- Supabase Studio provides a UI for browsing data during development — invaluable for a solo developer
- Open source with self-hosting option avoids lock-in
- Generous free tier (2 projects, 500 MB database, 50,000 monthly active users) covers development and early beta

### Future AI Agent Architecture

The AI agent (Q4 2026) will require a separate service — Supabase Edge Functions are too constrained for AI workloads. The plan is to add a Python/FastAPI service (or similar) that connects to the same PostgreSQL database and exposes an API for the mobile app and Supabase Edge Functions to call. This decision is deferred to a future ADR.

---

## Consequences

### Positive
- Single language (TypeScript) across the entire stack reduces cognitive load
- Expo abstracts away iOS/Android native build pain
- Supabase provides auth, database, real-time, and storage out of the box — zero backend code needed for Q3
- Row Level Security means data isolation logic lives in the database, not application code
- Fastest path to a working prototype given the constraints

### Negative
- Supabase adds a platform dependency — if their API changes or pricing shifts, migration requires effort
- Supabase Edge Functions are Node.js (not ideal for Python-based AI work later)
- React Native performance for complex animations or heavy lists may require native modules
- Expo's managed workflow has limits (though Expo Dev Client + prebuild handles custom native modules)

### Neutral
- Team needs to learn Supabase concepts (RLS policies, real-time channels, Edge Functions)
- Expo SDK updates track React Native releases with a slight delay
- Future AI agent service introduces a second language/runtime (Python)

---

## Compliance

- All new mobile code must use TypeScript with strict mode
- All database access from the mobile app must go through Supabase RLS policies — no service_role key in client code
- All feature-flagged modules in the mobile app must use the shell's feature-flag system (not ad-hoc conditional rendering)
- Future backend services must connect to the same PostgreSQL database via the connection pool, not through Supabase APIs

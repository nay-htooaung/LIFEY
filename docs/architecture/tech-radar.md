---
title: Tech Radar — LIFEY
status: Active
last_reviewed: 2026-07-14
maintainer: tech-lead
---

# Tech Radar

A living inventory of every technology used in the LIFEY project. Each entry has a status and links to the relevant ADR.

## Rings

| Ring | Meaning |
|------|---------|
| **Adopt** | Proven, standardised — use by default |
| **Trial** | Confident but still evaluating in production |
| **Assess** | Worth exploring with a proof of concept |
| **Hold** | Known issues — avoid without strong justification |

---

## Frontend — SPA

| Technology | Ring | Purpose | ADR |
|-----------|------|---------|-----|
| **Vite** | Adopt | Build tool and dev server | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **React** | Adopt | UI framework | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **TypeScript (strict)** | Adopt | Language — all app code | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **React Router** | Adopt | Client-side routing | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **vite-plugin-pwa** | Adopt | PWA manifest + service worker generation | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **Supabase JS client** | Adopt | Database, auth, real-time subscriptions | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **Tailwind CSS** | Adopt | Utility-first styling | [ADR-0008](docs/adr/0008-tailwind-css.md) |
| **shadcn/ui** | Adopt | UI component strategy — copy-paste components on Radix primitives | [ADR-0003](docs/adr/0003-ui-component-strategy.md) |
| **Radix UI Primitives** | Adopt | Headless, accessible component primitives | [ADR-0003](docs/adr/0003-ui-component-strategy.md) |
| **TanStack Query** | Adopt | Server state — caching, refetching, optimistic updates, offline persister | [ADR-0004](docs/adr/0004-state-management-and-offline-strategy.md) |
| **Zustand** | Adopt | Client state — current household, modals, filters | [ADR-0004](docs/adr/0004-state-management-and-offline-strategy.md) |
| **Supabase Auth (Magic Link)** | Adopt | Authentication — passwordless email sign-in | [ADR-0006](docs/adr/0006-authentication-flow.md) |
| **Web Push API** | Trial | Push notifications (browser) | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |

## Development Tooling

| Technology | Ring | Purpose | ADR |
|-----------|------|---------|-----|
| **Supabase CLI** | Adopt | Local dev — `supabase start`, migrations, seed data | [ADR-0005](docs/adr/0005-supabase-local-development.md) |
| **Docker Desktop (WSL2)** | Adopt | Container runtime for the local Supabase stack | [ADR-0005](docs/adr/0005-supabase-local-development.md) |

## Backend & Infrastructure

| Technology | Ring | Purpose | ADR |
|-----------|------|---------|-----|
| **Supabase** | Adopt | Hosted PostgreSQL, auth, real-time, storage | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **PostgreSQL** | Adopt | Relational database | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **Row Level Security** | Adopt | Multi-tenant data isolation | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **Cloudflare Pages** | Adopt | Static host — global CDN, SPA fallback, PWA headers, deploy previews | [ADR-0007](docs/adr/0007-deploy-host.md) |

## Deferred / Future

| Technology | Ring | Purpose | Notes |
|-----------|------|---------|-------|
| **Python + FastAPI** | Assess | AI agent service (Q4 2026) | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) mentions this |
| **Capacitor** | Assess | Wrap SPA in native WebView (when native app is needed) | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **React Native** | Hold | Native mobile framework | Deferred per [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **Mantine** | Hold | Full-component UI library — rejected due to bundle size and theme rigidity | [ADR-0003](docs/adr/0003-ui-component-strategy.md) |
| **Flutter** | Hold | Cross-platform alternative | Evaluated and not chosen |
| **OAuth (Google/Apple)** | Assess | Alternative sign-in method — deferred to Q4 due to PWA redirect complexity | [ADR-0006](docs/adr/0006-authentication-flow.md) |
| **Email + Password auth** | Hold | Traditional auth — rejected due to password reset friction and sign-up abandonment | [ADR-0006](docs/adr/0006-authentication-flow.md) |
| **Netlify** | Hold | Static host — evaluated but Cloudflare Pages chosen for faster CDN and unlimited requests | [ADR-0007](docs/adr/0007-deploy-host.md) |
| **Firebase** | Hold | BaaS — rejected due to NoSQL lock-in | — |

---

## Decision History

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-07-14 | Added Adopt entries for Vite, React, React Router, PWA plugin | Per ADR-0002 shift from RN to SPA |
| 2026-07-14 | Moved React Native to Hold | Deferred native mobile — SPA first |
| 2026-07-14 | Added Tailwind CSS as Adopt | De facto decision during shell implementation |
| 2026-07-14 | Added shadcn/ui + Radix as Adopt, Mantine as Hold | Per [ADR-0003](docs/adr/0003-ui-component-strategy.md) — component strategy finalised |
| 2026-07-14 | Added TanStack Query + Zustand as Adopt | Per [ADR-0004](docs/adr/0004-state-management-and-offline-strategy.md) — state management and offline strategy |
| 2026-07-14 | Added Supabase CLI + Docker Desktop as Adopt | Per [ADR-0005](docs/adr/0005-supabase-local-development.md) — local dev environment finalised |
| 2026-07-14 | Added Supabase Auth (Magic Link) as Adopt, Email+Password as Hold | Per [ADR-0006](docs/adr/0006-authentication-flow.md) — magic link primary, OAuth deferred to Q4 |
| 2026-07-14 | Moved Cloudflare Pages from Assess to Adopt, Netlify removed | Per [ADR-0007](docs/adr/0007-deploy-host.md) — deploy host finalised: Cloudflare Pages |
| 2026-07-14 | Added Tailwind CSS ADR reference (was de facto) | Per [ADR-0008](docs/adr/0008-tailwind-css.md) — styling approach formalised |

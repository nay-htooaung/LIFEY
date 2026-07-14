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
| **Vitest** | Adopt | Unit/integration test runner | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **Testing Library** | Adopt | Component testing — accessible queries | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **ESLint** | Adopt | Code quality linting (flat config) | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **Prettier** | Adopt | Code formatting | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **React Hook Form** | Adopt | Form state management | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **zod** | Adopt | Schema validation and type inference | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |

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
| **Python 3.13 + FastAPI** | Assess | AI agent service (Q4 2026) | [ADR-0001](docs/adr/0001-foundational-tech-stack.md), [ADR-0010](docs/adr/0010-project-structure-and-workspace.md) |
| **Web Push API** | Trial | Push notifications (browser) | [ADR-0011](docs/adr/0011-push-notification-strategy.md) |
| **Supabase Edge Functions** | Assess | Serverless push notification delivery (Q4) | [ADR-0011](docs/adr/0011-push-notification-strategy.md) |
| **Capacitor** | Assess | Wrap SPA in native WebView (when native app is needed) | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **React Native** | Hold | Native mobile framework | Deferred per [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **Mantine** | Hold | Full-component UI library — rejected due to bundle size and theme rigidity | [ADR-0003](docs/adr/0003-ui-component-strategy.md) |
| **Biome** | Hold | All-in-one linter/formatter — evaluated but not chosen | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **Formik + Yup** | Hold | Form handling — rejected due to re-render cost and shadcn/ui incompatibility | [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) |
| **Flutter** | Hold | Cross-platform alternative | Evaluated and not chosen |
| **OAuth (Google/Apple)** | Assess | Alternative sign-in method — deferred to Q4 due to PWA redirect complexity | [ADR-0006](docs/adr/0006-authentication-flow.md) |
| **Email + Password auth** | Hold | Traditional auth — rejected due to password reset friction and sign-up abandonment | [ADR-0006](docs/adr/0006-authentication-flow.md) |
| **Netlify** | Hold | Static host — evaluated but Cloudflare Pages chosen for faster CDN and unlimited requests | [ADR-0007](docs/adr/0007-deploy-host.md) |
| **Firebase** | Hold | BaaS — rejected due to NoSQL lock-in | — |

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
| 2026-07-14 | Added Vitest, Testing Library, ESLint, Prettier, React Hook Form, zod as Adopt | Per [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) — dev toolchain finalised |
| 2026-07-14 | Added Biome as Hold, Formik+Yup as Hold | Per [ADR-0009](docs/adr/0009-frontend-dev-toolchain.md) — evaluated but not chosen |
| 2026-07-14 | Updated Python+FastAPI status to Assess | Per [ADR-0010](docs/adr/0010-project-structure-and-workspace.md) — backend directory structure planned |
| 2026-07-14 | Added Supabase Edge Functions as Assess, Web Push API as Trial | Per [ADR-0011](docs/adr/0011-push-notification-strategy.md) — push notification strategy finalised |

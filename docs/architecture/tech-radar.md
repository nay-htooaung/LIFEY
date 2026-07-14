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
| **Tailwind CSS** | Adopt | Utility-first styling | De facto decision during shell epic |
| **Web Push API** | Trial | Push notifications (browser) | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |

## Backend & Infrastructure

| Technology | Ring | Purpose | ADR |
|-----------|------|---------|-----|
| **Supabase** | Adopt | Hosted PostgreSQL, auth, real-time, storage | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **PostgreSQL** | Adopt | Relational database | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **Row Level Security** | Adopt | Multi-tenant data isolation | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) |
| **Netlify / Cloudflare Pages** | Assess | Static hosting (to be decided at deploy time) | — |

## Deferred / Future

| Technology | Ring | Purpose | Notes |
|-----------|------|---------|-------|
| **Python + FastAPI** | Assess | AI agent service (Q4 2026) | [ADR-0001](docs/adr/0001-foundational-tech-stack.md) mentions this |
| **Capacitor** | Assess | Wrap SPA in native WebView (when native app is needed) | [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **React Native** | Hold | Native mobile framework | Deferred per [ADR-0002](docs/adr/0002-installable-spa-architecture.md) |
| **Flutter** | Hold | Cross-platform alternative | Evaluated and not chosen |
| **Firebase** | Hold | BaaS — rejected due to NoSQL lock-in | — |

---

## Decision History

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-07-14 | Added Adopt entries for Vite, React, React Router, PWA plugin | Per ADR-0002 shift from RN to SPA |
| 2026-07-14 | Moved React Native to Hold | Deferred native mobile — SPA first |
| 2026-07-14 | Added Tailwind CSS as Adopt | De facto decision during shell implementation |

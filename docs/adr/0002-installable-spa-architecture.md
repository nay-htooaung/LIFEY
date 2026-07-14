---
title: Installable SPA Architecture
status: Accepted
date: 2026-07-14
deciders: [tech-lead, user]
supersedes: 0001
---

# ADR-0002: Installable SPA Architecture

## Context

[ADR-0001](0001-foundational-tech-stack.md) proposed React Native with Expo as the mobile framework. On further reflection, the project prefers to minimize technology dependencies and defer native iOS/Android apps to a later phase when there is dedicated mobile development effort.

Key drivers for this change:

- The Q3 roadmap features (household management, to-do lists, auth) are all achievable in a web SPA
- No native APIs (camera, contacts, background fetch) are needed in Q3
- An installable SPA eliminates the entire native build toolchain (Xcode, Android Studio, EAS Build)
- Native iOS/Android apps can be wrapped later via Capacitor or built natively when dedicated mobile effort begins
- A PWA reaches iOS and Android immediately via the browser with no app store friction

The backend decision (Supabase) from ADR-0001 remains unchanged — Supabase's JS client, real-time WebSocket subscriptions, and Row Level Security work identically in the browser.

### Constraints

- Cross-platform (iOS + Android + desktop) from a single codebase
- Must support installability (add to home screen, offline capability)
- Must support real-time collaboration (shared lists, notifications)
- Must enable future native mobile apps (iOS/Android) without a rewrite
- Must enable future AI agent integration
- Personal project — minimize operational overhead and cost
- TypeScript end-to-end

---

## Options

### Option A: React Native with Expo (from ADR-0001)

React Native compiles to native iOS and Android from a shared TypeScript/JavaScript codebase. Expo manages the native build complexity. This requires the full native toolchain (Xcode, Android Studio, CocoaPods, EAS Build) and app store submission for distribution.

### Option B: Installable SPA — Vite + React + React Router + PWA

A modern single-page application built with Vite, React, and React Router. A service worker enables offline caching and installability via the Web App Manifest. Deployed to a static host (Netlify, Cloudflare Pages, Vercel). No native build toolchain required.

Push notifications use the Web Push API (via Supabase's Realtime or a lightweight service). Offline support via Workbox or vite-plugin-pwa.

Future native apps can wrap the SPA in a WebView via Capacitor, or rebuild natively using the same Supabase backend — the data layer is shared.

### Option C: Next.js (SSR/SSG)

React framework with server-side rendering and static generation. Adds a Node.js server (or serverless functions) for SSR. More conventional for content sites but adds complexity for an authenticated app where most pages are behind a login wall. SEO benefits are minimal for a household management app.

---

## Evaluation

| Criteria | React Native + Expo | Vite SPA + PWA | Next.js |
|----------|--------------------|-----------------|---------|
| Native install toolchain | ❌ Xcode + Android Studio required | ✅ Browser + CLI only | ✅ Browser + CLI only |
| App store required | ✅ Required for iOS | ❌ PWA installable directly | ❌ PWA installable directly |
| Code sharing (future native) | ✅ Single codebase | ⚠️ SPA code is shareable; UI must be rebuilt natively | ⚠️ Same as Vite SPA |
| Push notifications | ✅ Native FCM | ⚠️ Web Push API (iOS Safari limitations) | ⚠️ Web Push API |
| Offline support | ✅ Built-in | ⚠️ Service worker (caching strategy matters) | ⚠️ Service worker |
| Real-time collaboration | ✅ Supabase JS client | ✅ Supabase JS client (identical) | ✅ Supabase JS client |
| TypeScript | ✅ Native | ✅ Native | ✅ Native |
| Ecosystem maturity | ✅ Mature | ✅ Very mature | ✅ Very mature |
| Deployment complexity | ⚠️ EAS Build, app review | ✅ Static hosting (Netlify/CF Pages) | ⚠️ Server required or serverless |
| Developer iteration speed | ⚠️ Expo Go or dev build | ✅ Hot module replacement in browser | ✅ Fast refresh |
| Operational cost | ⚠️ EAS Build $, Apple Developer $99/yr | ✅ Free tier hosting, no Apple fee until native | ⚠️ Server costs if SSR |

---

## Decision

**Accepted: Option B — Installable SPA (Vite + React + React Router + PWA)**

### Why Vite + React Router over Next.js

- This is an authenticated app — SSR/SEO benefits of Next.js don't apply meaningfully
- Vite + React Router is simpler: no server, no SSR considerations, no `use client` boundaries
- Deploy to any static host with zero server cost during development and beta
- Fewer concepts to learn and maintain for a solo project

### Why not React Native

- No native API requirements in Q3 roadmap
- Xcode/Android Studio toolchain adds friction disproportionate to current needs
- Apple Developer Program ($99/yr) and app review cycles slow iteration
- The SPA can be wrapped in Capacitor or replaced with native code when mobile app effort begins

### Relationship to ADR-0001

ADR-0001's **backend decision (Supabase) is ratified and unchanged**. Only the mobile framework decision is revised from React Native + Expo to an installable SPA. The consequences regarding Supabase (RLS, real-time, free tier) all remain in effect.

---

## Consequences

### Positive
- Zero native build toolchain — pure web development
- Instant deploy to static hosting (Netlify, Cloudflare Pages, Vercel free tiers)
- No Apple Developer Program fee or app review during development
- Hot module replacement in the browser for fast iteration
- Same codebase works on iOS, Android, desktop — no platform-specific builds
- Supabase backend is identical regardless of client platform
- Future native apps can reuse all Supabase queries, RLS policies, and backend logic

### Negative
- iOS Safari Web Push API is less reliable than native push — notifications may require a fallback strategy
- Offline support requires careful service worker caching (workbox/vite-plugin-pwa)
- No access to native device APIs (camera, contacts, sensors) without a bridge
- PWA install prompt is less prominent than App Store discovery
- iOS PWA lacks some native-integration features (badge count, background sync)

### Neutral
- Team must learn PWA/service worker patterns
- React codebase can be reused when native apps are built later
- Supabase JS client for browser is well-documented and identical API to React Native

---

## Compliance

- All application code must use TypeScript with strict mode
- The PWA must register a service worker with offline caching for core routes
- A Web App Manifest (`manifest.json`) must be present with `display: standalone`
- All database access must go through Supabase RLS policies — no service_role key in client code
- Future native apps must connect to the same Supabase backend; the data layer is shared, not duplicated
- Push notifications must use a standards-based Web Push approach (not vendor-specific)

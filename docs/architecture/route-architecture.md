# Route Architecture — LIFEY SPA

> **Audience:** Developers
> **Last updated:** 2026-07-14 (password auth)
> **Related decisions:** [ADR-0002](../adr/0002-installable-spa-architecture.md), [ADR-0004](../adr/0004-state-management-and-offline-strategy.md), [ADR-0006](../adr/0006-authentication-flow.md)

---

## Overview

This document defines the route tree structure for the LIFEY SPA. It covers route patterns, authentication guards, household scoping, and the relationship between routes and Zustand state.

---

## Route Tree

```
/                          → redirect to /household/:activeId/tasks  (logged in)
                             redirect to /login                        (logged out)

/login                     → email + password login (or invite code → sign-up)
/forgot-password           → email input → 6-digit code → new password

/household/:householdId
  /tasks                   → task list view (story 09–15)
  /expenses                → expense view (Q4, feature-flagged off)
  /settings
    /profile               → display name, avatar
    /household             → household name, members, invite codes
    /features              → feature flag admin (admin only)

/*                         → 404 "Page not found"
```

---

## Route Layers

Routes are organised into three logical layers, each handled by a React Router component:

### Layer 1: Auth Gate (`AuthGate`)

Wraps the entire app. Reads the Supabase session from Zustand `useAuthStore`. If no session exists, renders the login flow. If a session exists, renders the app shell.

```
<AuthGate>
  ├── /login                ← no session → show login
  ├── /forgot-password      ← no session → password reset flow
  └── <AppShell>            ← has session → show app
```

### Layer 2: App Shell (`AppShell`)

A layout route that renders the persistent UI shell:

- **Top bar:** Household switcher (Zustand `useHouseholdStore`), hamburger/menu
- **Navigation:** Bottom tab bar or sidebar (reads feature flags)
- **Children:** The current route's page component

```
<AppShell>
  ├── <HouseholdSwitcher />    ← reads/writes useHouseholdStore
  ├── <NavBar />               ← reads feature flags from TanStack Query
  └── <Outlet />               ← current page
```

### Layer 3: Scoped Routes

Feature pages rendered inside `<Outlet />`. They read `:householdId` from the URL params and ensure it matches the active household in Zustand.

---

## Household Context

### How the active household flows

```
User taps household in switcher
       │
       ▼
useHouseholdStore.setActive(id)     ← Zustand
       │
       ▼
React Router navigates to          ← preserved in URL
/household/:householdId/tasks
       │
       ▼
Page component reads               ← both sources must agree
  - URL param: useParams().householdId
  - Zustand:   useHouseholdStore((s) => s.activeId)
```

### Consistency rule

The URL and Zustand store must always be in sync. The canonical source is **Zustand** — URL updates are derived from the store, not the other way around:

```typescript
// ✅ Correct: store changes → URL updates
function switchHousehold(id: string) {
  setActive(id);
  navigate(`/household/${id}/tasks`);
}

// ❌ Wrong: URL changes → store updates (causes race conditions)
```

### Single household edge case

If the user has only one household, the switcher displays the household name but does not expand. The route still contains `:householdId` — it's always the user's only household.

---

## Route Definitions (pseudocode)

```typescript
const router = createBrowserRouter([
  {
    element: <AuthGate />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        element: <AppShell />,
        loader: householdLoader,      // fetch user's households
        children: [
          {
            path: "/",
            loader: redirectLoader,   // redirect to /household/:id/tasks
          },
          {
            path: "/household/:householdId",
            children: [
              {
                index: true,
                loader: redirectLoader, // redirect to /household/:id/tasks
              },
              {
                path: "tasks",
                element: <TasksPage />,
              },
              {
                path: "expenses",
                element: <ExpensesPage />,   // feature-flagged
              },
              {
                path: "settings",
                children: [
                  { path: "profile", element: <ProfilePage /> },
                  { path: "household", element: <HouseholdSettings /> },
                  { path: "features", element: <FeatureFlagsPage /> },
                ],
              },
            ],
          },
          {
            path: "*",
            element: <NotFoundPage />,
          },
        ],
      },
    ],
  },
]);
```

---

## Feature Flag Route Guard

Routes for features that are not yet available use a guard component:

```typescript
function FeatureGate({ flag, children }: { flag: string; children: React.ReactNode }) {
  const { data: flags } = useFeatureFlags();
  if (!flags?.[flag]) return <Navigate to="/" />;
  return <>{children}</>;
}
```

Used inside route elements:

```typescript
{
  path: "expenses",
  element: <FeatureGate flag="expenses"><ExpensesPage /></FeatureGate>,
}
```

Feature flags are fetched once on app load via TanStack Query (with `staleTime: 5min`) and stored in the query cache.

---

## 404 Handling

Any unmatched path under `/` renders `<NotFoundPage />` inside the app shell — the user sees a friendly message with a link back to the main app. The Cloudflare Pages `_redirects` file ensures the SPA fallback serves `index.html` for all paths, letting React Router handle the 404.

---

## Evolution

| Phase | Change | When |
|-------|--------|------|
| Q3 | Route tree as defined above | Now |
| Q3 | Protected routes behind `FeatureGate` for expenses | Now (off by default) |
| Q4 | Add AI agent routes (`/agent/*`) | Future |
| Future | Deep linking to specific task items (`/household/:id/tasks?item=:itemId`) | If needed |

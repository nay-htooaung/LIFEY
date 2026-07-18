---
title: Supabase Publishable API Keys
status: Accepted
date: 2026-07-18
deciders: [tech-lead]
---

# ADR-0013: Supabase Publishable API Keys

## Context

The SPA uses `supabase-js` to communicate directly with Supabase from the browser. The client library needs a Supabase API key that identifies the project to the Supabase gateway. Historically, Supabase provided two key types: an **anon key** (public, meant for browser clients) and a **service_role key** (secret, bypasses RLS). In 2025-2026, Supabase transitioned to a new naming convention: **publishable key** (public) and **secret key** (private).

Key considerations:

- The project's Supabase instance was created under the new key system — the dashboard only exposes publishable/secret keys, not legacy anon/service_role keys
- Both anon and publishable keys are **public-by-design** — they are meant to be exposed in browser bundles and provide zero security on their own; access control is enforced entirely through Row Level Security policies
- Supabase plans to deprecate the legacy key naming; new projects no longer have the option to use anon keys
- The environment variable was initially named `VITE_SUPABASE_ANON_KEY` (matching common tutorials) but the actual key value was a publishable key — a naming mismatch

## Options

### Option A: Publishable key (new system — adopted)

Rename the env var to `VITE_SUPABASE_PUBLISHABLE_KEY`. Match the Supabase dashboard naming exactly.

### Option B: Anon key (legacy name)

Keep `VITE_SUPABASE_ANON_KEY` as the env var name, treating the publishable key as if it were an anon key. Maintains backward compatibility with existing documentation and community tutorials.

### Option C: Both (alias fallback)

Support both env var names — the Supabase client falls back from `VITE_SUPABASE_PUBLISHABLE_KEY` to `VITE_SUPABASE_ANON_KEY` if the former is not set.

## Evaluation

| Criteria | A — Publishable key | B — Legacy name | C — Both alias |
|----------|:---:|:---:|:---:|
| **Future-proof** | ✅ Matches Supabase's current and future API | ❌ Uses deprecated naming — will need migration | ⚠️ Uses new name but supports old |
| **Clarity** | ✅ Env var name matches dashboard exactly | ❌ Dashboard says "publishable", code says "anon" — mismatch | ⚠️ Fallback adds indirection |
| **Simplicity** | ✅ Single env var, zero fallback logic | ✅ Same | ❌ Requires fallback logic in client init |
| **Deprecation risk** | ✅ No migration needed later | ❌ Will break when Supabase removes legacy keys | ⚠️ Migration still needed, but less urgent |
| **Community alignment** | ⚠️ Newer convention, fewer tutorial references | ✅ Widely documented | ✅ Both covered |

## Decision

**Accepted: Option A — Publishable key.**

The Supabase project only has publishable/secret keys available — there is no anon key to reference. Using `VITE_SUPABASE_PUBLISHABLE_KEY` matches the dashboard naming exactly, eliminates confusion, and avoids a future migration when Supabase fully removes legacy key support. The functional behavior is identical: both key types are public-by-design and require RLS for security.

## Consequences

### Positive
- Env var name matches the Supabase dashboard exactly — no ambiguity
- No migration needed when Supabase deprecates legacy anon keys
- CI/CD, local dev, and production all use the same consistent naming
- New team members see the correct key name from day one

### Negative
- Slightly less aligned with older community tutorials that reference `VITE_SUPABASE_ANON_KEY`
- Team members accustomed to the legacy naming need to adjust

### Neutral
- `frontend/.env.example` renamed, `frontend/src/lib/supabase.ts` updated, `AGENTS.md` updated
- The actual key value is unchanged — the Supabase project was always publishable-based
- No functional difference — both key types are public-by-design with RLS-based security

## Compliance

- All environments (local, preview, production) must use `VITE_SUPABASE_PUBLISHABLE_KEY` as the env var name
- The Supabase client in `frontend/src/lib/supabase.ts` must read `VITE_SUPABASE_PUBLISHABLE_KEY`
- `.env.example` must reference `VITE_SUPABASE_PUBLISHABLE_KEY`
- Legacy references to `VITE_SUPABASE_ANON_KEY` in documentation should be updated when encountered

## References

- See [ADR-0005](0005-supabase-local-development.md) for the local dev environment setup

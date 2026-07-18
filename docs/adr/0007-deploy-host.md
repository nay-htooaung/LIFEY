---
title: Deploy Host — Cloudflare Pages
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0007: Deploy Host — Cloudflare Pages

## Context

The SPA produces a static build (`vite build` → `dist/` with HTML, JS, CSS, and a service worker). It needs a host that:

- Serves static files over a global CDN
- Supports **SPA fallback routing** (all paths redirect to `index.html`)
- Serves the **PWA service worker** with correct MIME types and cache headers
- Supports **custom domain** with HTTPS
- Provides **deploy previews** for PR branches
- Has a **generous free tier** — the app has no users yet
- Requires **no server-side runtime** (no Node, no Python — Supabase handles the backend)

## Options

### Option A: Cloudflare Pages

Static site hosting on Cloudflare's global CDN (330+ edge locations). Connected to Git — pushes deploy automatically. Supports SPA fallback via a `_redirects` file. Includes Cloudflare Access for locking the preview environment.

### Option B: Netlify

The original static SPA host. Same Git-connected workflow. SPA fallback via `_redirects`. Deploy previews per PR. Functions (serverless) available if needed later.

### Option C: Vercel

Great DX, widely used. SPA fallback via `vercel.json`. Generous free tier. However, Vercel is increasingly optimised toward Next.js and its framework — a plain Vite SPA gets little benefit but the same platform overhead.

### Option D: GitHub Pages

Free, integrated with the repo. Simple to set up, but **lacks SPA fallback** — requires a custom 404.html hack. No deploy previews. No PWA-specific header control.

## Evaluation

| Criteria | Cloudflare Pages | Netlify | Vercel | GitHub Pages |
|----------|:---:|:---:|:---:|:---:|
| **Global CDN** | ✅ 330+ locations | ✅ 6+ locations (Fastly) | ✅ 100+ locations | ✅ Fastly (same as Netlify) |
| **SPA fallback** | ✅ `_redirects` | ✅ `_redirects` | ✅ `vercel.json` | ⚠️ Custom 404 hack |
| **PWA headers** | ✅ Full control | ✅ Full control | ✅ Full control | ❌ Limited control |
| **Deploy previews** | ✅ Per branch | ✅ Per PR (deploy previews) | ✅ Per PR | ❌ |
| **Free tier** | ✅ Unlimited requests, 1 build concurrency | ✅ 100 GB bandwidth, 300 build min/month | ✅ 100 GB bandwidth, 6000 build min/month | ✅ Free (but limited) |
| **Bandwidth limit** | ✅ Unlimited on Workers plan | ⚠️ 100 GB/month | ⚠️ 100 GB/month | ⚠️ 100 GB/month, 1 GB repo limit |
| **Build minutes** | ✅ 500/min month (free) | ⚠️ 300 min/month | ✅ 6000 min/month | ✅ Unlimited (Actions) |
| **Custom domain + HTTPS** | ✅ | ✅ | ✅ | ✅ |
| **Environment locking (dev)** | ✅ Cloudflare Access | ⚠️ Netlify password protection (basic) | ⚠️ Vercel password protection (basic) | ❌ |
| **Ecosystem fit** | ✅ Supabase deploys to CF Workers natively | ⚠️ Netlify Functions not needed | ❌ Optimised for Next.js | ✅ Simple, but underpowered |
| **Analytics** | ✅ Web Analytics (free) | ⚠️ Analytics on paid plan | ⚠️ Analytics on paid plan | ❌ |

## Decision

**Accepted: Option A — Cloudflare Pages.**

Cloudflare Pages offers the best combination of global performance (330+ PoPs vs Netlify's 6+), generous free tier (unlimited requests), and the ability to lock the preview environment behind Cloudflare Access so the beta app isn't publicly discoverable.

Netlify is a close second and would be fine — but Cloudflare's edge network is objectively faster, and the unlimited request quota means we won't think about billing as the app grows. The Cloudflare ecosystem (Workers, R2, D1) is also available if we ever need it.

## Consequences

### Positive
- Unlimited requests on the free plan — no bandwidth monitoring during beta
- 330+ edge locations worldwide — fast loads regardless of user location
- Cloudflare Access can password-protect the preview URL during private beta (in addition to the invite code gate)
- Easy SPA fallback via a single `_redirects` file
- PWA and service worker headers are fully configurable via `_headers`
- Git-connected: push to `main` → auto-deploy to production, PR branches get unique preview URLs

### Negative
- Build concurrency is limited to 1 on the free plan — one build at a time
- Only 500 build minutes per month on free (likely sufficient for a small team, but worth noting)
- Slightly less mainstream than Netlify for the "static SPA" crowd
- No built-in form handling or serverless functions tied to the hosting (not needed — Supabase handles everything)

### Neutral
- The team needs a Cloudflare account (free, no credit card required for Pages)
- `_redirects` and `_headers` files live in `frontend/public/` — Vite copies them to the build output automatically
- Custom domain setup requires updating nameservers to Cloudflare (or using a CNAME)
- PR preview URLs are `branchname.project.pages.dev` — shareable but not guessable

## Configuration

### Environment variables (set in Cloudflare Pages dashboard)

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Backend API endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key | Client-side API key (see [ADR-0013](../adr/0013-supabase-publishable-api-keys.md)) |
| `NODE_VERSION` | `26.5.0` | Node.js runtime version for builds |
| `PNPM_VERSION` | `11.13.1` | pnpm version for builds |

### Build configuration

| Setting | Value |
|---------|-------|
| Build command | `pnpm --filter lifey-frontend build` |
| Output directory | `frontend/dist/` |
| Root directory | (leave blank — repo root) |

### Static files

The `_redirects` and `_headers` files live in `frontend/public/` — Vite copies them into the build output automatically.

#### `frontend/public/_redirects` (SPA fallback)
```
/*    /index.html    200
```

> **⚠️ Known issue:** Cloudflare Pages flags this rule as an "infinite loop detected" warning in the dashboard. The SPA fallback works correctly — the warning is a heuristic. If it becomes problematic, enable Cloudflare's native SPA mode (Settings → SPA) and remove the `_redirects` rule.

#### `frontend/public/_headers` (PWA caching)
```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache

/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

### `wrangler.toml` (optional — only if we add Workers later)
```toml
name = "lifey"
pages_build_output_dir = "frontend/dist"
```

## Compliance

- Production domain: `https://lifey-172.pages.dev` (custom domain TBD)
- All pushes to `main` trigger an automatic production deploy via the Git-connected Cloudflare Pages project
- PR branches get unique preview URLs at `branchname.lifey-172.pages.dev`
- HTTPS is auto-provisioned by Cloudflare
- Build uses `pnpm` (the monorepo package manager) with the workspace filter, not `npm`
- All environment variables must be set in Cloudflare Pages (project → Settings → Environment variables)
- No server-side code in the Pages deployment — Supabase handles all backend logic

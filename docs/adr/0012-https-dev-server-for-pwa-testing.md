---
title: HTTPS Dev Server for PWA Testing on Mobile
status: Superseded
date: 2026-07-16
superseded_by: "Abandoned — self-signed certs blocked SW registration on Chrome Android; tunnel tools required accounts; too much friction for dev workflow. PWA testing on desktop localhost only for now."
deciders: [tech-lead]
---

# ADR-0012: HTTPS Dev Server for PWA Testing on Mobile

## Context

LIFEY is an installable PWA (per ADR-0002). The service worker and install prompt (`beforeinstallprompt`) both require a **secure context** (HTTPS). The Vite dev server currently runs on plain HTTP at `http://localhost:5173`.

While `localhost` is treated as a secure context by browsers (allowing service workers to register on desktop), this does **not** extend to other devices on the local network:

| URL on phone | Secure context? | SW registers? | Installable? |
|-------------|----------------|---------------|-------------|
| `http://localhost:5173` | ❌ Points to phone, not PC | — | — |
| `http://192.168.x.x:5173` | ❌ Plain HTTP, not localhost | ❌ | ❌ |
| `https://192.168.x.x:5173` | ✅ HTTPS | ✅ | ✅ |

Without HTTPS on the dev server, there is no way to test the PWA install flow on a real mobile device without:
- Deploying to production (Cloudflare Pages)
- Using a tunnel service (Cloudflare Tunnel, ngrok)

Neither is ideal during active development — each adds a deployment hop or network dependency.

### Constraints

- The fix must be **opt-in** — HTTPS adds overhead and is only needed when testing mobile
- Must not break the existing `mise dev` workflow for desktop development
- Must work on Windows (WSL2) without requiring manual certificate trust on every device
- Minimal dependencies — prefer Vite-native solutions

## Options

### Option A: `@vitejs/plugin-basic-ssl`

Vite's official SSL plugin. Auto-generates a self-signed certificate on `build`/`serve`, no configuration beyond adding the plugin. The cert is untrusted by browsers, so devs must click through a security warning once per device.

Added as a `devDependency`, loaded conditionally via `vite.config.ts` (always present, but only used when `--https` flag is passed).

### Option B: `mkcert` with manual Vite HTTPS config

`mkcert` creates a locally-trusted CA that signs certificates. The root CA is installed on the dev machine, and `mkcert -install` makes browsers trust it natively. For mobile testing, the user installs the root CA profile on their phone once.

More setup steps: install `mkcert`, generate certs, configure Vite to use them. Requires users to install the CA on every device they test with.

### Option C: Cloudflare Tunnel per session

Use `cloudflared tunnel --url http://localhost:5173` to get a public HTTPS URL. No dev server change needed — the tunnel wraps the HTTP server. Zero trust model (no inbound ports).

Downsides: requires `cloudflared` installed, a new URL every session (need to re-open on phone), and an external dependency for a local dev task.

### Option D: Status quo — deploy to test

Keep the dev server as-is. Any mobile PWA testing requires either deployment to Cloudflare Pages or a tunnel. Accept the deploy-hop latency.

## Evaluation

| Criteria | A: basic-ssl | B: mkcert | C: Tunnel | D: Status quo |
|----------|:---:|:---:|:---:|:---:|
| Setup effort | ✅ Low (~2 min) | ⚠️ Medium (~10 min + phone config) | ⚠️ Medium (install + auth) | ✅ None |
| Mobile trust (no warning) | ❌ Self-signed warning | ✅ Trusted after CA install | ✅ Real cert | N/A |
| Requires phone-side config | ✅ None (click through once) | ⚠️ Install CA profile | ✅ None | N/A |
| Works offline | ✅ | ✅ | ❌ Needs internet | ✅ |
| Dependency cost | ✅ ~0 KB (lightweight plugin) | ⚠️ System tool + cert files | ❌ External service | ✅ None |
| Impact on `mise dev` | ✅ Opt-in via flag | ✅ Opt-in | ❌ Separate command | ✅ Normal |
| Reusability (certs) | ⚠️ New cert each project | ✅ Cert stays valid | ❌ New URL each session | N/A |

## Decision

**Accepted: Option A — `@vitejs/plugin-basic-ssl`**

Chosen because:
1. **Zero setup beyond installing the package** — no cert generation, no trust stores, no phone configuration
2. **Opt-in via `--https` flag** — existing `mise dev` continues to work with plain HTTP; only add `--https` when testing mobile
3. **Vite-native** — officially maintained by the Vite team, minimal bundle impact, no external services
4. The self-signed certificate warning is a one-time click-through per device/browser — acceptable for development

### Why not the others

- **mkcert** is more polished (no security warning) but adds a system dependency and per-device CA installation. Not worth the overhead for occasional mobile testing.
- **Cloudflare Tunnel** is excellent for CI/preview but heavyweight for local dev — requires internet, auth, and a separate command.
- **Status quo** means every mobile test requires a deploy — unacceptable iteration speed.

## Consequences

### Positive
- One command to start the HTTPS dev server: `pnpm dev --https --host`
- All existing `mise dev` workflows remain unchanged
- The app works immediately on any device on the LAN (click through the security warning)
- No changes to project structure or existing config

### Negative
- Browsers show a security warning on first visit (self-signed cert). Users must click "Proceed" / "Advanced → Continue"
- iOS Safari makes clicking through warnings harder than Chrome — user may need to tap "Show Details" then "Visit Website"
- The warning returns if the cert regenerates (Vite does this on each start with basic-ssl)

### Neutral
- The `vite.config.ts` will import and conditionally register `basic-ssl` when the Vite `--https` flag is used
- A new mise task alias `mise dev-https` may be added as a convenience (not required)

## Compliance

- The `basic-ssl` plugin must only activate when `server.https` is enabled — never slow down plain HTTP dev
- Config change limited to `vite.config.ts` (adding the plugin) and `package.json` (adding the dependency)
- Document the workflow in `README.md` or project docs: `pnpm dev --https --host` for mobile testing

## Future

If mobile PWA testing becomes a daily workflow, consider switching to `mkcert` for a trusted cert without security warnings. This ADR can be superseded when that investment is justified.

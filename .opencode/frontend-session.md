# Frontend Design Session Context

> Auto-maintained by the frontend-designer agent. Updated on session changes.
> Design exports sync to `docs/design/Lifey/*.design` — read for reference but never edit.
> Design tokens live in `docs/design/Styles/default.styles` — edit there to update the design system.
> Last updated: 2026-07-14

## Brilliant Session

| Property | Value |
|----------|-------|
| Session ID | `mcp:70a03555d826b04d` |
| Default Canvas | `Canvas` (scratch) |
| Design System | `default` (Brilliant catalog) |
| Repo Root | `C:\Users\kuroi\.config\brilliant\scratch` |
| Design Exports | `docs/design/` (Lifey/*.design) |
| Token Source | `docs/design/Styles/default.styles` |

## Project Canvases

### `Lifey/Auth` — Authentication flow (5 screens)

| # | Screen Name | Element ID | Status |
|---|------------|-----------|--------|
| 1 | Welcome Screen | `8c90de20af7ca03a` | ✅ Done |
| 2 | Invite Code Entry | `f10fa8dc4f140bb2` | ✅ Done |
| 3 | Email Entry | `adf5efc69dc2b175` | ✅ Done |
| 4 | Magic Link Sent | `dd53671a8316fcb5` | ✅ Done |
| 5 | Login Screen | `629cdf0dbce7b4b5` | ✅ Done |

### `Lifey/Profile` — Profile management (1 screen)

| # | Screen Name | Element ID | Status |
|---|------------|-----------|--------|
| 1 | Profile Management | `176dd1fff7b9fb7c` | ✅ Done |

## Screen Refs (for modify/export)

| Ref | Element | Canvas |
|-----|---------|--------|
| `#lifey-auth` | Welcome Screen | Lifey/Auth |
| `#lifey-invite` | Invite Code Entry | Lifey/Auth |
| `#lifey-email` | Email Entry | Lifey/Auth |
| `#lifey-magic-link` | Magic Link Sent | Lifey/Auth |
| `#lifey-login` | Login Screen | Lifey/Auth |
| `#lifey-profile` | Profile Management | Lifey/Profile |

## Design System Summary

> Canonical source: `docs/design/Styles/default.styles`

- **Theme:** Dark (`#0D0D1F` background)
- **Brand gradient:** `linear-gradient(135deg, #7C3AED, #EC4899)` (purple → magenta)
- **Accent text:** `#A78BFA` (soft purple)
- **Destructive:** `#EF4444` (red)
- **Font:** Inter / system-ui
- **Screen dimensions:** 390×844px (iPhone), `rd(40)` corner radius
- **Spacing rhythm:** 40px outer padding, 32px back/status spacing, stacked layout

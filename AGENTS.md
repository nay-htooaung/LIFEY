# LIFEY — Agent Guide

This repo manages **project artifacts** (vision → roadmap → epics → stories → tasks) and a **React SPA frontend** for the LIFEY household management platform. The `backend/` dir is a placeholder (Q4 2026 — Python/FastAPI). There is no custom backend for Q3 — the SPA talks directly to Supabase.

pnpm workspace (`pnpm-workspace.yaml`) with a single package: `frontend/`.

## Commands

| Category | Command | What it does |
|----------|---------|-------------|
| Docs | `mise build-doc` | Parse → validate → generate `docs/dist/index.html` |
| Docs | `mise build-doc-watch` | Same, re-runs on file changes |
| Docs | `mise validate-doc` | Parse + validate docs only (exits 1 on error) |
| Docs | `mise run convert-md path/to/file.md` | Convert .md to .docx + .pdf |
| Frontend | `mise dev` | Start Vite dev server (`pnpm --filter lifey-frontend dev`) |
| Frontend | `mise build` | `tsc --noEmit && vite build` (production) |
| Frontend | `mise test` | `vitest run` via pnpm workspace filter |
| Frontend | `mise lint` | ESLint with `typescript-eslint` type-checked rules |
| Frontend | `mise format` | Prettier with `prettier-plugin-tailwindcss` |
| Frontend | `mise typecheck` | `tsc --noEmit` |
| Tests | `mise vt`, `mise vts -- EP0004-ST0001`, `mise vte -- EP0004`, `mise vta` | Validate story/AC test coverage |
| Tests | `mise vts -- EP0004-ST0001 --run` | Validate + execute story tests |

## Project layout

| Path | Purpose |
|------|---------|
| `frontend/` | React 19 + Vite 6 + TypeScript SPA (pnpm workspace package `lifey-frontend`) |
| `frontend/src/features/` | Feature modules: `auth/`, `household/`, `tasks/` (scaffolded, mostly empty) |
| `frontend/src/components/ui/` | Reusable UI primitives (empty — to be built) |
| `frontend/src/lib/` | `supabase.ts` (Supabase client), `utils.ts` (`cn()` via clsx + tailwind-merge) |
| `frontend/src/stores/`, `hooks/`, `types/` | Zustand stores, custom hooks, TS types (all empty) |
| `frontend/__tests__/` | Vitest tests (jsdom, @testing-library/react, `@/` alias) |
| `frontend/.env.example` | Supabase env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `docs/project-management/01-vision/` | Product vision documents |
| `docs/project-management/02-roadmap/` | Roadmap documents |
| `docs/project-management/03-epic/` | Epic documents |
| `docs/project-management/04-story/` | User story documents |
| `docs/project-management/templates/` | Templates (excluded from build) |
| `docs/rules/project-management/` | Convention rules (01–04) — **read before editing that artifact type** |
| `docs/rules/frontend-design/` | Design conventions — screen standards, tokens, Brilliant workflow |
| `docs/adr/` | Architecture Decision Records (created/maintained by tech-lead) |
| `docs/architecture/` | Tech radar, tech debt log, route architecture, data model, service worker strategy |
| `docs/design/` | Brilliant design exports + design system tokens |
| `docs/design/Styles/default.styles` | **Dark-first, purple-primary** design tokens (editable) |
| `scripts/build-docs.js` | Single HTML site generator (Node.js, ~1100 lines) |
| `scripts/validate-tests.js` | Validates test coverage matches story acceptance criteria |
| `.opencode/agents/` | Agent defs (`project-manager`, `tech-lead`, `dev-agent`, `frontend-designer`, etc.) |
| `.opencode/skills/` | Skill definitions loaded on-demand by agents

## Artifact rules

### File naming
Files live in subdirectories by type (`vision/`, `roadmap/`, `epic/`, `story/`). Each epic and story gets a unique identifier used in the file name:

- **Epics**: `EPxxxx-<name>.md` (e.g., `EP0001-mobile-app-shell.md`)
- **Stories**: `EPxxxx-STxxxx-<name>.md` (e.g., `EP0002-ST0001-sign-up-with-invite-code-and-magic-link.md`)

Type is determined by the parent directory name. Type auto-detection prefers the `type` field in frontmatter, falling back to the directory name (`vision/` → vision, `roadmap/` → roadmap, `epic/` → epic, `story/` → user_story).

### YAML frontmatter required
Every `.md` file must start with `---`-delimited YAML. Required fields per type:

| Type | Required fields |
|------|----------------|
| vision | `title`, `status`, `type` |
| roadmap | `title`, `status`, `type`, `quarter` |
| epic | `title`, `status`, `type`, `theme`, `epic_number` |
| user_story | `title`, `status`, `type`, `epic`, `story_number` |

Cross-references (`epic`, `story`) must match the target document's `title` field exactly — validation fails on mismatch.

### Hierarchy validation
Build enforces: story → epic → roadmap theme → vision. Every story must be linked to an epic. A story without an `epic` field or an epic without a `theme` field matching the roadmap will fail validation.

### Build scan
All `.md` files under `docs/project-management/` are scanned recursively, except the `templates/` subdirectory which is always skipped. Markdown link syntax `[text](relative/path.md)` is used for cross-document references — these resolve to hash links in the generated single-page site while remaining functional as file links on GitHub.

### `docs/design/` — design system & exports

| Path | Purpose | Editable? |
|------|---------|-----------|
| `docs/design/Styles/default.styles` | LIFEY design system tokens (colors, fonts, spacing) | ✅ Yes — update design tokens here |
| `docs/design/Assets/` | Image assets (icons, logos, screenshots) | ✅ Yes — add assets here |
| `docs/design/Lifey/*.design` | Canvas blueprint exports | ❌ Never edit — Brilliant-managed |
| `docs/design/Canvas.design` | Scratch canvas config | ❌ Never edit — Brilliant-managed |
| `docs/design/.brilliant/` | Brilliant internal data | ❌ Never edit — Brilliant-managed |

**Rule:** Never manually edit `.design` files or `.brilliant/` — these are managed by Brilliant's export/sync. Only edit `Styles/default.styles` (tokens) and `Assets/` (content).

## Subagent conventions

- **project-manager** — Always reads the matching `docs/rules/project-management/0X-*.md` before creating/editing that artifact type. Saves all artifacts to `docs/project-management/`.
- **opencode-manager** — Fetches `https://opencode.ai/docs/` via `webfetch` to answer OpenCode config questions.
- **tech-lead** — Architectural decision-maker. Evaluates technologies, designs system/data/infra architecture, maintains ADRs in `docs/adr/`, and manages tech strategy. Does not write application code.
- **dev-agent** — Implements stories using 1-AC-at-a-time TDD. Delegates architecture decisions to tech-lead. Reads the `tdd-dev-workflow` skill for the TDD contract. Never edits story/epic files.
- **review-agent** — Gate between dev-agent implementation and merge. Reviews branches against ADRs, code conventions, story criteria, and scope boundaries. Produces a structured report before the user merges.
- **frontend-designer** — UI/UX designer using Brilliant to create mobile-first screens. Story-driven — reads stories and generates polished designs on `Lifey/` canvases. Proposes design tokens and component patterns; tech-lead reviews via ADRs. Maintains `docs/rules/frontend-design/` and reads session context from `.opencode/frontend-session.md`. **Never manually edit `.design` files or `.brilliant/` in `docs/design/`** — they are Brilliant-managed exports. Edit `docs/design/Styles/default.styles` for token changes.

## CI

`.github/workflows/ci.yml` runs frontend lint (ESLint), format check (Prettier), typecheck (tsc), test (vitest), and build (vite) via pnpm on push/PR to `main`. Backend CI (ruff, mypy, pytest) is commented out — unblock when backend/ is built in Q4.

# LIFEY — Agent Guide

This repo manages **project artifacts** (vision → roadmap → epics → stories → tasks) for the LIFEY household management platform. There is **no application code** — the `backend/` and `frontend/` dirs in CI don't exist yet. The only executable code is `scripts/build-docs.js` (~1100 lines), which parses `.md` files and generates `docs/dist/index.html`.

## Commands

| Command | What it does |
|---------|-------------|
| `mise build` | Parse → validate → generate `docs/dist/index.html` |
| `mise build-watch` | Same, re-runs on file changes |
| `mise validate` | Parse + validate only (exits 1 on errors, no HTML output) |
| `mise deps` | Install npm packages via pnpm (auto-runs before tasks) |

Fastest validation: `node scripts/build-docs.js --validate-only`
Direct build: `node scripts/build-docs.js` (with `--watch` flag for file watching)

## Project layout

| Path | Purpose |
|------|---------|
| `docs/project-management/` | **Artifact directory** — all .md files go here |
| `docs/rules/project-management/` | Convention rules (01–05) — **read before editing that artifact type** |
| `scripts/build-docs.js` | Single HTML site generator (Node.js, ~1100 lines) |
| `docs/dist/` | Build output (gitignored) |
| `.opencode/agents/` | Subagent defs (`project-manager`, `opencode-manager`) |

## Artifact rules

### File naming
Use numbered prefixes for correct sorting: `01-`, `02-`, `03-`, etc. Type auto-detection prefers the `type` field in frontmatter, falling back to filename prefix (`01-` = vision, `02-` = roadmap, `03-` or "epic" = epic, `04-` or "story" = user_story, `05-` or "task" = task).

### YAML frontmatter required
Every `.md` file must start with `---`-delimited YAML. Required fields per type:

| Type | Required fields |
|------|----------------|
| vision | `title`, `status`, `type` |
| roadmap | `title`, `status`, `type`, `quarter` |
| epic | `title`, `status`, `type`, `theme` |
| user_story | `title`, `status`, `type`, `epic` |
| task | `title`, `status`, `type`, `story` |

Cross-references (`epic`, `story`) must match the target document's `title` field exactly — validation fails on mismatch.

### Hierarchy validation
Build enforces: task → story → epic → roadmap theme → vision. Every story must be linked to an epic, every task to a story. A story without an `epic` field or an epic without a `theme` field matching the roadmap will fail validation.

### Build scan
Only **top-level `.md` files** in `docs/project-management/` are scanned. The `templates/` subdirectory is skipped. Wiki-link syntax `[[Document Title]]` resolves to hash links; unresolved links render as red broken-link spans.

## Subagent conventions

- **project-manager** — Always reads the matching `docs/rules/project-management/0X-*.md` before creating/editing that artifact type. Saves all artifacts to `docs/project-management/`.
- **opencode-manager** — Fetches `https://opencode.ai/docs/` via `webfetch` to answer OpenCode config questions.

## CI (aspirational)

`.github/workflows/ci.yml` runs ruff, mypy, eslint, prettier, tsc, pytest, vitest, and Docker Compose, but **none of these tools or directories exist in the repo yet**. The CI file is a template for future use.

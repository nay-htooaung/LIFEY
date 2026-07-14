# LIFEY — Agent Guide

This repo manages **project artifacts** (vision → roadmap → epics → stories → tasks) for the LIFEY household management platform. There is **no application code** — the `backend/` and `frontend/` dirs in CI don't exist yet. The only executable code is `scripts/build-docs.js` (~1100 lines), which parses `.md` files and generates `docs/dist/index.html`.

## Commands

| Command | What it does |
|---------|-------------|
| `mise build-doc` | Parse → validate → generate `docs/dist/index.html` |
| `mise build-doc-watch` | Same, re-runs on file changes |
| `mise validate` | Parse + validate only (exits 1 on errors, no HTML output) |
| `mise deps` | Install npm packages via pnpm (auto-runs before tasks) |

Fastest validation: `node scripts/build-docs.js --validate-only`
Direct build: `node scripts/build-docs.js` (with `--watch` flag for file watching)

## Project layout

| Path | Purpose |
|------|---------|
| `docs/project-management/01-vision/` | Product vision documents |
| `docs/project-management/02-roadmap/` | Roadmap documents |
| `docs/project-management/03-epic/` | Epic documents |
| `docs/project-management/04-story/` | User story documents |
| `docs/project-management/templates/` | Templates (excluded from build) |
| `docs/rules/project-management/` | Convention rules (01–04) — **read before editing that artifact type** |
| `docs/adr/` | Architecture Decision Records (created/maintained by tech-lead) |
| `docs/architecture/` | Tech radar, tech debt log, architecture conventions |
| `docs/diagrams/` | C4 model architecture diagrams |
| `scripts/build-docs.js` | Single HTML site generator (Node.js, ~1100 lines) |
| `docs/dist/` | Build output (gitignored) |
| `.opencode/agents/` | Agent defs (`project-manager`, `opencode-manager`, `tech-lead`) |
| `.opencode/skills/` | Skill definitions loaded on-demand by agents |

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

## Subagent conventions

- **project-manager** — Always reads the matching `docs/rules/project-management/0X-*.md` before creating/editing that artifact type. Saves all artifacts to `docs/project-management/`.
- **opencode-manager** — Fetches `https://opencode.ai/docs/` via `webfetch` to answer OpenCode config questions.
- **tech-lead** — Architectural decision-maker. Evaluates technologies, designs system/data/infra architecture, maintains ADRs in `docs/adr/`, and manages tech strategy. Does not write application code.

## CI (aspirational)

`.github/workflows/ci.yml` runs ruff, mypy, eslint, prettier, tsc, pytest, vitest, and Docker Compose, but **none of these tools or directories exist in the repo yet**. The CI file is a template for future use.

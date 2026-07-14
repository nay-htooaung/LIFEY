# LIFEY — Agent Guide

This repo manages **project artifacts** (vision → roadmap → epics → stories → tasks) for the LIFEY household management platform. There is **no application code** — the `backend/` and `frontend/` dirs in CI don't exist yet. The only executable code is `scripts/build-docs.js` (~1100 lines), which parses `.md` files and generates `docs/dist/index.html`.

## Commands

| Command | What it does |
|---------|-------------|
| `mise build-doc` | Parse → validate → generate `docs/dist/index.html` |
| `mise build-doc-watch` | Same, re-runs on file changes |
| `mise validate-doc` | Parse + validate docs only (exits 1 on errors, no HTML output) |
| `mise deps` | Install npm packages via pnpm (auto-runs before tasks) |

Fastest validation: `node scripts/build-docs.js --validate-only`
Direct build: `node scripts/build-docs.js` (with `--watch` flag for file watching)
Convert any markdown: `mise run convert-md path/to/file.md`

## Test Validation

| Command | What it does |
|---------|-------------|
| `mise validate-tests` or `mise vt` | Show usage (needs `--story`, `--epic`, or `--all`) |
| `mise vts -- EP0004-ST0001` | Validate one story (checks all ACs have tests) |
| `mise vte -- EP0004` | Validate an epic (checks all stories in the epic) |
| `mise vta` | Validate all stories across all epics |
| `node scripts/validate-tests.js --all --json` | Machine-readable JSON output |
| `node scripts/validate-tests.js --story EP0004-ST0001 --run` | Also execute the tests

## Project layout

| Path | Purpose |
|------|---------|
| `docs/project-management/01-vision/` | Product vision documents |
| `docs/project-management/02-roadmap/` | Roadmap documents |
| `docs/project-management/03-epic/` | Epic documents |
| `docs/project-management/04-story/` | User story documents |
| `docs/project-management/templates/` | Templates (excluded from build) |
| `docs/rules/project-management/` | Convention rules (01–04) — **read before editing that artifact type** |
| `docs/rules/frontend-design/` | Design conventions — screen standards, tokens, Brilliant workflow |
| `docs/adr/` | Architecture Decision Records (created/maintained by tech-lead) |
| `docs/architecture/` | Tech radar, tech debt log, architecture conventions |
| `docs/design/` | Brilliant design exports + design system tokens |
| `docs/diagrams/` | C4 model architecture diagrams |
| `scripts/build-docs.js` | Single HTML site generator (Node.js, ~1100 lines) |
| `docs/dist/` | Build output (gitignored) |
| `.opencode/agents/` | Agent defs (`project-manager`, `opencode-manager`, `tech-lead`, `frontend-designer`) |
| `.opencode/skills/` | Skill definitions loaded on-demand by agents (e.g., `tdd-dev-workflow`, `frontend-design`) |
| `.opencode/agents/dev-agent.md` | TDD implementation agent — writes tests + code for stories |
| `.opencode/frontend-session.md` | Live Brilliant session context — session ID, canvas paths, screen refs |

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

## CI (aspirational)

`.github/workflows/ci.yml` runs ruff, mypy, eslint, prettier, tsc, pytest, vitest, and Docker Compose, but **none of these tools or directories exist in the repo yet**. The CI file is a template for future use.

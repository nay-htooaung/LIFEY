---
title: Project Structure & Workspace Conventions
status: Accepted
date: 2026-07-14
deciders: [tech-lead]
---

# ADR-0010: Project Structure & Workspace Conventions

## Context

The repository currently contains project management artifacts, architecture docs, ADRs, and a build script — but no application code. The dev agent needs to start implementing stories, which requires a clearly defined project layout with:

- A `frontend/` directory for the SPA (Vite + React)
- A `backend/` directory (placeholder for Q4 Python/FastAPI AI agent service)
- A shared workspace mechanism
- CI/CD pipeline alignment

Key constraints:
- The CI file (`.github/workflows/ci.yml`) expects `frontend/` and `backend/` directories with specific tooling (npm for frontend, pip for backend)
- The project already uses **pnpm** as the package manager (see `AGENTS.md` and `mise deps`)
- The frontend SPA is the only active code for Q3 — the backend is a placeholder until Q4
- The repo root should remain clean — project management, docs, and config live at the root; application code lives in subdirectories
- The dev agent works inside `backend/` and `frontend/` only, never touching project management artifacts

## Options

### Option A: pnpm workspaces with backend/ + frontend/

Use pnpm's built-in workspace support. A root `pnpm-workspace.yaml` declares `frontend/` and `backend/` as packages. The backend is an empty Node.js project (for now) that can be replaced with Python in Q4.

```
lifey/
├── pnpm-workspace.yaml    # declares frontend/, backend/
├── frontend/               # Vite + React SPA (active)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
└── backend/                # Placeholder (Q4 Python service)
    └── package.json        # Empty Node.js project
```

### Option B: Separate package managers — pnpm for frontend, pip/poetry for backend

Frontend uses pnpm (as already configured). Backend uses Python with Poetry or pip + venv. No shared workspace. The root has both `package.json` (pnpm) and `pyproject.toml` (Poetry).

```
lifey/
├── package.json            # pnpm (root scripts only)
├── frontend/
│   ├── package.json        # pnpm workspace
│   └── ...
└── backend/
    ├── pyproject.toml      # Poetry
    └── ...
```

### Option C: Flat structure — no monorepo workspace

No workspace. Frontend and backend are independent projects. Root `package.json` has scripts that delegate to each. Each project manages its own dependencies independently.

```
lifey/
├── package.json            # scripts: "dev", "build", "test"
├── frontend/
│   ├── package.json
│   └── ...
└── backend/
    ├── requirements.txt
    └── ...
```

## Evaluation

| Criteria | A — pnpm workspaces (JS) | B — Mixed (pnpm + Poetry) | C — Flat, no workspace |
|----------|:---:|:---:|:---:|
| **CI alignment** | ✅ Frontend CI works; backend CI is commented out until Q4 | ⚠️ Must config two toolchains | ✅ Simple — each dir independent |
| **Root scripts** | ✅ pnpm -F frontend run build | ⚠️ Different commands per dir | ✅ npm run dev maps to frontend |
| **Shared config** | ✅ Can share TS configs, ESLint | ❌ Different languages, no sharing | ❌ No sharing |
| **Backend placeholder** | ⚠️ JS backend placeholder feels wrong when real backend is Python | ✅ Backend starts with Python | ⚠️ No placeholder until Q4 |
| **pnpm compatibility** | ✅ Native | ✅ Only frontend uses pnpm | ✅ Only frontend uses pnpm |
| **Dev agent clarity** | ✅ Clear frontend/ vs backend/ boundary | ✅ Clear boundary | ⚠️ Less structured |
| **Complexity** | ⚠️ Workspace config for little benefit (backend isn't JS) | ✅ Honest about backend language | ✅ Simplest |

## Decision

**Accepted: Option C — Flat structure with independent directories.**

Rationale:
1. **Backend is Python, not Node.js** — Using pnpm workspaces would mean either creating a fake Node.js backend or maintaining a workspace for a single active package. Neither is clean.
2. **Independence is simpler** — `frontend/` and `backend/` have no shared code, no shared dependencies, and will be in different languages. There's nothing a workspace gives us that a simple root `package.json` script delegation doesn't.
3. **CI aligns naturally** — Frontend CI runs inside `frontend/`, backend CI (when active) runs inside `backend/`. No workspace abstraction needed.
4. **Evolution path** — If shared tooling emerges (e.g., shared TypeScript types between frontend and Python-generated types), we can add a `packages/shared/` directory later. Premature workspace abstraction adds complexity for zero current value.

### Directory layout

```
lifey/
├── .github/workflows/ci.yml
├── docs/                       # Architecture, ADRs, project management
│   ├── adr/
│   ├── architecture/
│   ├── diagrams/
│   └── project-management/
├── scripts/                   # Build scripts (docs generator, etc.)
├── frontend/                   # Vite + React SPA (active Q3)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/        # Shared UI components (shadcn/ui lives here)
│   │   ├── features/          # Feature modules (auth, tasks, household)
│   │   ├── hooks/             # Shared hooks
│   │   ├── lib/               # Utilities, supabase client, helpers
│   │   ├── stores/            # Zustand stores
│   │   └── types/             # Shared TypeScript types
│   ├── public/                # Static assets, PWA icons
│   ├── tests/                 # Test setup, mocks
│   └── __tests__/             # Co-located component tests (optional)
├── backend/                    # Python service placeholder (Q4)
│   ├── README.md              # Placeholder README
│   └── requirements.txt       # Empty, ready for Q4
├── package.json               # Root scripts that delegate to frontend/
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        # Empty — reserved for future shared packages
├── mise.toml                  # Task runner config
├── .gitignore
├── _redirects                 # Cloudflare Pages SPA fallback
├── _headers                   # Cloudflare Pages headers
└── README.md
```

### Root package.json scripts

```json
{
  "name": "lifey",
  "private": true,
  "scripts": {
    "dev": "cd frontend && pnpm dev",
    "build": "cd frontend && pnpm build",
    "test": "cd frontend && pnpm test",
    "lint": "cd frontend && pnpm lint",
    "typecheck": "cd frontend && pnpm typecheck",
    "format": "cd frontend && pnpm format"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  # No workspace packages yet. Reserved for future shared packages.
  # 'frontend/' will be added when/if we need workspace features.
```

## Consequences

### Positive
- Clean separation of concerns — frontend and backend evolve independently
- No fake Node.js backend package needed
- Root scripts delegate naturally to the active project
- Easy for the dev agent — just `cd frontend/` and work
- CI can run frontend checks only in Q3, add backend checks in Q4

### Negative
- No shared dependency resolution — `pnpm install` must run inside `frontend/`
- If shared TypeScript types are needed between frontend and backend, we must add a `packages/shared/` workspace later
- Root `node_modules` won't exist (pnpm installs in `frontend/`) — the dev agent's editor must be pointed at the correct directory

### Neutral
- `backend/` starts as a minimal placeholder: `README.md` and empty `requirements.txt`
- When the Python service is built in Q4, it can use Poetry or pip + venv independently
- The repo root remains the "project management" level; code lives in subdirectories

## Compliance

- All frontend application code MUST live under `frontend/` — never in the repo root
- All backend application code MUST live under `backend/` — never in the repo root
- Root `package.json` scripts MUST delegate to `frontend/` — never contain application dependencies
- The dev agent works ONLY inside `frontend/` (and later `backend/`) — never edits root config or project management files
- CI checks must run from the correct directory (`cd frontend && pnpm ...`)

## References

- [ADR-0002](0002-installable-spa-architecture.md) — SPA architecture (frontend technology)
- [ADR-0001](0001-foundational-tech-stack.md) — Python/FastAPI future backend (note: superseded for client layer, backend decision stands)
- CI file: `.github/workflows/ci.yml` — expects `frontend/` and `backend/` directories

# LIFEY Backend

> **Status:** Placeholder — Q4 2026

This directory will contain the Python/FastAPI AI agent service (Q4 2026).

For Q3, the application has **no custom backend** — the frontend SPA communicates directly with Supabase (PostgREST REST API, GoTrue auth, Realtime WebSocket subscriptions).

## Planned Technology

| Component | Technology |
|-----------|------------|
| Language | Python 3.13+ |
| Framework | FastAPI |
| Validation | Pydantic v2 |
| ORM | SQLAlchemy + Alembic |
| Testing | pytest |
| Linting | ruff |
| Type checking | mypy |

## Development

```bash
# Create virtual environment
python -m venv .venv

# Activate it (Windows)
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
```

## Related Decisions

- [ADR-0001](../docs/adr/0001-foundational-tech-stack.md) — Foundational tech stack (establishes Python/FastAPI for Q4)
- [ADR-0010](../docs/adr/0010-project-structure-and-workspace.md) — Project structure (independent backend/ directory)

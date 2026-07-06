# VISION — LIFEY

## North Star

A single, unified household command center that manages every recurring operational concern of daily life — expenses, meals, errands, and tasks — so the household runs smoothly without mental overhead.

## Product Essence

LIFEY is a **general household management application** delivered as a **single-page application (SPA)** with **Progressive Web App (PWA)** capabilities, installable on Android and iOS. It is always-online with a cloud-only database. It serves a small, closed group (a household / family), not the general public.

## Core Pillars

| Pillar | Purpose |
|--------|---------|
| **Expense & Usage Management** | Track spending, recurring costs, usage stats for shared resources |
| **Recipe Management** | Store, organise, search, and scale family recipes |
| **To-Do List** | Shared household tasks with assignments and completion tracking |
| **Grocery Management** | Aggregate shopping lists from recipes, meal plans, and manual items |
| **AI Agent Chat** | Conversational assistant that answers questions and performs actions via natural language — powered by OpenCode SDK and MCP tools |

## Target Audience

- **Primary:** A single household / family (2–8 members)
- **Access model:** Invite-only registration; no public sign-up
- **Scale:** Tens of users per instance, not thousands

## Non-Negotiable Tenets

*Explicitly stated design constraints. These are not subject to feature-level trade-offs.*

1. **SPA + PWA** — The app must be a browser-delivered SPA that can be installed as a PWA on mobile home screens.
2. **Always-online** — All features assume a live connection. Offline fallback is not a goal.
3. **Household isolation** — Data is scoped to a household. Users in different households never see each other's data.
4. **No external service dependency** — No reliance on third-party SaaS that could shut down or change pricing (exceptions: auth provider, which is infrastructure; and OpenCode SDK / OpenCode Zen for the AI agent chat, which is a deliberate architectural dependency).
5. **Privacy-first** — No telemetry, no analytics, no tracking. The app collects only the data the user explicitly enters.
6. **Open data** — Every data category must be exportable (JSON / CSV at minimum).

## Out of Scope (explicitly not planned)

- Public marketplace, community features, social feeds
- Real-time collaboration (no WebSocket sync conflicts — save-and-refresh is acceptable)
- Native mobile SDK builds — PWA is the only mobile delivery mechanism
- Custom LLM fine-tuning — agent uses OpenCode Zen as provided
- Multi-agent per household — configurable via UI, system prompt stored in DB. Ships with a default agent; household admins can create, edit, and delete named agents.

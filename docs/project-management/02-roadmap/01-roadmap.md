---
title: "Roadmap — LIFEY"
status: Draft
type: roadmap
quarter: Q3 2026
phases:
  - label: NOW
    quarter: "Q3 2026"
    title: "Foundation & To-Do Lists"
    themes:
      - name: Shared Foundation
        epics:
          - Mobile app shell
          - User Authentication
          - Household management
      - name: Shared To-Do Lists
        epics:
          - Shared To-Do Lists
  - label: NEXT
    quarter: "Q4 2026"
    title: "AI Agent & Expense Tracking"
    themes:
      - name: AI Agent
        epics:
          - TBD
      - name: Expense Tracking
        epics:
          - TBD
  - label: LATER
    quarter: "H1 2027+"
    title: "Chat, Recipes, Groceries & Custom Agents"
    themes:
      - name: Household Chat
        epics:
          - TBD
      - name: Recipe Management
        epics:
          - TBD
      - name: Grocery Integration
        epics:
          - TBD
      - name: Custom Agents
        epics:
          - TBD
      - name: Advanced AI
        epics:
          - TBD
---

## Horizon Guide

| Horizon | Timeframe | Certainty | Detail Level |
|---------|-----------|-----------|-------------|
| **Now** | Q3 2026 | High | Epics + key stories estimated |
| **Next** | Q4 2026 | Medium | Themes + epics (not yet detailed) |
| **Later** | H1 2027+ | Low | Themes only (placeholders) |

---

## NOW — Q3 2026: "Foundation & To-Do Lists"

### Theme: Shared Foundation
*The app exists and we can use it together.*

| Epic | Description | Dependencies |
|------|-------------|-------------|
| Mobile app shell | iOS + Android project, navigation, UI components | — |
| User Authentication | Sign up, log in, profile management | Mobile app shell |
| Household management | Create households, invite members, context switching | User auth |

### Theme: Shared To-Do Lists
*Our first daily-use feature — simple, fast, and immediately useful.*

| Epic | Description | Dependencies |
|------|-------------|-------------|
| Shared To-Do Lists | Task CRUD scoped to households, assignment, categories, due dates, filtering, push notifications, and AI agent API | Household Management, User Authentication |

---

## NEXT — Q4 2026: "AI Agent & Expense Tracking"

### Theme: AI Agent
*Talk to your life — the core differentiator is live.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

### Theme: Expense Tracking
*Money management for shared life.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

---

## LATER — H1 2027+: "Chat, Recipes, Groceries & Custom Agents"

### Theme: Household Chat
*Talk to each other.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

### Theme: Recipe Management
*Cook together, store your favorites.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

### Theme: Grocery Integration
*From recipe to shopping list — automatically.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

### Theme: Custom Agents
*Your AI, your rules.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

### Theme: Advanced AI
*Smarter together.*

| Epic | Description |
|------|-------------|
| TBD | Not yet defined |

---

## Non-Planned (Not Now)

- Bank feed API integrations (Plaid, etc.)
- OCR receipt scanning
- Calendar/scheduling integration
- Bill payment automation
- Social features beyond household

---

## Traceability

| Theme | Traces to Vision Principle |
|-------|---------------------------|
| Shared Foundation | Private by default, Shared-first |
| Shared To-Do Lists | Shared-first |
| AI Agent | AI-native |
| Expense Tracking | Shared-first |
| Household Chat | Shared-first |
| Recipe Management | — |
| Grocery Integration | Shared-first |
| Custom Agents | Agent-extensible |
| Advanced AI | AI-native |

---
title: "Roadmap — LIFEY"
status: Draft
type: roadmap
quarter: Q3 2026
---

## Horizon Guide

| Horizon | Timeframe | Certainty | Detail Level |
|---------|-----------|-----------|-------------|
| **Now** | Q3 2026 | High | Epics + key stories estimated |
| **Next** | Q4 2026 | Medium | Themes + epics (not yet detailed) |
| **Later** | H1 2027+ | Low | Themes only (placeholders) |

---

## 🟢 NOW — Q3 2026: "Foundation & To-Do Lists"

### Theme: Shared Foundation
*The app exists and we can use it together.*

| Epic | Description | Dependencies |
|------|-------------|-------------|
| Mobile app shell | iOS + Android project, navigation, UI components | — |
| User auth | Sign up, log in, profile management | Mobile app shell |
| Household management | Create households, invite members, context switching | User auth |

### Theme: Shared To-Do Lists
*Our first daily-use feature — simple, fast, and immediately useful.*

| Epic | Description |
|------|-------------|
| Personal tasks | Create, view, complete, edit tasks (personal scope) |
| Shared tasks | Create, view, complete, edit tasks (shared scope) |
| Task assignments | Assign tasks to household members |
| Categories & due dates | Organize tasks with labels and deadlines |
| Notifications | Alerts for task assignments and due dates |

---

## 🟡 NEXT — Q4 2026: "AI Agent & Expense Tracking"

### Theme: AI Agent
*Talk to your life — the core differentiator is live.*

| Epic | Description |
|------|-------------|
| Chat UI | Messaging-style interface for conversing with the AI |
| To-Do integration | AI can create, assign, complete, and query tasks |
| Natural language actions | "Remind me to buy milk tomorrow" → task created |
| Agent personality & memory | Agent remembers context across conversations |

### Theme: Expense Tracking
*Money management for shared life.*

| Epic | Description |
|------|-------------|
| Add expenses | Log personal and shared expenses with amount, category, payer |
| Split expenses | Split equally or by custom amounts among household members |
| Expense history & categories | Browse, filter, and organize past expenses |
| AI agent integration | Agent can answer questions like "How much did we spend on groceries this month?" |

---

## 🔵 LATER — H1 2027+: "Chat, Recipes, Groceries & Custom Agents"

### Theme: Household Chat
*Talk to each other.*

| Epic | Description |
|------|-------------|
| Real-time messaging | Text chat between household members |
| Inline task actions | Complete tasks, confirm payments directly from chat |
| Notifications hub | Central feed for shared events (task done, expense added, etc.) |
| AI @mentions | Mention the AI agent in group chat for assistance |

### Theme: Recipe Management
*Cook together, store your favorites.*

| Epic | Description |
|------|-------------|
| Recipe CRUD | Add, view, edit, organize recipes |
| Categories & search | Browse by cuisine, ingredients, tags |
| AI recipe suggestions | Agent recommends recipes based on mood, ingredients on hand |

### Theme: Grocery Integration
*From recipe to shopping list — automatically.*

| Epic | Description |
|------|-------------|
| Auto-generate list | One tap: recipe ingredients → grocery list |
| Manual grocery list | Add/edit items manually |
| Shared sync | Real-time sync so both partners see the same list |
| AI grocery agent | "Add milk to the shopping list" via chat |

### Theme: Custom Agents
*Your AI, your rules.*

| Epic | Description |
|------|-------------|
| Agent creation wizard | UI to create a custom agent with name, prompt, capabilities |
| Custom capabilities | Choose which modules the agent can access |
| Agent sharing | Share custom agents within the household |

### Theme: Advanced AI
*Smarter together.*

| Epic | Description |
|------|-------------|
| Spending insights | Monthly reports, category breakdowns, trends |
| Predictive suggestions | "You usually buy eggs on Fridays — add them to the list?" |
| Multi-agent collaboration | Default agent + custom agents working together |

---

## 📋 Non-Planned (Not Now)

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

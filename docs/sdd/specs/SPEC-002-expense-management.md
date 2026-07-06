# SPEC-002: Expense & Usage Management

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. All expense-related features (categories, expenses, credit cards, budgets, dashboards) form a cohesive domain.

## 2. The 5W1H Intent
- **Who:** Any household member.
- **What:** Track household spending — log expenses, manage custom categories, configure recurring expenses, track credit cards (including statements and payments), set monthly per-category budgets, and view interactive dashboards.
- **Where:** Frontend (`/expenses` module) ↔ Backend (`/api/v1/expenses/*`, `/api/v1/categories/*`, `/api/v1/credit-cards/*`, `/api/v1/budgets/*`) ↔ PostgreSQL.
- **When:** On an ongoing basis — daily expense logging and periodic budget/dashboard review.
- **Why:** To centralize household financial tracking, understand spending patterns, and stay within budget — without relying on external tools.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: Manage custom categories
- **Given** a logged-in household member,
- **When** the user navigates to the categories page,
- **Then** a list of household-specific expense categories is displayed (with defaults seeded on household creation).
- **When** the user creates, edits, or deletes a category,
- **Then** the change is persisted and reflected immediately in expense forms and dashboards.

### US-002: Create/view/edit/delete expenses
- **Given** a logged-in household member,
- **When** the user submits an expense with amount, date, description, category (optional: credit card, member split),
- **Then** the expense is saved and displayed in the expense list.
- **When** the user edits or deletes an expense,
- **Then** the change is persisted and reflected in budgets, CC balances, and dashboards.
- **Given** multiple expenses exist,
- **When** the user views the expense list,
- **Then** expenses are paginated, sortable by date/amount/category, and filterable by category/date range/member/credit card.

### US-003: Recurring expense templates
- **Given** a logged-in household member,
- **When** the user creates a recurring expense template with amount, category, frequency (daily/weekly/monthly/yearly), and optional credit card,
- **Then** the template is saved and new expenses are auto-generated on the defined schedule.
- **When** the user edits or deactivates a template,
- **Then** future auto-generation respects the updated configuration.

### US-004: Manage credit cards
- **Given** a logged-in household member,
- **When** the user adds a credit card with name, credit limit, statement date (day of month), and payment due date,
- **Then** the card is available to select when logging expenses.
- **When** the user edits card details or archives a card,
- **Then** the change is reflected in expense forms and dashboards (historical data preserved).

### US-005: Credit card statements & payments
- **Given** a logged-in household member with expenses charged to a credit card,
- **When** the user views the credit card detail page,
- **Then** the current outstanding balance, last statement period, statement balance, payment due date, and available credit are displayed.
- **When** the user records a payment (full or partial),
- **Then** the outstanding balance is reduced and the payment is recorded in the card history.
- **Given** expenses are dated,
- **When** a statement period closes (based on the card's statement date configuration),
- **Then** expenses within that period are aggregated into a statement view.

### US-006: Monthly per-category budgets
- **Given** a logged-in household member,
- **When** the user sets a budget target (amount) for a category for a given month,
- **Then** the budget is saved and compared against actual spending in dashboards.
- **When** actual spending approaches or exceeds the budget,
- **Then** the user sees visual indicators (progress bar, warning color) in the dashboard and expense list.

### US-007: Dashboard with charts
- **Given** a logged-in household member,
- **When** the user navigates to the expense dashboard,
- **Then** the following are displayed:
  - Spending trend chart (daily/weekly/monthly).
  - Category breakdown (pie/bar chart).
  - Monthly actual vs budget comparison (per category).
  - Credit card balances overview (outstanding balance + available credit per card).
  - (Optional) Per-member spending breakdown.
- **When** the user applies date range or category filters,
- **Then** all dashboard charts update accordingly.

### US-008: Export data
- **Given** a logged-in household member,
- **When** the user requests an export from the expense page,
- **Then** all expense data (including categories, CC info, budgets) is downloadable as JSON and CSV.
- **Guard:** Exports are scoped to the user's household only.

## 4. Out of Scope (Guardrails)
- Do NOT implement receipt/image upload or OCR (deferred).
- Do NOT implement bank feed imports (manual entry only).
- Do NOT implement multi-currency support (single household currency, configurable at household level).
- Do NOT implement notifications/budget alerts (email/push) in this spec.
- Do NOT implement investment tracking, net worth, or non-expense financial tracking.
- Do NOT implement splitting a single expense across multiple categories (one expense = one category).

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/categories` | Yes | List household categories |
| POST | `/api/v1/categories` | Yes | Create category |
| PUT | `/api/v1/categories/{id}` | Yes | Update category |
| DELETE | `/api/v1/categories/{id}` | Yes | Delete category |
| GET | `/api/v1/expenses` | Yes | List expenses (paginated, filterable) |
| POST | `/api/v1/expenses` | Yes | Create expense |
| GET | `/api/v1/expenses/{id}` | Yes | Get expense detail |
| PUT | `/api/v1/expenses/{id}` | Yes | Update expense |
| DELETE | `/api/v1/expenses/{id}` | Yes | Delete expense |
| GET | `/api/v1/expenses/recurring` | Yes | List recurring templates |
| POST | `/api/v1/expenses/recurring` | Yes | Create recurring template |
| PUT | `/api/v1/expenses/recurring/{id}` | Yes | Update recurring template |
| DELETE | `/api/v1/expenses/recurring/{id}` | Yes | Deactivate recurring template |
| GET | `/api/v1/credit-cards` | Yes | List credit cards |
| POST | `/api/v1/credit-cards` | Yes | Add credit card |
| PUT | `/api/v1/credit-cards/{id}` | Yes | Update credit card |
| DELETE | `/api/v1/credit-cards/{id}` | Yes | Archive credit card |
| GET | `/api/v1/credit-cards/{id}/statements` | Yes | List statements for card |
| POST | `/api/v1/credit-cards/{id}/payments` | Yes | Record payment |
| GET | `/api/v1/budgets` | Yes | List budgets (current month) |
| POST | `/api/v1/budgets` | Yes | Set budget target |
| PUT | `/api/v1/budgets/{id}` | Yes | Update budget target |
| GET | `/api/v1/expenses/dashboard` | Yes | Aggregated dashboard data |
| GET | `/api/v1/expenses/export` | Yes | Export as JSON/CSV |

## 6. Data Model (Summary)

**Tables:**
- `expense_categories` — id, household_id, name, icon/color, is_default, created_at
- `expenses` — id, household_id, category_id (FK), credit_card_id (FK, nullable), amount, description, date, paid_by_user_id (FK), created_at, updated_at
- `recurring_expense_templates` — id, household_id, category_id (FK), credit_card_id (FK, nullable), amount, description, frequency (enum), next_date, is_active, created_at
- `credit_cards` — id, household_id, name, credit_limit, statement_day (int), due_day (int), is_archived, created_at
- `credit_card_statements` — id, credit_card_id (FK), period_start, period_end, total_amount, is_paid, created_at
- `credit_card_payments` — id, credit_card_id (FK), statement_id (FK, nullable), amount, payment_date, created_at
- `budgets` — id, household_id, category_id (FK), month (date), target_amount, created_at, updated_at

All tables carry `household_id` (where applicable) and filter queries by it.

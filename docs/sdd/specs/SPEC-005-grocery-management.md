# SPEC-005: Grocery Management

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. Grocery management (lists, items, recipe integration, meal planning) is a single cohesive domain.

## 2. The 5W1H Intent
- **Who:** Any household member.
- **What:** Aggregate shopping lists from multiple sources — manual items, recipe ingredients, and meal plan auto-population — with categorised, check-off-able lists.
- **Where:** Frontend (`/grocery` module) ↔ Backend (`/api/v1/grocery/*`, `/api/v1/meal-plans/*`) ↔ PostgreSQL.
- **When:** Weekly/daily shopping trips and meal planning sessions.
- **Why:** To eliminate scattered shopping notes, reduce duplicate purchases, and streamline the cook → shop workflow.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: Manual grocery items
- **Given** a logged-in household member,
- **When** the user adds an item to the grocery list with name, quantity, unit, and optional category (Produce, Dairy, Meat, Pantry, etc.),
- **Then** the item appears in the grocery list under the appropriate category heading.

### US-002: Add from recipes
- **Given** a logged-in household member viewing a recipe,
- **When** the user triggers "Add ingredients to grocery list",
- **Then** all ingredients (at current scaled serving count) are added as individual items, each tagged with the source recipe name.
- **When** the same ingredient from multiple recipes is added,
- **Then** quantities are merged into a single line item where possible (same name + unit).

### US-003: Categorised / sorted list
- **Given** a grocery list with multiple items,
- **When** the user views the list,
- **Then** items are grouped by category (consistent with store aisles) and sorted within each category.
- **Given** household-specific categories exist,
- **Then** the grocery list respects household custom categories and their sort order.

### US-004: Check-off during shopping
- **Given** a logged-in household member viewing the grocery list,
- **When** the user checks off an item (taps/clicks the checkbox),
- **Then** the item is visually marked as purchased (strikethrough, dimmed) but remains visible until explicitly cleared.
- **When** the user unchecks a purchased item,
- **Then** it returns to the active list.

### US-005: Multiple lists
- **Given** a logged-in household member,
- **When** the user creates multiple grocery lists (e.g., "Weekly Shop", "Hardware Store", "Costco Run"),
- **Then** each list has its own items, categories, and check-off state.
- **When** items are added from a recipe,
- **Then** the user selects which list to add them to.

### US-006: Meal plan → grocery list
- **Given** a logged-in household member,
- **When** the user assigns recipes to days in a weekly meal plan (Mon–Sun, breakfast/lunch/dinner slots),
- **Then** the ingredients from all planned recipes can be bulk-added to a grocery list in one action.
- **When** the user edits the meal plan (swap recipe, remove day),
- **Then** the grocery list can be refreshed to reflect changes (re-add with deduplication).

### US-007: Clear purchased, keep rest
- **Given** a grocery list with checked-off and unchecked items,
- **When** the user triggers "Clear purchased",
- **Then** all checked-off items are removed from the list and unchecked items remain for the next trip.

## 4. Out of Scope (Guardrails)
- Do NOT implement barcode scanning.
- Do NOT implement price tracking / price comparison across stores.
- Do NOT implement store-specific aisle mapping (generic category grouping only).
- Do NOT implement inventory tracking (what's currently in the pantry/fridge).
- Do NOT implement push notifications or reminders for shopping trips.
- Do NOT implement collaborative real-time editing of lists (save-and-refresh model).

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/grocery/lists` | Yes | List all grocery lists |
| POST | `/api/v1/grocery/lists` | Yes | Create a grocery list |
| PUT | `/api/v1/grocery/lists/{id}` | Yes | Update grocery list metadata (name) |
| DELETE | `/api/v1/grocery/lists/{id}` | Yes | Delete grocery list |
| GET | `/api/v1/grocery/lists/{id}/items` | Yes | List items in a list |
| POST | `/api/v1/grocery/lists/{id}/items` | Yes | Add item |
| PUT | `/api/v1/grocery/items/{id}` | Yes | Update item (quantity, category, etc.) |
| DELETE | `/api/v1/grocery/items/{id}` | Yes | Remove item |
| PATCH | `/api/v1/grocery/items/{id}/check` | Yes | Toggle check-off |
| POST | `/api/v1/grocery/lists/{id}/clear-purchased` | Yes | Remove all checked items |
| POST | `/api/v1/grocery/lists/{id}/from-recipes` | Yes | Bulk-add ingredients from specified recipe IDs |
| GET | `/api/v1/meal-plans` | Yes | Get meal plan (current week or date range) |
| POST | `/api/v1/meal-plans` | Yes | Create/update meal plan entry |
| DELETE | `/api/v1/meal-plans/{id}` | Yes | Remove meal plan entry |
| POST | `/api/v1/meal-plans/to-grocery-list` | Yes | Bulk-add meal plan ingredients to grocery list |

## 6. Data Model (Summary)

**Tables:**
- `grocery_lists` — id, household_id, name, created_at, updated_at
- `grocery_categories` — id, household_id, name, sort_order (shared across lists)
- `grocery_items` — id, grocery_list_id (FK), category_id (FK, nullable), name, quantity, unit, is_checked, checked_by_user_id (FK, nullable), checked_at, source_recipe_id (FK, nullable), source_recipe_name (denormalised), created_at
- `meal_plans` — id, household_id, date, meal_slot (breakfast/lunch/dinner), recipe_id (FK, nullable), notes (nullable), created_at, updated_at

All tables carry `household_id` and filter queries by it. Unique constraint on meal_plans: (household_id, date, meal_slot).

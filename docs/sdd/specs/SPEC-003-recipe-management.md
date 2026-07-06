# SPEC-003: Recipe Management

## 1. Metadata
- **Author:** Human (directed per AGENTS.md)
- **Status:** Draft
- **Granularity Check:** One single context boundary? [x] Yes. All recipe-related features form a single domain.

## 2. The 5W1H Intent
- **Who:** Any household member.
- **What:** Store, organise, search, and scale family recipes — with ingredients, instructions, photos, categories, and links to the grocery list.
- **Where:** Frontend (`/recipes` module) ↔ Backend (`/api/v1/recipes/*`, `/api/v1/recipe-categories/*`) ↔ PostgreSQL.
- **When:** During meal planning and cooking — creating new recipes, searching for ideas, scaling ingredients, and generating grocery items.
- **Why:** To centralise family recipes in a searchable, scalable, grocery-aware repository — eliminating scattered cookbooks and mental overhead.

## 3. Acceptance Criteria (Given-When-Then)

### US-001: CRUD recipes with ingredients
- **Given** a logged-in household member,
- **When** the user creates a recipe with name, ingredients (name + quantity + unit), instructions (ordered steps), prep time, cook time, and serving count,
- **Then** the recipe is saved and displayed in the recipe list.
- **When** the user edits or deletes a recipe,
- **Then** the change is persisted immediately.

### US-002: Search & filter recipes
- **Given** multiple recipes exist,
- **When** the user searches by recipe name, ingredient name, category, or filters by prep/cook time range,
- **Then** matching recipes are displayed in real-time (or on submit for server-side search).
- **Given** no results match,
- **Then** an empty state message is shown with a suggestion to adjust filters.

### US-003: Scale servings
- **Given** a recipe is displayed with its original serving count,
- **When** the user changes the serving count to a different number,
- **Then** all ingredient quantities are proportionally recalculated and displayed.
- **Guard:** The original serving count and ingredient quantities are preserved in the database — scaling is a display-only calculation.

### US-004: Categories / tags
- **Given** a logged-in household member,
- **When** the user creates a recipe category (e.g., "Dinner", "Dessert", "Breakfast") or assigns existing categories to a recipe,
- **Then** the categories are filterable in the recipe list.
- **When** the user edits or deletes a category,
- **Then** recipe associations update accordingly (deleted categories are removed from affected recipes).

### US-005: Recipe photos
- **Given** a logged-in household member,
- **When** the user uploads one or more photos for a recipe (from device or URL),
- **Then** the photos are displayed in the recipe detail view (gallery layout).
- **When** the user removes a photo,
- **Then** it is deleted from storage and the recipe.

### US-006: Notes & versioning
- **Given** a logged-in household member viewing a recipe,
- **When** the user adds a cooking note (success/fail tips, substitutions tried),
- **Then** the note is displayed chronologically on the recipe detail page.
- **When** the user updates the recipe,
- **Then** a basic version history is maintained (previous versions viewable, not full diff — just snapshots on edit).

### US-007: Link to grocery list
- **Given** a logged-in household member viewing a recipe,
- **When** the user selects "Add ingredients to grocery list",
- **Then** all ingredients from the recipe (at current scaled quantity) are added as items to the household grocery list, grouped by recipe source.

## 4. Out of Scope (Guardrails)
- Do NOT implement nutrition calculation or dietary scoring.
- Do NOT implement meal planning / weekly calendar in this spec (deferred to grocery spec or future).
- Do NOT implement recipe import from URLs (pulling from external sites).
- Do NOT implement social sharing or public recipe publishing.
- Do NOT implement OCR for handwritten recipe scanning.
- Do NOT implement full Git-style diff on version history — snapshot-on-save only.

## 5. API Contracts (Summary)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/recipe-categories` | Yes | List categories |
| POST | `/api/v1/recipe-categories` | Yes | Create category |
| PUT | `/api/v1/recipe-categories/{id}` | Yes | Update category |
| DELETE | `/api/v1/recipe-categories/{id}` | Yes | Delete category |
| GET | `/api/v1/recipes` | Yes | List recipes (paginated, searchable, filterable) |
| POST | `/api/v1/recipes` | Yes | Create recipe |
| GET | `/api/v1/recipes/{id}` | Yes | Get recipe detail (with ingredients, steps, photos, notes, versions) |
| PUT | `/api/v1/recipes/{id}` | Yes | Update recipe |
| DELETE | `/api/v1/recipes/{id}` | Yes | Delete recipe |
| POST | `/api/v1/recipes/{id}/photos` | Yes | Upload photo(s) |
| DELETE | `/api/v1/recipes/{id}/photos/{photo_id}` | Yes | Remove photo |
| POST | `/api/v1/recipes/{id}/notes` | Yes | Add note |
| GET | `/api/v1/recipes/{id}/versions` | Yes | List version history |
| GET | `/api/v1/recipes/{id}/versions/{version_id}` | Yes | View specific version |
| POST | `/api/v1/recipes/{id}/to-grocery-list` | Yes | Add recipe ingredients to grocery list |

## 6. Data Model (Summary)

**Tables:**
- `recipe_categories` — id, household_id, name, created_at
- `recipes` — id, household_id, name, prep_time_minutes, cook_time_minutes, servings, instructions (JSON array of steps), created_at, updated_at
- `recipe_ingredients` — id, recipe_id (FK), name, quantity, unit, sort_order
- `recipe_category_associations` — recipe_id (FK), category_id (FK)
- `recipe_photos` — id, recipe_id (FK), file_path/url, sort_order, created_at
- `recipe_notes` — id, recipe_id (FK), user_id (FK), content, created_at
- `recipe_versions` — id, recipe_id (FK), version_number, snapshot (JSON of full recipe state at that point), created_at

All tables carry `household_id` (where applicable) and filter queries by it. Photo storage via filesystem or object store (deferred to infrastructure spec).

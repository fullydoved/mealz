# Mealz - Weekly Meal Planning App

A meal planning app for two people. Every Friday at 8PM, Mike and his wife sit down to plan the next week's meals. The app provides a weekly calendar view, AI-assisted recipe suggestions (Claude Haiku as a "sous chef"), and automatic grocery list generation.

## Tech Stack

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0, SQLite, Alembic migrations
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4 (no component library)
- **AI**: Claude Haiku via Anthropic API, streaming responses over SSE
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/sortable
- **Data fetching**: TanStack Query (React Query) + fetch API
- **Routing**: react-router-dom
- **Date handling**: date-fns

## Running the App

```bash
# Backend (port 8851 — do NOT use 8000, it's taken)
cd backend && ../venv/bin/python -m uvicorn app.main:app --reload --port 8851

# Frontend (port 5173)
cd frontend && npm run dev
```

- Python venv: always use `./venv/bin/pip` and `./venv/bin/python`
- Frontend proxies `/api/*` to `http://localhost:8851` (configured in `vite.config.ts`)
- API docs available at `http://localhost:8851/docs`

## Key Paths

| Path | Purpose |
|------|---------|
| `./venv/` | Python 3.12 virtual environment |
| `./.env` | `ANTHROPIC_API_KEY` — gitignored, never committed |
| `./mealz.db` | SQLite database file — gitignored |
| `backend/alembic/` | Database migrations |
| `backend/app/` | FastAPI application |
| `frontend/src/` | React application |

## Project Structure

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app setup, CORS middleware, router registration
- **`config.py`** — Settings loaded from `.env` (database URL, API key)
- **`database.py`** — SQLAlchemy engine, session factory, `Base` class, `get_db` dependency
- **`models/`** — SQLAlchemy ORM models:
  - `ingredient.py` — `Ingredient` (name, category, default_unit)
  - `recipe.py` — `Recipe` + `RecipeIngredient` (association table with quantity/unit/preparation)
  - `meal_plan.py` — `WeekPlan` + `MealSlot` (links days to recipes, supports leftover marking)
  - `chat.py` — `ChatSession` + `ChatMessage`
- **`schemas/`** — Pydantic models for request/response validation (mirrors each model file)
- **`routers/`** — FastAPI route handlers:
  - `recipes.py` — CRUD with inline ingredients, search by name/tag
  - `ingredients.py` — CRUD + autocomplete search + category list
  - `meal_plans.py` — Week plan CRUD + meal slot add/update/delete
  - `grocery.py` — On-the-fly grocery list generation from a week plan
  - `chat.py` — Chat session creation, message history, SSE streaming
- **`services/`** — Business logic:
  - `grocery.py` — Aggregates ingredients across all non-leftover meal slots, sums quantities by ingredient+unit, groups by category
  - `chat.py` — Builds context (week plan meals or full recipe), manages conversation history (20-message sliding window), streams Claude Haiku responses

### Frontend (`frontend/src/`)

- **`main.tsx`** — Entry point: React Query provider, BrowserRouter, StrictMode
- **`App.tsx`** — Top-level layout with nav tabs (Plan / Recipes / Grocery) and route definitions
- **`api/index.ts`** — All API client functions (typed fetch wrappers + SSE streaming generator)
- **`types/index.ts`** — TypeScript interfaces matching backend schemas
- **`hooks/useWeekNavigation.ts`** — Week navigation state (prev/next/today, computes Monday start)
- **`components/`**:
  - `ui/` — Shared primitives: `Button` (variants: primary/secondary/danger/ghost), `Modal` (dialog-based), `Card`
  - `recipes/` — `RecipeList` (search + grid), `RecipeDetail` (full view + delete), `RecipeForm` (create/edit with ingredient autocomplete and inline creation)
  - `calendar/` — `WeekCalendar` (7-day grid with dnd-kit drag-and-drop), `DayColumn` (droppable), `MealSlotCard` (draggable, leftover toggle), `RecipePicker` (modal search to assign recipe to slot)
  - `grocery/` — `GroceryListView` (category-grouped checklist with strike-through)
  - `chat/` — `ChatSidebar` (session management + streaming display + quick actions), `ChatMessage` (user/assistant bubbles), `ChatInput` (textarea with Enter-to-send)

## API Endpoints

### Recipes
- `GET /api/recipes?search=&tag=` — List (returns summaries)
- `POST /api/recipes` — Create with inline ingredients
- `GET /api/recipes/{id}` — Full detail with ingredients
- `PUT /api/recipes/{id}` — Update (partial, replaces ingredients if provided)
- `DELETE /api/recipes/{id}`

### Ingredients
- `GET /api/ingredients?search=&category=` — List/autocomplete
- `POST /api/ingredients` — Create
- `GET /api/ingredients/categories` — Returns `["produce","meat","dairy","pantry","frozen","bakery","other"]`

### Meal Plans
- `GET /api/meal-plans?week_start=YYYY-MM-DD` — Get plan for a week (returns null if none)
- `POST /api/meal-plans` — Create new week plan
- `PUT /api/meal-plans/{id}` — Update notes
- `POST /api/meal-plans/{id}/slots` — Add a meal slot
- `PUT /api/meal-plans/{id}/slots/{slot_id}` — Update slot (move day, change recipe, toggle leftover)
- `DELETE /api/meal-plans/{id}/slots/{slot_id}` — Remove slot

### Grocery List
- `GET /api/meal-plans/{id}/grocery-list` — Generated on-the-fly, not stored

### Chat
- `POST /api/chat/sessions` — Create session (with context_type: general/week_plan/recipe)
- `GET /api/chat/sessions/{id}/messages` — Message history
- `POST /api/chat/sessions/{id}/messages` — Send message, returns SSE stream

## Data Model

- **`ingredients`** — Canonical ingredient list (name unique, category, default_unit)
- **`recipes`** — Name, description, servings (default 2), prep/cook time, instructions (markdown), tags (JSON array)
- **`recipe_ingredients`** — Association: recipe_id + ingredient_id + quantity + unit + preparation + optional flag
- **`week_plans`** — One per week, keyed by `week_start` (Monday, unique)
- **`meal_slots`** — Belongs to week_plan, has date + meal_type + recipe_id + is_leftover + leftover_source_id + sort_order
- **`chat_sessions`** / **`chat_messages`** — Conversation history with context links

## Conventions

- All measurements in grams (metric). Units: `g`, `ml`, `unit`
- Recipes target 2 servings by default
- Python uses type hints throughout
- Frontend uses TypeScript strict mode
- Week starts on Monday
- Grocery list skips leftover slots when aggregating
- Chat uses a 20-message sliding window for context
- AI model: `claude-haiku-4-5-20251001`

## Database Migrations

```bash
cd backend

# Create a new migration after model changes
../venv/bin/alembic revision --autogenerate -m "description"

# Apply migrations
../venv/bin/alembic upgrade head
```

SQLite uses `render_as_batch=True` in Alembic for ALTER TABLE support.

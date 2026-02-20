# Mealz

A meal planning app for two. Built to solve a very specific problem: every Friday night, my wife and I sit down to plan the next week's meals, and it was always a mess of texts, bookmarks, and forgotten grocery items.

Mealz gives us a monthly calendar to drag-and-drop meals into place, an AI sous chef to brainstorm and save recipes on the fly, and a grocery list that builds itself from whatever we've planned.

**This project was built almost entirely with AI** (Claude Code). It's a personal tool shared publicly in case it's useful to anyone else, but it's not designed for scale or multi-user use. There's no auth, no user accounts — just a single household's meal planner.

## Features

- **Monthly calendar** — drag-and-drop meal planning, Saturday-through-Friday weeks
- **AI sous chef** — chat sidebar powered by Claude that can create recipes, update ingredients, and add meals to your plan mid-conversation
- **Recipe book** — full CRUD with ingredients, instructions (markdown), tags, and search
- **Grocery list** — auto-generated from your weekly plan, grouped by category, with checkboxes
- **Dark mode** — easy on the eyes for Friday night planning sessions

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, SQLite |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| AI | Claude Haiku via Anthropic API (streaming SSE + tool use) |
| Drag & drop | @dnd-kit/core |
| Data fetching | TanStack Query |

## Deploy with Docker

Mealz runs as a single Docker container. Designed for a home server (Unraid, Synology, Proxmox, bare metal — whatever you've got).

### Prerequisites

- Docker and Docker Compose
- An [Anthropic API key](https://console.anthropic.com/) (for the AI chat features)

### Quick Start

```bash
git clone https://github.com/fullydoved/mealz.git
cd mealz
```

Create a `.env` file with your API key:

```bash
echo "ANTHROPIC_API_KEY=your-key-here" > .env
```

Build and run:

```bash
docker compose up -d
```

That's it. Open `http://<your-server-ip>:8851` in a browser.

### What Happens Under the Hood

- Multi-stage Docker build: Node compiles the frontend, Python serves everything
- Database migrations run automatically on startup
- SQLite database persists in a Docker volume (`mealz-data`)
- No reverse proxy or separate web server needed — FastAPI serves the SPA directly

### Updating

```bash
cd mealz
git pull
docker compose up -d --build
```

### Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for the AI chat features |
| `DATABASE_URL` | No | SQLite URL (defaults to `/data/mealz.db` inside the container) |

The chat will still work without an API key — it just won't have an AI behind it.

### Changing the Port

Edit `docker-compose.yml` and change the port mapping:

```yaml
ports:
  - "3000:8851"  # access on port 3000 instead
```

## Local Development

If you want to hack on it:

```bash
# Backend
cd backend
python -m venv ../venv
../venv/bin/pip install -r requirements.txt
../venv/bin/alembic upgrade head
../venv/bin/python -m uvicorn app.main:app --reload --port 8851

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API calls to the backend.

## License

[MIT](LICENSE)

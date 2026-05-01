# PricePilot Ai

PricePilot Ai is a FinTech + AI cost prediction platform for freelancers building AI agents. Pick the LLMs / vector DBs / hosts you need, set your usage assumptions, and see what your monthly bill is going to look like — before you ship.

This is a classic **React + Django REST** application.

```
costforge/
├── backend/         Django REST Framework API (Python)
│   ├── api/             Models, serializers, views, URLs
│   ├── costforge/       Django project settings & root URLs
│   ├── manage.py
│   └── requirements.txt
└── frontend/        React + Vite SPA (TypeScript)
    ├── src/
    │   ├── components/  UI components (shadcn/ui based)
    │   ├── hooks/       Reusable React hooks
    │   ├── lib/         API client (api.ts) + React Query hooks (queries.ts)
    │   └── pages/       Page components — one per route
    ├── public/
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## Quick start (local development)

You need **Python 3.11+** and **Node 20+** installed.

### 1. Backend — Django on port 8000

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed                # creates the demo user + 13 sample services
python manage.py runserver 0.0.0.0:8000
```

Demo user credentials:

```
username: demo
password: pricepilot-demo-2026
```

### 2. Frontend — React on port 5000 (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5000. The Vite dev server proxies `/api/*` to the Django server at `localhost:8000`, so you can develop both halves with hot-reload.

---

## Production build

The simplest deployment is to let Django serve the React build from the same process:

```bash
# 1. Build the React app
cd frontend
npm install
npm run build           # outputs to frontend/dist

# 2. Collect Django static files and run the server
cd ../backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py collectstatic --noinput
DJANGO_DEBUG=0 python manage.py runserver 0.0.0.0:8000
# (or, for real production: gunicorn costforge.wsgi --bind 0.0.0.0:8000) [Note: keep costforge in production config]
```

That's it — visit `http://localhost:8000` and Django will serve both the React shell at `/` and the REST API at `/api/*`.

---

## How the pieces fit together

### Authentication

- The frontend bootstraps a demo user on first load: it tries to `POST /api/auth/register/` with `demo / pricepilot-demo-2026`, falls back to `POST /api/auth/login/` if the user already exists.
- JWT access + refresh tokens are stored in `localStorage` (`pricepilot_jwt_access`, `pricepilot_jwt_refresh`).
- Every request goes through `frontend/src/lib/api.ts`, which transparently refreshes the access token on 401.

### Cost calculation

- The authoritative cost engine lives in `backend/api/calculator.py` and is exposed via `POST /api/projects/<id>/calculate/`.
- A client-side mirror in `frontend/src/lib/calculator.ts` provides instant updates while the user drags the usage sliders, so we don't hit the backend for every keystroke.
- Both implementations support the six pricing model types: `per_token`, `per_seat`, `per_request`, `flat_rate`, `usage_based`, `tiered`.

### LLM service suggestion (optional)

- `POST /api/services/suggest/` returns AI-suggested services for a project description.
- When `ANTHROPIC_API_KEY` is set in the environment, the endpoint calls Claude. When it's not, a deterministic heuristic fallback is used — perfect for demos and tests.

---

## Useful commands

| What                          | Where       | Command                                                              |
| ----------------------------- | ----------- | -------------------------------------------------------------------- |
| Reset the database            | `backend/`  | `rm db.sqlite3 && python manage.py migrate && python manage.py seed` |
| Re-seed without wiping the DB | `backend/`  | `python manage.py seed`                                              |
| Frontend type-check           | `frontend/` | `npm run typecheck`                                                  |
| Frontend production build     | `frontend/` | `npm run build`                                                      |
| Preview the production build  | `frontend/` | `npm run preview`                                                    |

---

## Environment variables

All optional — sensible defaults are baked in.

| Variable                 | Default                 | Purpose                                           |
| ------------------------ | ----------------------- | ------------------------------------------------- |
| `DJANGO_SECRET_KEY`      | dev placeholder         | Django's signing key. **Set this in production.** |
| `DJANGO_DEBUG`           | `1`                     | Set to `0` in production.                         |
| `ANTHROPIC_API_KEY`      | unset                   | Enables Claude-powered service suggestions.       |
| `BACKEND_URL` (frontend) | `http://localhost:8000` | Where the Vite dev proxy forwards `/api/*`.       |
| `PORT` (frontend)        | `5000`                  | Port the Vite dev server binds to.                |

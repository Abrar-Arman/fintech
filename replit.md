# CostForge — Project Notes

CostForge is a FinTech + AI cost prediction platform for freelancers building AI agents. It is now structured as a **typical React + Django REST application**.

## Project layout

```
/
├── backend/         Django REST Framework API (Python 3.11, SQLite)
│   ├── api/             Models, serializers, views, URLs, calculator
│   ├── costforge/       Django settings + root URLs (serves React in prod)
│   ├── manage.py
│   └── requirements.txt
├── frontend/        React + Vite SPA (npm-based, TypeScript)
│   ├── src/
│   ├── public/
│   ├── index.html
│   ├── package.json     ← inlined npm dependencies (no pnpm catalog)
│   ├── vite.config.ts   ← proxies /api/* to localhost:8000 in dev
│   └── tsconfig.json
├── README.md        Full run / build / deploy instructions
└── artifacts/costforge/.replit-artifact/artifact.toml
                     ← thin Replit metadata so the preview pane + publish
                       button know where the app lives. Do NOT delete.
```

## Run locally

```
# Terminal 1
cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py seed && python manage.py runserver 0.0.0.0:8000

# Terminal 2
cd frontend && npm install && npm run dev
```

Demo user: `demo` / `costforge-demo-2026`.

## How it deploys (Replit autoscale)

- **Build step**: builds the React bundle, then installs Python deps, migrates, seeds, and collects static files.
- **Run step**: `cd backend && DJANGO_DEBUG=0 python manage.py runserver 0.0.0.0:$PORT`.
- Django serves both `/api/*` and the React SPA shell from one process via WhiteNoise.
- This fixes the previous deployment bug where only the static frontend was published and `/backend/api/*` 404'd.

## Workflows (dev)

- `Backend (Django)` — runs Django on port 8000.
- `artifacts/costforge: web` — runs Vite on port 5000 (the user-facing port; proxies `/api/*` to Django).

## Important code paths

- **Cost engine**: `backend/api/calculator.py` (authoritative) + `frontend/src/lib/calculator.ts` (instant client mirror).
- **API client**: `frontend/src/lib/api.ts` — handles JWT storage, refresh-on-401, and uses `/api` (no `/backend` prefix).
- **React Query hooks**: `frontend/src/lib/queries.ts` — the only thing pages should use.
- **LLM service suggestion**: `backend/api/llm.py` — falls back to a deterministic heuristic when `ANTHROPIC_API_KEY` is unset.

## Design choices worth remembering

- We deliberately keep the artifact registration (`artifacts/costforge/.replit-artifact/`) minimal — it only describes how Replit should run/build/serve. All actual code lives in `frontend/` and `backend/`. The artifact directory contains nothing else.
- pnpm + workspace catalog dependencies were removed; `frontend/package.json` lists every version explicitly and uses npm.
- Tokens (`costforge_jwt_access`, `costforge_jwt_refresh`, `costforge_user`) live in `localStorage`. There is no SSR — the SPA bootstraps a demo user on first paint.
- Pricing variants use a JSON `usage_inputs` column so we can add new pricing models without schema migrations.

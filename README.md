# PricePilot Ai

**AI-powered cost estimation platform for modern software projects.**

PricePilot Ai helps developers and freelancers understand the **real operational costs** of their projects before shipping. Simply:

1. **Select or describe your tech stack** — Choose from 150+ services (LLMs, vector DBs, hosting, storage, etc.) or use AI to auto-detect them from your project description.
2. **Input your usage assumptions** — How many active users? Requests per user? Tokens per request? Storage and bandwidth needs?
3. **Get instant cost predictions** — Per-service breakdown + three risk scenarios (Conservative 50% / Expected 100% / Aggressive 200%) to show budget headroom.
4. **Make data-driven decisions** — Understand cost implications before committing to a tech stack.

Built with **React + Django REST Framework**.

```
fintech/
├── backend/              Django REST Framework API (Python 3.11+)
│   ├── api/                 Models, views, serializers, LLM integration
│   │   ├── views.py         API endpoints (services, projects, auth)
│   │   ├── calculator.py    Cost calculation engine (6 pricing models)
│   │   ├── llm.py           Claude-powered service suggestions
│   │   ├── fuzzy.py         Fuzzy matching for service discovery
│   │   ├── models.py        Database models (User, Service, Project, etc.)
│   │   └── pricing_models.py Pricing model definitions
│   ├── costforge/           Django settings & root URLs
│   ├── manage.py
│   ├── requirements.txt
│   └── db.sqlite3           SQLite database
├── frontend/             React + TypeScript + Vite (Node 20+)
│   ├── src/
│   │   ├── components/      UI components (shadcn/ui)
│   │   ├── pages/           Route pages (dashboard, projects, services)
│   │   ├── lib/
│   │   │   ├── api.ts       Typed API client with JWT auth
│   │   │   ├── calculator.ts Client-side cost calculation mirror
│   │   │   └── queries.ts    React Query hooks for data fetching
│   │   ├── hooks/           Custom React hooks
│   │   └── App.tsx          Root component
│   ├── public/              Static assets
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── index.html
└── artifacts/            Demo artifacts (frontend preview)
```

---

## Tech Stack

### Backend (Python)

- **Django 5.0.6** — Web framework with ORM
- **Django REST Framework** — REST API toolkit with authentication
- **Anthropic Claude API** — LLM for service suggestion and analysis
- **SQLite** — Lightweight database (production: PostgreSQL recommended)
- **Python Decimal** — Precise financial calculations

### Frontend (TypeScript)

- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Fast build tool and dev server
- **shadcn/ui** — Headless UI component library (Radix + Tailwind)
- **TailwindCSS** — Utility-first styling
- **React Query (TanStack Query)** — Server state management
- **Wouter** — Lightweight client-side router
- **Lucide React** — Icon library
- **React Hook Form** — Form state management

### DevOps & Tools

- **Vite** — Frontend dev server with HMR and proxy
- **JWT (JSON Web Tokens)** — Stateless authentication
- **SQLite/Django ORM** — Database layer
- **Git** — Version control

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

### How Cost Calculation Works

1. **Service Selection** — User selects services (OpenAI, Pinecone, Vercel, AWS, Stripe, etc.) via UI or AI suggestion.

2. **Usage Input** — User provides expected metrics:
   - `active_users`: Number of concurrent/monthly active users
   - `requests_per_user`: API calls per user
   - `tokens_per_request`: Tokens consumed per request (for LLMs)
   - `storage_gb`, `bandwidth_gb`, `compute_hours`: Infrastructure metrics

3. **Pricing Model** — Each service variant has a pricing model:
   - **per_token**: LLM APIs (OpenAI, Claude, etc.) — `price * (tokens / 1000)`
   - **per_seat**: SaaS tools (Slack, Notion, etc.) — `price_per_seat * users`
   - **per_request**: Some APIs — `price * requests`
   - **flat_rate**: Subscription fees — fixed monthly cost
   - **usage_based**: Storage/bandwidth — `price_per_unit * units`
   - **tiered**: Volume-based discounts — stepped pricing

4. **Cost Breakdown** — Server calculates per-service cost:

   ```
   Example: OpenAI GPT-4o at $0.03/1k input + $0.06/1k output tokens
   100 users × 50 requests/user × 500 tokens/request = 2.5M tokens/month
   Cost = (2.5M / 1000) × $0.045 (avg of in+out) = $112.50/month
   ```

5. **Scenarios** — Three budget scenarios show cost range:
   - **Conservative (50% usage)**: Optimistic projection, low demand
   - **Expected (100% usage)**: Your baseline estimates
   - **Aggressive (200% usage)**: Worst-case, high demand spike

6. **Headroom Analysis** — Shows how much of your budget is used:
   ```
   Budget: $5000/month
   Expected Cost: $3200/month
   Headroom: $1800 (36% remaining)
   ```

### LLM Service Suggestion (AI-Powered Discovery)

- **Endpoint**: `POST /api/services/suggest/`
- **Input**: Project name, description, tech stack
- **Process**:
  1. Sends to Claude with system prompt: "You are PricePilot Ai, suggest paid services this project needs"
  2. Claude returns JSON list of services with reasons
  3. Services are fuzzy-matched against our database for accuracy
  4. Returns: matched services + suggestions + unmatched names
- **Fallback**: If `ANTHROPIC_API_KEY` is missing, uses keyword-based heuristic (works offline)

**Example Response**:

```json
{
  "matched": [
    {"service_id": 1, "name": "OpenAI GPT-4o", "category": "llm", "reason": "AI agent needs LLM"}
  ],
  "suggestions": [{"query": "Claude", "options": [...]}],
  "unmatched": [{"name": "Custom LLM", "reason": "Not in our database"}],
  "source": "anthropic"
}
```

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

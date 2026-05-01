# PricePilot Ai — Django REST Framework backend

This is the server side of PricePilot Ai, the AI-agent budget predictor.
It implements the project flow described in the product brief:

```
1. Create project
2. Three input sources (LLM suggest / browse / custom)
3. Fuzzy check — mandatory gate against the services table
4. Add service to project
5. Pick variant (existing community variants OR create new)
6. Register pricing model (one of the 6 supported types)
7. Enter usage inputs
8. Calculate cost (per-service breakdown + scenarios)
9. Output predicted budget
```

The React frontend lives in `artifacts/pricepilot-ai/` and currently runs
against an in-browser mock store; pointing it at this backend is a
matter of swapping the store calls for `fetch('/api/...')` requests
that match the endpoints below.

## Running locally

```bash
cd backend
python manage.py migrate
python manage.py seed              # 13 services + their official variants
python manage.py createsuperuser   # optional, for /admin
python manage.py runserver 0.0.0.0:8000
```

The Replit workflow `PricePilot Ai Django API` runs `migrate` + `seed` +
`runserver` automatically on port 8000.

### Optional: enable the LLM suggester

The `/api/services/suggest/` endpoint uses Anthropic's Claude when
`ANTHROPIC_API_KEY` is set in the environment. Without the key it
falls back to a deterministic keyword heuristic so the demo still
works offline.

## Endpoints

| Method | Path                                        | Purpose                                                               |
| ------ | ------------------------------------------- | --------------------------------------------------------------------- |
| POST   | `/api/auth/register/`                       | Create a user, returns `{ user, access, refresh }`                    |
| POST   | `/api/auth/login/`                          | Username + password login, returns JWT pair                           |
| POST   | `/api/auth/refresh/`                        | Refresh access token                                                  |
| GET    | `/api/auth/me/`                             | Current user (JWT required)                                           |
| GET    | `/api/pricing-models/`                      | The 6 pricing model schemas + plain-English explanations              |
| GET    | `/api/services/`                            | List all approved services (`?category=llm&search=gpt`)               |
| POST   | `/api/services/`                            | Submit a new service (lands in `pending` status for community vote)   |
| GET    | `/api/services/{id}/`                       | Service detail with all its variants                                  |
| GET    | `/api/services/fuzzy/?q=...`                | Fuzzy match a query against the services table (step 3)               |
| POST   | `/api/services/suggest/`                    | LLM-powered service suggestion for a project context (step 2)         |
| GET    | `/api/variants/?service={id}`               | Variants for a service                                                |
| POST   | `/api/variants/`                            | Create a new pricing variant                                          |
| POST   | `/api/variants/{id}/vote/`                  | Body `{ value: 1 \| -1 \| 0 }` — toggle vote                          |
| GET    | `/api/projects/`                            | The current user's projects                                           |
| POST   | `/api/projects/`                            | Create a project (body: name, description, budget_target, tech_stack) |
| POST   | `/api/projects/{id}/add_service/`           | Attach a service + chosen variant (or custom inputs)                  |
| DELETE | `/api/projects/{id}/services/{service_id}/` | Remove a service from the project                                     |
| POST   | `/api/projects/{id}/calculate/`             | Run the cost engine: returns total + breakdown + 3 scenarios          |

### Example: end-to-end with curl

```bash
# 1. Create an account
TOKEN=$(curl -s -X POST localhost:8000/api/auth/register/ \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo","email":"d@e.com","password":"hackathon2026"}' \
  | python -c 'import sys,json;print(json.load(sys.stdin)["access"])')

# 2. Get LLM service suggestions for a project idea
curl -s -X POST localhost:8000/api/services/suggest/ \
  -H 'Content-Type: application/json' \
  -d '{"name":"Meeting summarizer","description":"Agent that joins Zoom calls and emails action items","tech_stack":["nextjs"]}' | jq

# 3. Create a project
PROJECT_ID=$(curl -s -X POST localhost:8000/api/projects/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Meeting summarizer","description":"...","budget_target":500}' \
  | python -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# 4. Add a service + the official OpenAI variant
curl -s -X POST localhost:8000/api/projects/$PROJECT_ID/add_service/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"service_id":1,"variant_id":1}'

# 5. Calculate the predicted monthly cost
curl -s -X POST localhost:8000/api/projects/$PROJECT_ID/calculate/ \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"usage":{"active_users":100,"requests_per_user":50,"tokens_per_request":2000}}' | jq
```

## Architecture notes

- **Pricing model registry (`api/pricing_models.py`)** — single source
  of truth for the 6 supported pricing types. Each entry exposes its
  field shape, validation hints, and human explanation. The frontend
  reads this list via `/api/pricing-models/` so adding a new model
  type is a one-file change here, no frontend coupling.
- **Fuzzy gate (`api/fuzzy.py`)** — `rapidfuzz.process.extract` with
  `WRatio` against the services table. ≥ 80 = confident match, ≥ 55 =
  "did you mean" suggestion, otherwise we treat the input as a brand
  new service that needs a community vote.
- **LLM suggester (`api/llm.py`)** — Anthropic Claude when the key is
  set, otherwise a keyword heuristic. Either path runs every output
  through the fuzzy gate so we never invent services that don't exist.
- **Calculator (`api/calculator.py`)** — pure function over a project
  - usage payload. Returns a per-service breakdown plus three
    scenarios (`conservative`, `expected`, `aggressive`) so the
    frontend can render the budget headroom meter.
- **Voting** — one row per `(user, variant)` enforced by
  `unique_together`. `POST /variants/{id}/vote/` accepts `1`, `-1`,
  or `0` (which removes the user's vote).

# Musafir Travels (Trip Planner)

Trip planner with user accounts, manual and AI-assisted trip creation, and PDF export.
Active branch: `trip_planner.AI`. `master` still holds the deprecated v1 app (SQLite, share links, weather widget).

## Stack

- **Frontend:** React 19 + TypeScript + Vite, Tailwind CSS v3, TanStack Query, React Router, jsPDF (client-side PDF)
- **UI:** warm theme tokens in `tailwind.config.js`, shared classes (`.btn-primary`, `.card`, `.field-input`, ...) in `src/index.css`, inline SVG icons in `src/components/Icon.tsx`, and hero photos in `public/images/`. Reuse these rather than one-off styles.
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0 + Alembic, JWT auth (PyJWT + passlib/bcrypt)
- **Database:** PostgreSQL 16 (psycopg driver); local via Docker, production on AWS RDS
- **AI:** Groq `openai/gpt-oss-120b` via the `groq` SDK (`GroqAdapter`, behind a `ProviderAdapter` protocol so tests can inject a fake). Groq is the only provider.
- **Infra:** AWS via Terraform: VPC, ALB, ECS Fargate, RDS, ECR, Secrets Manager, GitHub OIDC deploy role; CloudFront module exists but is disabled
- **CI/CD:** GitHub Actions (`ci.yml` on every push/PR; `deploy.yml` on push to `trip_planner.AI`)

## Directory layout

```
trip-planner/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routers under /api/v1, GET /health
│   │   ├── config.py          # pydantic-settings (reads .env)
│   │   ├── database.py        # engine (pool_pre_ping), SessionLocal, get_db
│   │   ├── models.py          # User, Trip, Day, Activity
│   │   ├── errors.py          # generic 500 handler
│   │   ├── routers/           # auth, trips, activities, ai
│   │   ├── schemas/           # pydantic request/response models
│   │   └── services/          # auth_service, ai_service, ai_prompts
│   ├── alembic/               # migrations (run by deploy.yml, not on container start)
│   ├── tests/                 # pytest, needs Postgres
│   ├── Dockerfile, entrypoint.sh
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/               # fetch client, TanStack Query hooks, AI calls
│       ├── auth/              # AuthContext (token in localStorage), ProtectedRoute
│       ├── components/        # DayPlanner, TripChat, TripDraftReview, PrintButton, ...
│       ├── hooks/             # useDraftPersistence (AI chat draft restore)
│       ├── pages/             # Home (/trips), NewTrip, TripItinerary, Login, Signup
│       └── types/, utils/
├── infra/
│   ├── environments/prod/     # root Terraform config (tfvars/backend.hcl gitignored)
│   ├── modules/               # network, alb, ecs, database, ecr, iam-oidc, cdn
│   ├── scripts/               # backup.sh, destroy.sh, restore.sh
│   └── README.md              # bootstrap, usage, GitHub variables, cost notes
├── specs_new/                 # authoritative specs
├── specs_old/                 # v1 specs (reference only)
├── docs/architecture/         # Archify architecture diagram
├── .github/workflows/         # ci.yml, deploy.yml
├── PROGRESS.md                # build log
└── CLAUDE.md
```

## Specs

`specs_new/` is authoritative; `specs_old/` describes v1 only.

- [Goal](specs_new/goal-spec.md)
- [Frontend](specs_new/frontend-spec.md)
- [Backend](specs_new/backend-spec.md)
- [API contract](specs_new/api-contract-spec.md)
- [AI](specs_new/AI-spec.md)

## Running locally

### Database (Postgres in Docker)

```
docker run -d --name musafir-postgres -p 5432:5432 ^
  -e POSTGRES_USER=musafir -e POSTGRES_PASSWORD=musafir -e POSTGRES_DB=musafir postgres:16
```

If the container already exists: `docker start musafir-postgres`.

### Backend

```
cd backend
copy .env.example .env        # then edit as needed
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

- Health: http://localhost:8000/health
- API: http://localhost:8000/api/v1 (docs at http://localhost:8000/docs)
- AI is off unless `backend/.env` has `AI_ENABLED=true` and `AI_API_KEY` set to a Groq key (`gsk_...`). `AI_PROVIDER` must be `groq`, or be left unset; any other value stops the app at startup.

### Frontend

```
cd frontend
npm install
npm run dev
```

Serves http://localhost:5173. `VITE_API_BASE_URL` (in `frontend/.env`) selects the backend:
- `http://localhost:8000/api/v1` for the local backend
- `http://musafir-alb-1646923822.us-east-1.elb.amazonaws.com/api/v1` for AWS (works from localhost only; see Deployment)

### Tests and checks

- Backend: `cd backend && pytest` (needs the local Postgres above)
- Frontend: `npm test` (Vitest), `npm run lint` (oxlint), `npm run build` (tsc + Vite)

## Deployment

- **Backend:** push to `trip_planner.AI` → `deploy.yml` runs CI → builds image to ECR (tagged with the commit SHA) → registers a task definition revision → runs `alembic upgrade head` as a one-off ECS task → updates the ECS service → checks `/health`. Needs 9 repository Variables (see `infra/README.md`).
- **Infra changes:** `terraform plan` / `apply` from `infra/environments/prod`. Terraform ignores the ECS service's `task_definition`, so a CORS or env change only takes effect on the next deploy.
- **API URL:** `http://musafir-alb-1646923822.us-east-1.elb.amazonaws.com/api/v1` (HTTP only).

## Known constraints

- **CloudFront disabled:** AWS blocks new CloudFront resources until the account is verified. Until then the API is HTTP-only through the ALB, so an HTTPS frontend (Vercel) can't call it because of mixed content. To re-enable, uncomment `module "cdn"` and its output in `infra/environments/prod`.
- **AWS free plan:** RDS backup retention is capped at 1 day.
- **AI disabled in production:** `terraform.tfvars` has `ai_enabled = false` with `ai_provider = "groq"` and `ai_model = "openai/gpt-oss-120b"`. To enable it:
  1. Set the Groq key as `TF_VAR_ai_api_key` in the terminal (never commit it).
  2. Set `ai_enabled = true`.
  3. Run `terraform apply`, then deploy. ECS reads the key secret only when a task starts.
  - **Every later `terraform apply` needs `TF_VAR_ai_api_key` set too.** Without it, Terraform overwrites the stored key with an empty value.
- **Business rules vs. request validation:** business rules return 400 and are enforced in routers (empty activity text, `end_date` before `start_date`); request-shape errors return 422 from pydantic. Keep that split.
- **Ownership:** another user's resources return 404, not 403.
- **AI rate limits:** both the per-user limit and Groq's quota return 429 with `Retry-After`, which CORS exposes. The chat counts down from it. Groq's free tier allows about 5 turns per minute.
- **Dev servers:** after changing `tailwind.config.js`, restart Vite (it caches the config). On Windows, `uvicorn --reload` can leave an orphaned worker that keeps serving old code; if changes don't show up, stop every uvicorn/python process on port 8000 and restart.

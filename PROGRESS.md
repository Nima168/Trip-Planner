# Trip Planner — Progress Log

Tracks what's been built so far against the approved build plan (see plan history / `CLAUDE.md`). Updated as work lands.

The project is in its second version. **v2 (Musafir Travels, branch `trip_planner.AI`)** is a full replacement built from `specs_new/` and is logged first. The **v1 log** (branch `master`) is kept unchanged below it as history.

---

# v2 — Musafir Travels (`trip_planner.AI`)

Last updated: 2026-09-24.

## Status by phase

| Phase | Scope | Status |
|---|---|---|
| 0 | Groundwork: `specs_new/` adopted as authoritative, decisions recorded | Done |
| 1 | Backend data model + auth | Done |
| 2 | Backend Trip/Day/Activity CRUD | Done |
| 3 | Backend AI trip-draft endpoint | Done |
| 4 | Frontend rewrite (TypeScript, Tailwind, TanStack Query) | Done |
| 5 | Frontend AI chat flow + PDF export | Done |
| 6 | AWS infrastructure (Terraform) | Done, manually verified. CloudFront disabled (see below) |
| 7 | CI/CD | Done: pipeline passing, live API tested, localhost frontend manually verified |
| 8 | Cutover & decommission | Not started (mostly blocked on CloudFront) |

## Decisions (confirmed with user)

- **Full replacement, not additive:** v1 code deleted outright and v1 data discarded (no migration).
- **Cloud and model:** stay on AWS and Anthropic (Render and Grok were considered and rejected).
- **AWS now:** AWS migration done in this build, not deferred.
- **Deploy branch:** `trip_planner.AI`, with a fresh Vercel project until cutover.
- **Trip details form:** required fields are marked `*` (replacing the earlier "Still needed" note).
- **PDF button:** renamed from "Print" to **"Save as PDF"**. It and **Delete** now show on every trip, including trips with no activities (previously hidden until the first activity existed). `frontend-spec.md` updated to match.

## Backend (`backend/`)

- **Data model** (`app/models.py`): `User`, `Trip` (destination, start/end date, `trip_type` enum solo/couple/family/group_of_friends, owner), `Day` (day_number, date), `Activity` (text, sort_order). One Alembic migration: `2c81e85d2b55_initial_schema_users_trips_days_`.
- **Database:** Postgres only. Locally a `musafir-postgres` Docker container; in production RDS. `database.py` uses `pool_pre_ping=True` (see the RDS entry below for why).
- **Auth** (`routers/auth.py`, `services/auth_service.py`): signup and login return a JWT. Passwords are hashed with bcrypt. `get_current_user` guards every trip/AI route.
- **Trips/Days/Activities** (`routers/trips.py`, `routers/activities.py`): creating a trip generates one Day per date. Another user's resources return 404, not 403.
  - **Business rules return 400** and are enforced in routers: `end_date` before `start_date`, empty activity text.
  - **Request-shape errors return 422** from pydantic.
- **AI trip draft** (`routers/ai.py`, `services/ai_service.py`, `services/ai_prompts.py`): `POST /api/v1/ai/trip-draft` takes the chat history, the current draft, a reference date and a timezone, and returns an updated draft.
  - Claude Haiku is called through a `ProviderAdapter` protocol using a tool-use structured result, so tests can swap in a fake provider.
  - An in-memory per-process rate limit applies.
  - Returns 503 "AI is currently unavailable" when `AI_ENABLED=false` or on provider errors.
- **Tests:** 44 pytest tests (auth 7, trips 11, activities 10, AI 16) against Postgres. Green locally and in CI.

## Frontend (`frontend/`)

- **Stack:** React 19 + TypeScript + Vite + Tailwind v3 + TanStack Query.
- **Routes:** `/login`, `/signup`, `/trips` (home), `/trips/new`, `/trips/:tripId`.
- **Auth** (`auth/AuthContext.tsx`): the token and username are stored in `localStorage`. A 401 logs the user out.
  - **Bug found and fixed during Phase 7 manual testing:** a page refresh logged the user out. The token was handed to the API client inside a `useEffect`, and React runs child effects first, so the first query after a refresh went out with no `Authorization` header, got a 401 and triggered logout. The token is now set synchronously (state initializer, login, logout).
  - Regression test `AuthContext.test.tsx` fails on the old code and passes on the fix.
- **Trip itinerary:** days expand to add, edit and delete free-text activities. Save as PDF uses jsPDF client-side with a plain per-day list; empty days print "(no activities planned)".
- **AI chat flow** (`TripChat`, `TripDraftReview`, `hooks/useDraftPersistence.ts`): a chat-first new-trip flow with a review step.
  - Drafts persist in `localStorage`, namespaced per API URL and username and validated on restore.
  - Stale responses are dropped via a request-version counter plus an AbortController.
- **Checks:** 3 Vitest tests. `oxlint` has 0 errors and 2 known warnings. `npm run build` is clean.

## Infrastructure (`infra/`, Terraform)

- **Modules:** `network` (VPC, private subnets, NAT), `alb`, `ecs` (Fargate service + task definition), `database` (RDS Postgres `db.t4g.micro`, private, reachable only from the ECS security group), `ecr`, `iam-oidc` (GitHub Actions deploy role), `cdn` (CloudFront, currently disabled).
- **Secrets:** stored in Secrets Manager, including the AI key (a placeholder when `ai_enabled=false`).
- **Phase 6 manual verification (by user):** 43 resources created.
  - RDS is available, not publicly accessible, and direct access from a PC is blocked.
  - The ECR image is present.
  - ECS is active: 1 desired, 1 running, 0 pending, rollout COMPLETED.
  - ALB → ECS → `/health` returns 200.
- **CloudFront blocked:** `CreateDistribution` returns 403 "Your account must be verified before you can add new CloudFront resources" (request ID `e6f897ad-a7d2-402a-bfb2-5504772c6758`).
  - The `cdn` module is commented out.
  - `api_base_url` points at the ALB over HTTP: `http://musafir-alb-1646923822.us-east-1.elb.amazonaws.com/api/v1`.
- **CORS:** `allowed_origins` = `https://musafir-travels.vercel.app,http://localhost:5173`.
- **RDS backups:** raised from 0 to 1 day. 7 days was rejected with `FreeTierRestrictionError`; the account's free plan caps it at 1.
  - Applying the change restarted RDS (`apply_immediately = true`). The first request on each stale pooled connection then returned 500 (`AdminShutdown`).
  - Fixed with SQLAlchemy `pool_pre_ping=True`. A local simulation (killing a pooled connection on the server) fails without the flag and succeeds with it.

## CI/CD (`.github/workflows/`)

- **`ci.yml`:** on every push and PR. Backend: pytest against a Postgres 16 service container, plus an Alembic `upgrade head` → `downgrade base` round-trip. Frontend: lint, test, build. Also callable by `deploy.yml`.
- **`deploy.yml`:** on push to `trip_planner.AI` or manual dispatch. Runs CI → builds and pushes the image to ECR (SHA tag) → registers a new task definition revision → runs `alembic upgrade head` as a one-off ECS task → updates the ECS service → checks `/health`. Authenticates to AWS via OIDC. Uses 9 repository Variables (see `infra/README.md`); no secrets.
- **Bug found and fixed:** the first real run failed because `aws ecs run-task` can't override a container's `image`. Registering the revision moved into the migrate job; the migration runs on it and the deploy job rolls out the same revision.
- **Earlier fixes:** `ALLOWED_ORIGINS` renamed to `CORS_ORIGINS`, which is what the backend reads. `entrypoint.sh` no longer runs migrations on every container start.
- **Runs green:** `35997566002`, `36001016339`, `36005307935`.

## Live verification (2026-09-24, against the ALB)

- **Health and CORS:** `/health` 200. CORS allows localhost and Vercel and rejects other origins.
- **Auth:** signup 201; duplicate signup 400; login returns a token; wrong password 401; no token 401.
- **Trips and activities:** creating a trip builds one day per date; end-before-start 400. Add, edit and delete activity; empty activity 400.
- **Delete:** deleting a trip returns 204; a later GET returns 404.
- **AI:** trip-draft returns 503 (AI disabled, as designed).
- **Manual (user):** localhost frontend against AWS works: sign up and log in, stay logged in after refresh, trip CRUD, Save as PDF.
- **Reports:** `infra/VERIFICATION-REPORT-phase7-deploy.html`, `frontend/VERIFICATION-REPORT-auth-refresh-pdf.html`.

## What's left

- **Blocked on AWS:**
  - Account verification for CloudFront/HTTPS.
  - Account plan upgrade for more than 1 day of RDS backups.
- **Phase 8:**
  - Set the Anthropic budget cap and data-retention policy, then enable AI (`ai_enabled=true` + key).
  - Full live test: AI chat scenarios, draft restore after refresh, account isolation.
  - Point Vercel's `VITE_API_BASE_URL` at CloudFront, swap the production domain, then shut down Render after a quiet period.
  - Confirm the v1 SQLite data was discarded.
- **Cleanup:**
  - Remove test user `phase7check_1790252346` from production.
  - Delete or ignore `infra/environments/prod/plan.txt`.
  - Address the CI deprecation warnings (Node 20 actions, Ubuntu 26 runner migration) and the 2 lint warnings.

---

# v1 log (historical, `master` branch)

Everything below describes the original app, which v2 replaces.

## Specs (`specs/`, now `specs_old/`)

- `goal-spec.md` — the original goal/constraints/acceptance criteria (given, not authored here).
- `frontend-spec.md` — screens (Trip List, Itinerary Editor, Share View), user flow, loading/empty/error states, maps/weather widget failure handling.
- `backend-spec.md` — data model (Trip → Day → Activity, ShareLink), business rules (end_time ≥ start_time, Day.date uniqueness, cascades), non-functional requirements (read-only share links, server-side-only API key).
- `api-contract.md` — every endpoint, request/response shapes, status codes, including the day-conditions endpoint's "never 5xx on upstream failure" contract.

All four are committed.

## Repo scaffold

- `backend/` — FastAPI, Python venv (`.venv`), `requirements.txt`.
- `frontend/` — React + Vite.
- Root `CLAUDE.md` — stack overview, directory layout, spec links.
- `.gitignore` — excludes `.venv/`, `node_modules/`, `*.db`, `.env`.

## Backend — implemented

**Foundation**
- `app/config.py` — `pydantic-settings` config (`DATABASE_URL`, `OPENWEATHER_API_KEY`, `CONDITIONS_TIMEOUT_SECONDS`, `CORS_ORIGINS`), loadable from `.env` (`.env.example` documents it).
- `app/database.py` — SQLAlchemy engine/session (SQLite), `get_db` dependency.
- `app/models.py` — `Trip`, `Day`, `Activity`, `ShareLink`. UUID string PKs, `(trip_id, date)` unique constraint on `Day`, cascade-delete relationships.
- `alembic/` — configured against the models; initial migration (`89aabb89ed3c_initial_schema.py`) verified to upgrade/downgrade cleanly and match `Base.metadata` exactly.
- `app/errors.py` — shared error envelope (`{"error": {code, message, fields}}`) for `NotFoundError` (404), `ConflictError` (409), `DomainValidationError` / request validation (422), and unhandled exceptions (500).

**Trip / Day / Activity CRUD** (`app/routers/{trips,days,activities}.py`, `app/schemas/`)
- Full CRUD per `api-contract.md`: `GET/POST /trips`, `GET/DELETE /trips/{id}`, `POST/PATCH/DELETE` for days and activities.
- `end_time >= start_time` validation (`app/services/validation.py`) enforced on create and on the *merged* result for PATCH, on both Day and Activity.
- `Day.date` uniqueness enforced via DB constraint, translated to 409.
- `start_date`/`end_date`/`day_count` on Trip are derived, not stored.
- `backend/main.py` is now a one-line shim (`from app.main import app`) so `uvicorn main:app` still works.

**Day-conditions (maps/weather) proxy** (`app/services/weather.py`, `app/services/location.py`, `app/routers/conditions.py`)
- `GET /trips/{trip_id}/days/{day_id}/conditions` — the only caller of `app/services/weather.py` (verified via grep; no other module imports it).
- `weather.py` calls OpenWeatherMap for current conditions and builds a static-map URL (OSM-based, no separate Maps key). Any timeout, non-2xx response, or malformed body is caught and collapsed to `{"status": "unavailable"}` — it never raises for upstream problems. The API key is attached server-side only and redacted (`appid=***`) from anything logged.
- `location.py` resolves a Day's location as: `Day.location` if set, else the first Activity's location for that day, else `None` → `unavailable` with no upstream call made. Deliberately does not fall through to a later activity if the first has none.
- 404 is reserved for a bad `trip_id`/`day_id`; every other outcome (including upstream failure) is `200`, matching the goal-spec's "never crashes on upstream failure" requirement.
- `OPENWEATHER_API_KEY` is set in `backend/.env` (gitignored, not committed) and live-verified against the real OpenWeatherMap API — a real city returns real weather/map data, an unknown city correctly degrades to `200 {"status":"unavailable"}` instead of a 5xx.

**Share links** (`app/routers/share.py`, `app/routers/public_share.py`, `app/schemas/share.py`)
- Owner-side `POST /trips/{id}/share` (idempotent get-or-create, `secrets.token_urlsafe(32)`) and `DELETE /trips/{id}/share` (idempotent revoke; 204 even if nothing was active).
- Public `GET /share/{token}` (read-only trip view) and `GET /share/{token}/days/{id}/conditions` (public weather/map, sharing the same `resolve_conditions_for_day` helper as the owner-side conditions endpoint via a small refactor).
- **Real bug found and fixed while building this:** `ShareLink.trip_id` had a DB-level `unique=True`, which only allows one `ShareLink` row per trip *ever* — including revoked ones — so revoke-then-regenerate crashed with an `IntegrityError`. The actual rule ("at most one *active* link per trip") only needed application-level enforcement (already correct in `share.py`, filtering on `revoked_at IS NULL`), so the DB constraint was simply wrong. Fixed by removing it and hand-writing an Alembic migration (SQLite can't `ALTER TABLE ... DROP CONSTRAINT`, and the constraint was unnamed so autogenerate couldn't target it for removal); `Trip.share_link` also became `Trip.share_links` (a list) to match. Verified: fresh upgrade, downgrade→upgrade round-trip, and `alembic check` all clean.
- `backend-spec.md`'s `ShareLink.trip_id` "unique" claim has since been corrected (see Day-location entry below, done in the same pass).

**Day location** (`app/models.py`, `app/schemas/day.py`, `app/routers/days.py`, `app/services/location.py`)
- `Day` gained its own optional `location` field — the primary source for a day's maps/weather lookup, addressing a real limitation surfaced by the user: with only Activity-based location, the widget only ever reflected the *first* activity added to a day, with no way to set a location for a day with no (or differently-located) activities.
- Resolution order updated to `Day.location` → first Activity's `location` → `None`, so existing Activity-based data still works as a fallback.
- `backend-spec.md` and `api-contract.md` both updated: Day's data model gained the `location` field, a new business rule (8) documents the resolution order, and the `ShareLink.trip_id` table was corrected to no longer claim DB-level uniqueness (an existing inaccuracy fixed while already editing that section).
- New Alembic migration (`add location field to days`) — plain `ADD COLUMN`, verified upgrade/downgrade/`alembic check` clean.
- Live-verified: a day with only `Day.location` set and zero activities returns real weather; a day with `Day.location="London"` and an activity located in `"Berlin"` correctly returns London's weather, confirming Day.location takes priority.

**Tests:** `backend/tests/` (pytest, in-memory SQLite) — 63 passing, 0 skipped: CRUD happy paths, validation boundaries, 404/409/422 cases, cascade deletes, conditions-endpoint tests, the share-link suite, and the day-location resolver tests below.
- `test_validation.py` — a true unit test (no HTTP/DB) for the "Day cannot be saved with an end time before its start time" acceptance criterion, calling `validate_time_range()` directly.
- `test_share.py` — the "share links are read-only and require no login" acceptance-criterion test plus the fuller share-link CRUD suite above; no longer skipped now that the endpoints exist. One assumption in the original version was wrong and got fixed along the way: `DELETE /share/{token}` returns `405` (the path matches, only the method doesn't), not `404`.
- `test_location.py` — unit tests (plain model instances, no HTTP/DB) for the resolver's priority order: Day.location used when set, takes priority over Activity.location, empty-string Day.location treated as unset (falls back), falls back to first Activity when Day.location is unset, `None` when neither is set. Plus one integration test in `test_conditions.py` confirming the live endpoint actually queries Day's location over the activity's.
- **Test-coverage sanity check:** temporarily commented out the `validate_time_range(...)` call in `create_day` (`app/routers/days.py`), reran the suite, and confirmed exactly one test failed — `test_create_day_end_before_start_422` (got `201`, expected `422`) — with everything else, including the update-Day validation test and the isolated unit test, still passing. Restored the line and confirmed the suite went back to green. No implementation change persisted; this was a one-off verification that the test genuinely catches the regression it's meant to catch.

## Frontend — implemented

**Foundation**
- `react-router-dom` added; routes: `/` → Trip List, `/trips/:tripId` → Itinerary Editor.
- `src/api/` — fetch wrapper (`client.js`, typed `ApiError`) + resource modules (`trips.js`, `days.js`, `activities.js`).

**Trip List** (`pages/TripList.jsx`) — loading, empty (+ New Trip form), error + Retry, populated list (name/date range/day count), delete with confirm and per-row in-flight/error handling.

**Itinerary Editor** (`pages/ItineraryEditor.jsx`, `components/{DayCard,DayForm,ActivityForm}.jsx`) — loading, not-found, error + Retry, empty-trip (inline Add Day form), per-day empty-activities state, full Day/Activity add/edit/delete with inline validation mirroring backend 422s. `DayForm` gained a Location field (displayed in `DayCard`'s header) so a day's weather/map source can be set directly, independent of any activity — see the backend Day-location entry above.

**Weather/map widget** (`components/ConditionsWidget.jsx`) — per-day, isolated (own component instance + state per day, so one day's failure/loading never affects siblings): loading → success (icon/summary/temp + an embedded map) or unavailable+Retry. Mounted inside `DayCard`.
- **Real bug found and fixed while verifying:** the backend's `static_map_url` pointed at `staticmap.openstreetmap.de`, which no longer resolves (NXDOMAIN) — likely decommissioned since the day-conditions proxy was first built. Switched `weather.py` to OpenStreetMap's official embeddable map (`openstreetmap.org/export/embed.html`, no API key needed) and the frontend to render it as an `<iframe>` instead of an `<img>`. Verified with a real interactive map now rendering.

**Share links** (`components/ShareLinkControl.jsx`, `pages/ShareView.jsx`) — "Generate Share Link" button in the Itinerary Editor header (idempotent, shows a copyable full URL with Copy/Copied! feedback). `/share/:token` route renders the trip read-only: loading, invalid/revoked-token message, empty-days state, and the populated view. `DayCard` (and its nested activity rows) gained a `readOnly` prop reused for this instead of a separate component, and `ConditionsWidget` gained a `shareToken` prop as an alternative to `tripId` so the public conditions endpoint gets used on this screen.

**Not yet implemented:** none of the three `frontend-spec.md` screens are missing pieces anymore; remaining gaps are test coverage (see below) and CD (see Deployment).

**Verified:** lint (`oxlint`) and `vite build` clean throughout; each screen/feature driven in a real browser (Playwright against system Edge) as it was built — Trip List + Itinerary Editor CRUD flow, the weather widget's isolated success/unavailable states side by side, and the full share-link flow (generate → copy → open as a separate "recipient" page → scripted check confirming zero mutation controls anywhere on that page → invalid-token message) — all passing, screenshots reviewed for visual correctness each time.

**Test infrastructure:** `vitest` + `@testing-library/react` + `jsdom` added; `src/test/setup.js` loads `@testing-library/jest-dom`; `npm test` runs the suite. One test so far (`pages/TripList.test.jsx`, mocks `fetch`, asserts the "Trips" heading renders) — added specifically to give CI something real to run, not full screen coverage yet.

## CI

- `.github/workflows/ci.yml` — two jobs, `backend` and `frontend`, both triggered on every push and pull request.
  - `backend`: `actions/setup-python` (3.12) → `pip install -r requirements.txt` → `pytest`.
  - `frontend`: `actions/setup-node` (24, matching `jsdom@30`'s `engines` requirement of `^22.22.2 || ^24.15.0 || >=26.0.0`) → `npm ci` → `npm test`.
- Not sourced from the course reader's §6.3 example (not available in this repo) — written as a conventional two-job workflow instead; worth diffing against the actual §6.3 text if available.
- Confirmed green on GitHub's Actions tab.

## Pushed to GitHub

- Remote: `https://github.com/Nima168/Trip-Planner` (`origin`), branch `master`.
- All outstanding work was split into logically-grouped commits before pushing (backend foundation+CRUD, day-conditions/weather proxy, frontend routing+screens, acceptance-criteria tests, CI+frontend test setup, progress log, CI Node-version fix, backend Dockerfile).
- **Not yet pushed:** the weather-widget frontend, the map-provider fix, the entire share-link feature (backend + frontend), and the Day-location feature (backend + frontend) — all verified locally only so far. Neither Vercel nor Render have this yet.

## Deployment

**Live URLs**
- Frontend: https://trip-planner-two-beta.vercel.app/
- Backend: https://trip-planner-4tgv.onrender.com

**Frontend (Vercel)** — connected via Vercel's GitHub integration (auto-deploys on push to `master`, Root Directory set to `frontend`, Vite preset). `VITE_API_BASE_URL` is set to the Render backend URL above (build-time env var — required a redeploy to take effect, since Vite bakes it into the bundle).

**Backend (Render)** — deployed from `backend/Dockerfile` (Root Directory `backend`, Dockerfile Path `backend/Dockerfile`, Docker Build Context `backend`). `python:3.12-slim`, non-root user, `entrypoint.sh` runs `alembic upgrade head` then `exec`s into `uvicorn app.main:app --workers ${WEB_CONCURRENCY:-4}` (honors Render's injected `$PORT`). `.dockerignore` excludes `.env`/`.venv`/`*.db`/`tests/` — this is what actually keeps the API key out of the image, since without it `COPY . .` would copy a local `.env` straight in. `OPENWEATHER_API_KEY` and `CORS_ORIGINS` (set to the Vercel origin) are configured as Render environment variables, never committed.
- Local Docker live-verified before deploying: built the image, ran it with the real key via `docker run -e OPENWEATHER_API_KEY=...`, did a full create-trip → create-day → create-activity → real-weather round trip successfully. Confirmed the key appears nowhere in `docker history` or the image filesystem, the app boots fine with no key set (conditions endpoint just degrades to `unavailable`), and 4 uvicorn worker processes actually start.
- Render deploy live-verified the same way: `/health`, full CRUD, and the real weather proxy all confirmed working against the deployed instance; test data cleaned up afterward.
- **Full end-to-end confirmed**: drove the actual deployed frontend in a headless browser, created a trip and added a day through the real UI, and confirmed the data round-tripped through the deployed backend and back — no CORS or console errors. Test trip cleaned up from production afterward. This is Step 15's own "confirm the deployed frontend can actually reach the deployed backend" check.
- Known caveat, not fixed: SQLite + multiple uvicorn workers means concurrent writes across workers serialize on the same file (occasional "database is locked" under real concurrent load) — acceptable at this project's scope, worth knowing if that changes. The SQLite file also lives in the container's filesystem and won't persist across redeploys without a mounted volume. Render's free tier also spins the service down after inactivity (~30–50s cold start on the next request).

## Key decisions made along the way

- **Database:** SQLite + SQLAlchemy + Alembic (confirmed with user).
- **Maps/weather provider:** OpenWeatherMap + a static map tile URL, no separate Maps key (confirmed with user).
- **"Save" semantics:** per-resource CRUD (each Day/Activity form saves via its own endpoint), not a bulk trip-level save — flagged as an interpretation of `frontend-spec.md`, not re-litigated since.
- **Day-location gap:** `api-contract.md` originally flagged that `Day` had no `location` field, resolved at first by falling back to the first Activity's location only. Later revisited (prompted by the user hitting the limitation directly) and superseded by giving `Day` its own `location` field, with the Activity-based fallback kept for backward compatibility — see the backend Day-location entry above.

## What's left (from the build plan)

- Push and deploy the weather-widget + share-link work (currently local-only) to GitHub/Render/Vercel.
- Backend: cascade/business-rule hardening tests beyond what exists today.
- Frontend: broader test coverage beyond the one CI-smoke test.
- CD: gate an automatic Render/Vercel redeploy on the CI job passing (Step 13), rather than deploying independently of CI status as it does now.
- Final end-to-end manual pass against production once the above is deployed.

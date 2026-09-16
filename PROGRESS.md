# Trip Planner — Progress Log

Tracks what's been built so far against the approved build plan (see plan history / `CLAUDE.md`). Updated as work lands.

## Specs (`specs/`)

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
- `location.py` resolves a Day's location from its first Activity (`Day` has no location field of its own, per `api-contract.md`'s documented fallback); deliberately does not fall through to a later activity if the first has none. No activities → `unavailable` with no upstream call made.
- 404 is reserved for a bad `trip_id`/`day_id`; every other outcome (including upstream failure) is `200`, matching the goal-spec's "never crashes on upstream failure" requirement.
- `OPENWEATHER_API_KEY` is set in `backend/.env` (gitignored, not committed) and live-verified against the real OpenWeatherMap API — a real city returns real weather/map data, an unknown city correctly degrades to `200 {"status":"unavailable"}` instead of a 5xx.

**Not yet implemented:** share-link endpoints, public share view.

**Tests:** `backend/tests/` (pytest, in-memory SQLite) — 47 passing, 1 skipped: CRUD happy paths, validation boundaries, 404/409/422 cases, cascade deletes, and 9 conditions-endpoint tests (success, timeout, non-2xx, malformed body, no-location, first-activity-missing-location, missing API key, both 404 cases).
- `test_validation.py` — a true unit test (no HTTP/DB) for the "Day cannot be saved with an end time before its start time" acceptance criterion, calling `validate_time_range()` directly.
- `test_share.py` — an integration test for "Share links are read-only and require no login," written against `api-contract.md`'s documented shape (no-auth link resolution, every write attempt under `/share/{token}` 404s, revoked token 404s). Marked `@pytest.mark.skip` since share-link endpoints don't exist yet — remove the skip once that work lands.
- **Test-coverage sanity check:** temporarily commented out the `validate_time_range(...)` call in `create_day` (`app/routers/days.py`), reran the suite, and confirmed exactly one test failed — `test_create_day_end_before_start_422` (got `201`, expected `422`) — with everything else, including the update-Day validation test and the isolated unit test, still passing. Restored the line and confirmed the suite went back to green (47 passed, 1 skipped). No implementation change persisted; this was a one-off verification that the test genuinely catches the regression it's meant to catch.

## Frontend — implemented

**Foundation**
- `react-router-dom` added; routes: `/` → Trip List, `/trips/:tripId` → Itinerary Editor.
- `src/api/` — fetch wrapper (`client.js`, typed `ApiError`) + resource modules (`trips.js`, `days.js`, `activities.js`).

**Trip List** (`pages/TripList.jsx`) — loading, empty (+ New Trip form), error + Retry, populated list (name/date range/day count), delete with confirm and per-row in-flight/error handling.

**Itinerary Editor** (`pages/ItineraryEditor.jsx`, `components/{DayCard,DayForm,ActivityForm}.jsx`) — loading, not-found, error + Retry, empty-trip (inline Add Day form), per-day empty-activities state, full Day/Activity add/edit/delete with inline validation mirroring backend 422s.

**Not yet implemented:** weather/map widget, share-link generation UI, Share View screen.

**Verified:** lint (`oxlint`) and `vite build` clean; full flow driven in a real browser (Playwright against system Edge) — create trip → add day → add activity → validation-blocked bad day → delete activity → delete trip — all passing, screenshots reviewed for visual correctness.

**Test infrastructure:** `vitest` + `@testing-library/react` + `jsdom` added; `src/test/setup.js` loads `@testing-library/jest-dom`; `npm test` runs the suite. One test so far (`pages/TripList.test.jsx`, mocks `fetch`, asserts the "Trips" heading renders) — added specifically to give CI something real to run, not full screen coverage yet.

## CI

- `.github/workflows/ci.yml` — two jobs, `backend` and `frontend`, both triggered on every push and pull request.
  - `backend`: `actions/setup-python` (3.12) → `pip install -r requirements.txt` → `pytest`.
  - `frontend`: `actions/setup-node` (24, matching `jsdom@30`'s `engines` requirement of `^22.22.2 || ^24.15.0 || >=26.0.0`) → `npm ci` → `npm test`.
- Not sourced from the course reader's §6.3 example (not available in this repo) — written as a conventional two-job workflow instead; worth diffing against the actual §6.3 text if available.
- Confirmed green on GitHub's Actions tab.

## Pushed to GitHub

- Remote: `https://github.com/Nima168/Trip-Planner` (`origin`), branch `master`.
- All outstanding work was split into logically-grouped commits before pushing (backend foundation+CRUD, day-conditions/weather proxy, frontend routing+screens, acceptance-criteria tests, CI+frontend test setup, progress log, CI Node-version fix).

## Deployment

**Frontend (Vercel)** — live at https://trip-planner-two-beta.vercel.app/, connected via Vercel's GitHub integration (auto-deploys on push to `master`, Root Directory set to `frontend`, Vite preset). No `VITE_API_BASE_URL` set yet since there's no deployed backend to point at — confirmed (via a headless-browser check) that it still renders correctly and degrades to the "Couldn't reach the server / Retry" state rather than crashing, per `frontend-spec.md`.

**Backend (Docker)** — `backend/Dockerfile`, `backend/entrypoint.sh`, `backend/.dockerignore` added. `python:3.12-slim`, non-root user, `entrypoint.sh` runs `alembic upgrade head` then `exec`s into `uvicorn app.main:app --workers ${WEB_CONCURRENCY:-4}` (honors `$PORT`). `.dockerignore` excludes `.env`/`.venv`/`*.db`/`tests/` — this is what actually keeps the API key out of the image, since without it `COPY . .` would copy a local `.env` straight in.
- Live-verified: built the image, ran it with the real key via `docker run -e OPENWEATHER_API_KEY=...`, did a full create-trip → create-day → create-activity → real-weather round trip successfully. Confirmed the key appears nowhere in `docker history` or the image filesystem, the app boots fine with no key set (conditions endpoint just degrades to `unavailable`), and 4 uvicorn worker processes actually start.
- Known caveat, not fixed: SQLite + multiple uvicorn workers means concurrent writes across workers serialize on the same file (occasional "database is locked" under real concurrent load) — acceptable at this project's scope, worth knowing if that changes. The SQLite file also lives in the container's filesystem and won't persist across redeploys without a mounted volume.
- Not yet done: actually deploying this image to a cloud provider (Step 14 is Dockerfile-only so far), then setting `VITE_API_BASE_URL` on Vercel to the real deployed backend URL and confirming the deployed frontend can reach it end to end.

## Key decisions made along the way

- **Database:** SQLite + SQLAlchemy + Alembic (confirmed with user).
- **Maps/weather provider:** OpenWeatherMap + a static map tile URL, no separate Maps key (confirmed with user).
- **"Save" semantics:** per-resource CRUD (each Day/Activity form saves via its own endpoint), not a bulk trip-level save — flagged as an interpretation of `frontend-spec.md`, not re-litigated since.
- **Day-location gap:** `api-contract.md` flagged that `Day` has no `location` field but the conditions endpoint needs one — resolved by implementing the documented fallback (first Activity's location) rather than changing the schema; still an open follow-up for `backend-spec.md` itself.

## What's left (from the build plan)

- Backend: share-link (owner + public), cascade/business-rule hardening tests.
- Frontend: weather/map widget, share-link generation, Share View screen, broader test coverage beyond the one CI-smoke test.
- Deployment: actually deploy the backend image to a cloud provider, wire `VITE_API_BASE_URL` on Vercel to it, confirm the deployed frontend reaches the deployed backend.
- Final end-to-end manual pass once all pieces exist.

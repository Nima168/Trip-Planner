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
  - `frontend`: `actions/setup-node` (20) → `npm ci` → `npm test`.
- Both jobs' exact commands verified locally before committing the workflow (backend: 47 passed/1 skipped; frontend: `npm ci` clean install + 1 passing test).
- Not sourced from the course reader's §6.3 example (not available in this repo) — written as a conventional two-job workflow instead; worth diffing against the actual §6.3 text if available.
- Not yet done: actually pushing and confirming the workflow runs green in GitHub's Actions tab (the lab guide's own instruction for this step).

## Key decisions made along the way

- **Database:** SQLite + SQLAlchemy + Alembic (confirmed with user).
- **Maps/weather provider:** OpenWeatherMap + a static map tile URL, no separate Maps key (confirmed with user).
- **"Save" semantics:** per-resource CRUD (each Day/Activity form saves via its own endpoint), not a bulk trip-level save — flagged as an interpretation of `frontend-spec.md`, not re-litigated since.
- **Day-location gap:** `api-contract.md` flagged that `Day` has no `location` field but the conditions endpoint needs one — resolved by implementing the documented fallback (first Activity's location) rather than changing the schema; still an open follow-up for `backend-spec.md` itself.

## What's left (from the build plan)

- Backend: share-link (owner + public), cascade/business-rule hardening tests.
- Frontend: weather/map widget, share-link generation, Share View screen, broader test coverage beyond the one CI-smoke test.
- CI: push and confirm the workflow actually runs green on GitHub.
- Final end-to-end manual pass once all pieces exist.

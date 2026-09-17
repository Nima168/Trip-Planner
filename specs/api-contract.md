# API Contract — Trip Planner

Covers every endpoint `frontend-spec.md` needs against the data model in `backend-spec.md`. No implementation yet.

## Conventions

- **Format:** JSON request/response bodies, `Content-Type: application/json`.
- **IDs:** UUID v4 strings for all resources (trip, day, activity), not sequential integers.
- **Dates/times:** `date` as `YYYY-MM-DD`, `start_time`/`end_time` as `HH:MM` (24h, no seconds), `created_at`/`updated_at` as ISO 8601 UTC timestamps.
- **Auth:** none. No endpoint in this contract requires a session or credential, matching the no-login MVP scope in `backend-spec.md`.
- **Error envelope:** every non-2xx response (except `204`) uses the same shape, regardless of which layer raised it:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "human-readable summary", "fields": { "end_time": "must be on or after start_time" } } }
  ```
  `fields` is present only for `422` field-level errors; omitted otherwise. Codes used below: `VALIDATION_ERROR` (422), `NOT_FOUND` (404), `CONFLICT` (409), `INTERNAL_ERROR` (500, unexpected only).
- **Design decision — "Save" maps to per-resource CRUD, not a bulk trip save.** `frontend-spec.md`'s "Save" action is read here as submitting whichever Day or Activity form is open, calling that resource's own create/update endpoint. This matches `backend-spec.md`'s rules being phrased per-entity ("a Day cannot be saved with...", "an Activity's own start/end..."). Flag if a single bulk `PUT /trips/{id}` with the full nested tree was intended instead — that's a different contract.
- **Day location resolution.** `Day` has its own optional `location` field (`backend-spec.md`), used as the primary source for the day-conditions endpoint. If unset, the backend falls back to the first Activity's `location` for that day (by `position`); if that's also unset, no upstream lookup is attempted and the endpoint returns `{"status": "unavailable"}`.
- **Pagination:** not implemented in this MVP; `GET /trips` returns the full list. Fine at expected scale (single-tenant, no auth); revisit if that changes.

---

## Trips

### `GET /trips`
List all trips.

- **200**
  ```json
  [
    {
      "id": "uuid", "name": "string",
      "start_date": "YYYY-MM-DD" | null, "end_date": "YYYY-MM-DD" | null,
      "day_count": 0,
      "created_at": "ISO8601", "updated_at": "ISO8601"
    }
  ]
  ```
  `start_date`/`end_date` are derived from the min/max `Day.date` for that trip; `null` if it has no days yet. Empty trip list is a `200` with `[]` — the frontend's empty state is a UI concern, not a distinct API response.
- **500** `INTERNAL_ERROR` — unexpected failure only.

### `POST /trips`
Create a trip. Does not create any Day — the Itinerary Editor's "Day 1 auto-created" is a frontend-only default shown before the user saves anything.

- **Request**
  ```json
  { "name": "string" }
  ```
- **201**
  ```json
  { "id": "uuid", "name": "string", "start_date": null, "end_date": null, "days": [], "created_at": "ISO8601", "updated_at": "ISO8601" }
  ```
- **422** `VALIDATION_ERROR` — `name` missing or empty.

### `GET /trips/{trip_id}`
Fetch one trip with its full nested itinerary, for the Itinerary Editor.

- **200**
  ```json
  {
    "id": "uuid", "name": "string",
    "start_date": "YYYY-MM-DD" | null, "end_date": "YYYY-MM-DD" | null,
    "created_at": "ISO8601", "updated_at": "ISO8601",
    "days": [
      {
        "id": "uuid", "trip_id": "uuid", "date": "YYYY-MM-DD",
        "start_time": "HH:MM" | null, "end_time": "HH:MM" | null,
        "location": "string" | null,
        "notes": "string" | null, "position": 0,
        "created_at": "ISO8601", "updated_at": "ISO8601",
        "activities": [
          {
            "id": "uuid", "day_id": "uuid", "title": "string",
            "start_time": "HH:MM", "end_time": "HH:MM",
            "location": "string" | null, "notes": "string" | null,
            "position": 0, "created_at": "ISO8601", "updated_at": "ISO8601"
          }
        ]
      }
    ]
  }
  ```
  Days ordered by `position`; activities ordered by `position` within each day.
- **404** `NOT_FOUND` — no trip with this id. Frontend renders "Trip not found."

### `DELETE /trips/{trip_id}`
Cascades to Days, Activities, and the ShareLink.

- **204** — no body.
- **404** `NOT_FOUND`.

---

## Days

### `POST /trips/{trip_id}/days`
Add a day to a trip.

- **Request**
  ```json
  { "date": "YYYY-MM-DD", "start_time": "HH:MM" | null, "end_time": "HH:MM" | null, "location": "string" | null, "notes": "string" | null }
  ```
  `position` is not client-supplied; the server appends it after the current last day.
- **201** — the created Day object (shape as nested above, `activities: []`).
- **404** `NOT_FOUND` — trip doesn't exist.
- **422** `VALIDATION_ERROR` — `date` missing, or `end_time` before `start_time` when both are set.
- **409** `CONFLICT` — a Day already exists for this trip on that `date`.

### `PATCH /trips/{trip_id}/days/{day_id}`
Partial update. Any subset of `date`, `start_time`, `end_time`, `location`, `notes`.

- **Request:** same fields as create, all optional.
- **200** — the updated Day object.
- **404** `NOT_FOUND` — trip or day doesn't exist.
- **422** `VALIDATION_ERROR` — resulting `end_time` before `start_time`.
- **409** `CONFLICT` — `date` changed to one already used by another Day in this trip.

### `DELETE /trips/{trip_id}/days/{day_id}`
Cascades to that day's Activities.

- **204** — no body.
- **404** `NOT_FOUND`.

---

## Activities

### `POST /trips/{trip_id}/days/{day_id}/activities`

- **Request**
  ```json
  { "title": "string", "start_time": "HH:MM", "end_time": "HH:MM", "location": "string" | null, "notes": "string" | null }
  ```
  `position` server-assigned (appended).
- **201** — the created Activity object.
- **404** `NOT_FOUND` — trip or day doesn't exist.
- **422** `VALIDATION_ERROR` — `title` missing/empty, `start_time`/`end_time` missing, or `end_time` before `start_time`.

### `PATCH /trips/{trip_id}/days/{day_id}/activities/{activity_id}`
Partial update. Any subset of `title`, `start_time`, `end_time`, `location`, `notes`.

- **200** — the updated Activity object.
- **404** `NOT_FOUND` — trip, day, or activity doesn't exist.
- **422** `VALIDATION_ERROR` — same rules as create, evaluated on the merged result.

### `DELETE /trips/{trip_id}/days/{day_id}/activities/{activity_id}`

- **204** — no body.
- **404** `NOT_FOUND`.

---

## Day conditions (maps/weather)

### `GET /trips/{trip_id}/days/{day_id}/conditions`

This is the endpoint the Itinerary Editor's per-day weather/map widget calls. **An upstream maps/weather failure or timeout is an expected, routine condition — not a server error — so it is always reported as `200`.** The API key is attached server-side and never appears in this or any response.

The backend enforces its own timeout against the upstream provider (5s). Behavior:

| Upstream outcome | HTTP status | Body |
|---|---|---|
| Responds successfully within 5s | `200` | `{"status": "ok", "weather": {"summary": "string", "temp_c": number, "icon": "string"}, "map": {"lat": number, "lng": number, "static_map_url": "string" \| null}}` |
| Times out (no response within 5s) | `200` | `{"status": "unavailable"}` |
| Responds with a non-2xx status | `200` | `{"status": "unavailable"}` |
| Responds with a malformed/unparseable body | `200` | `{"status": "unavailable"}` |
| No location resolvable for this day (see Conventions) | `200` | `{"status": "unavailable"}` |

The only non-`200` responses from this endpoint concern *our own* resource identity, not the upstream call:

- **404** `NOT_FOUND` — `trip_id` or `day_id` doesn't exist in our database.
- **500** `INTERNAL_ERROR` — reserved for a genuine backend bug unrelated to the upstream provider (e.g. our own database is unreachable). This is a different failure class from "the weather provider is down," which is always the `200`/`unavailable` case above. In practice this endpoint should return 500 rarely, if ever.

Upstream failures/timeouts are logged server-side (key redacted) for observability; none of that detail is forwarded to the client.

---

## Share link (owner-side)

### `POST /trips/{trip_id}/share`
Idempotent get-or-create: returns the trip's existing active token if one exists, otherwise creates one. Always `200`, since "create if absent, else return" isn't a strict creation each call.

- **200**
  ```json
  { "trip_id": "uuid", "token": "string", "url": "/share/{token}", "created_at": "ISO8601" }
  ```
- **404** `NOT_FOUND` — trip doesn't exist.

### `DELETE /trips/{trip_id}/share`
Revokes the active link, if any. Idempotent — succeeds even if there was nothing to revoke, so the frontend doesn't need to track whether a link currently exists. To regenerate a link, the frontend calls `DELETE` then `POST`.

- **204** — no body.
- **404** `NOT_FOUND` — trip doesn't exist.

---

## Public share view

No auth on this group; a valid token is the only requirement. These mirror the owner-side read/conditions endpoints but are reachable without knowing the trip id.

### `GET /share/{token}`
- **200** — same TripDetail shape as `GET /trips/{trip_id}`, read-only (no fields or affordances differ in the MVP since there's no auth to distinguish owner vs. visitor — the read-only-ness is enforced by this group having no write endpoints at all).
- **404** `NOT_FOUND` — token unknown or revoked. Message: `"This link is invalid or no longer available"`, matching the frontend's error state.

### `GET /share/{token}/days/{day_id}/conditions`
Same contract and status-code table as `GET /trips/{trip_id}/days/{day_id}/conditions` above (always `200` for upstream outcomes, including `{"status": "unavailable"}`).

- **404** `NOT_FOUND` — token unknown/revoked, or `day_id` doesn't belong to the trip that token resolves to.

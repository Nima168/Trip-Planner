# Backend Spec — Trip Planner

## Assumptions

- No login/auth in this MVP, consistent with `frontend-spec.md`: all Trip CRUD endpoints are unauthenticated. Share links restrict what an anonymous visitor can *do* (read-only), not who they are.
- A Trip's displayed date range (used in the Trip List) is derived from the min/max `date` of its Days rather than stored on the Trip, to avoid the two drifting apart.
- One active share link per Trip. Regenerating a link revokes the previous token rather than accumulating multiple valid tokens.
- Full endpoint shapes (routes, request/response bodies) belong in `api-contract.md`, not here — this spec covers the data model, the rules the backend must enforce regardless of transport, and the non-functional requirements.

## 1. Data model

Relational schema: `Trip 1—N Day 1—N Activity`, plus `Trip 1—1 ShareLink` (optional).

**Trip**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| name | string, required, non-empty | |
| created_at | timestamp | |
| updated_at | timestamp | |

**Day**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| trip_id | FK → Trip, required | cascade delete with Trip |
| date | date, required | unique within a Trip |
| start_time | time, nullable | overall start of the day's plan |
| end_time | time, nullable | overall end of the day's plan |
| notes | text, optional | |
| position | int | explicit ordering, independent of `date` sort |
| created_at / updated_at | timestamp | |

**Activity**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| day_id | FK → Day, required | cascade delete with Day |
| title | string, required, non-empty | |
| start_time | time, required | |
| end_time | time, required | |
| location | string, optional | free-text or place reference used for the maps/weather lookup |
| notes | text, optional | |
| position | int | ordering within the day |
| created_at / updated_at | timestamp | |

**ShareLink**
| Field | Type | Notes |
|---|---|---|
| id | PK | |
| trip_id | FK → Trip, required, unique | one active link per trip |
| token | string, unique, indexed | high-entropy (e.g. UUID4/128-bit random), not a sequential id |
| created_at | timestamp | |
| revoked_at | timestamp, nullable | set when the link is regenerated or explicitly revoked |

## 2. Business rules

1. **A Day cannot be saved with an end time before its start time.** If both `start_time` and `end_time` are set on a Day, the backend rejects the save (422, field-level error) unless `end_time >= start_time`.
2. The same integrity rule applies to an Activity's own `start_time`/`end_time`: `end_time >= start_time`, rejected with a field-level 422 otherwise.
3. `Day.date` must be unique within its Trip — no two Days on the same date for one trip.
4. Deleting a Trip cascades to delete its Days, Activities, and ShareLink.
5. Deleting a Day cascades to delete its Activities.
6. Share link generation is idempotent per Trip: if an active (non-revoked) token exists, return it; otherwise create one. Explicitly regenerating a link revokes the old token (it stops resolving) and issues a new one.
7. Not enforced in this MVP (explicitly out of scope, flagging so it isn't assumed silently handled): Activity times are *not* validated against their parent Day's `start_time`/`end_time` window. Revisit if the product needs that constraint.

## 3. Non-functional requirements

**Share links**
- Read-only: resolving a share token only ever exposes read access to that Trip's Days/Activities. The token carries no capability to create, update, or delete anything, regardless of what the equivalent authenticated-owner routes support.
- No login required: resolving a share token requires no session, cookie, or credential — anyone with the URL can view it.
- Tokens are unguessable (high-entropy, not sequential/incrementing ids) so links can't be enumerated.
- A revoked or unknown token resolves to a "not found"-style response, never a partial or malformed trip payload (backs the frontend's "invalid or no longer available" state).

**Maps/weather API key handling**
- The API key lives server-side only (environment variable / secrets store) and is never included in any response body, header, or query string returned to the client — including error responses.
- The frontend never calls the maps/weather provider directly; all such calls go through a backend-proxied endpoint that attaches the key server-side.
- The backend enforces its own timeout against the external provider (e.g. a few seconds). On timeout or a non-2xx response from the provider, the backend returns a normalized "unavailable" response rather than forwarding the provider's raw error body — so provider error details (which could include the key or account info) never reach the client.
- Provider failures are logged server-side for observability, with the key redacted from any logged request/response.

**Other**
- No authentication/authorization system in this MVP — all Trip CRUD is unauthenticated by design, matching `frontend-spec.md`. This is a deliberate MVP scope cut, not an oversight, and should be revisited before any multi-user or public deployment.
- All traffic is expected to run over HTTPS in production; this is a deployment/transport concern, not application code, and isn't addressed further here.

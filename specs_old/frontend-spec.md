# Frontend Spec — Trip Planner

## Assumptions

- No login/auth in this spec. Trip List shows all trips in the system (single-tenant MVP).
- "Itinerary View" (from the goal spec's maps/weather requirement) refers to the Itinerary Editor screen; the same maps/weather failure-isolation behavior also applies to the Share View, since both screens render day/map/weather content.
- The frontend never calls the maps/weather API directly (per the goal spec's constraint that the API key must never appear client-side). It calls a backend-proxied endpoint per day; "timeout or error" here means that backend call timing out or erroring — not the third-party API directly.
- A "day's plan" is an ordered list of activities (time, title, location, notes) under a date.

## 1. Screens

**1.1 Trip List** — landing screen. Shows all trips as cards/rows (name, date range, # of days). Actions: New Trip, open a trip (→ Itinerary Editor), delete a trip (with confirm).

**1.2 Itinerary Editor** — CRUD workspace for one trip. Day-by-day view (tabs or vertical list of dates); each day has a list of activities (add/edit/delete), and a weather/map widget scoped to that day's location. Actions: Save, Add Day, Delete Day, Generate/Copy Share Link, Back to Trip List.

**1.3 Share View** — read-only rendering of a trip at a public share URL (`/share/:token`). No edit controls, no auth. Same day-by-day layout as the editor, including weather/map widgets, minus all mutation actions.

## 2. User flow

```
Trip List
  ├─ New Trip ──────────────► Itinerary Editor (empty, Day 1 auto-created)
  ├─ Open existing trip ────► Itinerary Editor (populated)
  └─ Delete trip (confirm) ─► Trip List (item removed)

Itinerary Editor
  ├─ Add/edit/delete day or activity ─► Save ─► persisted, editor stays open
  ├─ Generate Share Link ─► link shown + copy-to-clipboard
  └─ Back ─► Trip List

Share Link (external)
  └─ Recipient opens URL ─► Share View (read-only)
```

## 3. States & acceptance criteria

### Trip List

- Loading: Given the trip list request is in flight, the UI shows a skeleton/spinner in place of the list.
- Empty: Given the user has zero trips, the UI shows an empty-state message ("No trips yet") and a prominent "New Trip" call to action.
- Error: Given the trip list request fails or times out, the UI shows an inline error message with a Retry button, and does not show a blank or broken list.
- Populated: Given trips exist, the UI shows each trip's name, date range, and day count, each clickable to open its Itinerary Editor.
- Delete in-flight: Given a delete request is in flight, the UI disables that trip's delete control and shows a spinner on it.
- Delete error: Given a delete request fails, the UI keeps the trip in the list and shows an inline error, without silently reverting an already-removed row.

### Itinerary Editor

- Loading: Given a trip is being fetched by id, the UI shows a loading state for the whole editor (not a blank page).
- Not found / bad id: Given the trip id does not exist, the UI shows a "Trip not found" message with a link back to Trip List, not a crash or blank page.
- Empty trip: Given a newly created trip has no days yet, the UI shows one default day and an "Add Day" control, not an empty void.
- Empty day: Given a day has no activities, the UI shows an empty-state row ("No activities yet — add one") inside that day, not a blank block.
- Populated: Given a trip has days and activities, the UI lists each day with its activities in time order.
- Add/edit activity validation: Given a user submits an activity without a required field (e.g. title), the UI shows an inline validation error and does not submit.
- Save in-flight: Given a save is in progress, the UI disables the Save button and shows a saving indicator.
- Save error: Given a save request fails, the UI shows an inline error, keeps the user's unsaved edits in the form, and allows retry.
- Delete day/activity confirm: Given a user clicks delete on a day or activity, the UI asks for confirmation before removing it.
- Share link generation loading: Given the user clicks "Generate Share Link" and the request is in flight, the UI shows a spinner on that control.
- Share link success: Given a share link is generated, the UI shows the full URL with a Copy button and a copied-confirmation on click.
- Share link error: Given share link generation fails, the UI shows an inline error and does not show a broken/empty link field.

### Itinerary Editor — weather/map widget (per day, isolated)

- Loading: Given weather/map data for a day is being fetched, the UI shows a loading placeholder inside that day's widget only.
- Timeout: Given the backend weather/map proxy does not respond within the timeout window, the UI shows a "Weather/map unavailable" state inside that widget, with a Retry action, while the rest of the day (activities, other days) remains fully usable.
- Error (4xx/5xx from proxy): Given the backend proxy returns an error, the UI shows the same "unavailable" state, distinguishing it from timeout only if the backend supplies a specific reason; otherwise a generic unavailable message is acceptable.
- Partial failure across days: Given one day's weather/map call fails and another day's succeeds, the UI shows each day's widget independently — one failure never blanks or crashes other days or the page.
- Success: Given the proxy call succeeds, the UI shows the map and current/forecast weather for that day's location.

### Share View

- Loading: Given a share link is being resolved, the UI shows a loading state for the page.
- Invalid/expired/revoked link: Given the token does not resolve to a trip, the UI shows a "This link is invalid or no longer available" message, not a crash or a blank itinerary.
- Empty trip (edge case): Given the shared trip has zero days (unlikely but possible), the UI shows an empty-state message rather than an empty page.
- Populated: Given a valid token, the UI shows the trip read-only: all days and activities, no edit/delete/save controls visible anywhere.
- Weather/map widget: same loading/timeout/error/success behavior and per-day isolation as the Itinerary Editor, described above.

## 4. Cross-cutting notes

- No screen may render a blank page or throw on a failed network call — every fetch has a defined loading, error, and (where applicable) empty state above.
- Weather/map failures are always scoped to the widget that failed; they never block editing/viewing the rest of the trip.

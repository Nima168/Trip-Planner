Goal:
Let a user plan a multi-day trip and produce a shareable itinerary.

Constraints:
React frontend, FastAPI backend, relational database.
External maps/weather API key must never appear in client-side code.

Acceptance Criteria:
Users can create, read, update, and delete a day's plan.
Users can save and share an itinerary by link.
If the maps/weather API fails or times out, the itinerary still renders
with a clear "unavailable" state instead of crashing.
# Trip Planner

## Stack

- **Frontend:** React (Vite)
- **Backend:** FastAPI (Python)
- **Database:** a relational database (TBD — not yet provisioned)

## Directory layout

```
trip-planner/
├── backend/          # FastAPI app
│   ├── .venv/        # Python virtual environment (gitignored)
│   ├── main.py        # App entrypoint, GET /health
│   └── requirements.txt
├── frontend/         # React app (Vite)
│   └── src/
├── specs/
│   ├── frontend-spec.md   # Frontend spec (TBD)
│   ├── backend-spec.md    # Backend spec (TBD)
│   └── api-contract.md    # API contract between frontend and backend (TBD)
└── CLAUDE.md
```

## Specs

- [Frontend spec](specs/frontend-spec.md) — TBD
- [Backend spec](specs/backend-spec.md) — TBD
- [API contract](specs/api-contract.md) — TBD

## Running locally

### Backend

```
cd backend
.venv\Scripts\activate
uvicorn main:app --reload
```

Serves `GET /health` → `{"status": "ok"}` at http://localhost:8000/health.

### Frontend

```
cd frontend
npm install
npm run dev
```

Serves the placeholder page at http://localhost:5173/.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_exception_handlers
from app.routers import activities, ai, auth, trips

app = FastAPI(title="Musafir Travels API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Not CORS-safelisted, so the browser hides it from the frontend unless exposed;
    # the chat reads it to show how long to wait after a 429.
    expose_headers=["Retry-After"],
)

register_exception_handlers(app)

api_v1 = "/api/v1"
app.include_router(auth.router, prefix=api_v1)
app.include_router(trips.router, prefix=api_v1)
app.include_router(activities.router, prefix=api_v1)
app.include_router(ai.router, prefix=api_v1)


@app.get("/health")
def health():
    return {"status": "ok"}

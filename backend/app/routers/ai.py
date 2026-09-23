import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import settings
from app.models import User
from app.schemas.ai import TripDraftRequest, TripDraftResponse
from app.services.ai_service import (
    AIProviderInvalidOutput,
    AIProviderTimeout,
    AIProviderUnavailable,
    ProviderAdapter,
    get_default_adapter,
    get_trip_draft,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

# In-memory, per-process rate limiter (MVP limitation, documented in backend-spec.md
# §11 — not a shared/global limit across replicas, and resets on restart).
_RATE_LIMIT = 10
_RATE_WINDOW_SECONDS = 60.0
_request_log: dict[str, deque[float]] = defaultdict(deque)


def _check_rate_limit(user_id: str) -> None:
    now = time.monotonic()
    window = _request_log[user_id]
    while window and now - window[0] > _RATE_WINDOW_SECONDS:
        window.popleft()
    if len(window) >= _RATE_LIMIT:
        retry_after = int(_RATE_WINDOW_SECONDS - (now - window[0])) + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="AI request limit reached",
            headers={"Retry-After": str(retry_after)},
        )
    window.append(now)


@router.post("/trip-draft", response_model=TripDraftResponse)
async def trip_draft(
    payload: TripDraftRequest,
    current_user: User = Depends(get_current_user),
    adapter: ProviderAdapter = Depends(get_default_adapter),
):
    if not settings.ai_enabled or not settings.ai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI is currently unavailable"
        )

    _check_rate_limit(current_user.id)

    try:
        return await get_trip_draft(payload, adapter)
    except AIProviderTimeout as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="AI provider timed out"
        ) from exc
    except AIProviderUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI provider unavailable"
        ) from exc
    except AIProviderInvalidOutput as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="AI provider returned invalid output"
        ) from exc

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFoundError
from app.models import Day, ShareLink, Trip
from app.routers.conditions import resolve_conditions_for_day
from app.routers.trips import to_trip_detail
from app.schemas.trip import TripDetail

router = APIRouter(prefix="/share/{token}", tags=["public-share"])

_INVALID_LINK_MESSAGE = "This link is invalid or no longer available"


def _resolve_token_or_404(db: Session, token: str) -> ShareLink:
    link = (
        db.query(ShareLink)
        .filter(ShareLink.token == token, ShareLink.revoked_at.is_(None))
        .first()
    )
    if link is None:
        raise NotFoundError(_INVALID_LINK_MESSAGE)
    return link


@router.get("", response_model=TripDetail)
def get_shared_trip(token: str, db: Session = Depends(get_db)):
    link = _resolve_token_or_404(db, token)
    trip = db.get(Trip, link.trip_id)
    return to_trip_detail(trip)


@router.get("/days/{day_id}/conditions")
def get_shared_day_conditions(token: str, day_id: str, db: Session = Depends(get_db)):
    link = _resolve_token_or_404(db, token)
    day = db.get(Day, day_id)
    if day is None or day.trip_id != link.trip_id:
        raise NotFoundError("Day not found")
    return resolve_conditions_for_day(day)

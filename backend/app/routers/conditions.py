from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.routers.days import get_day_or_404
from app.routers.trips import get_trip_or_404
from app.services.location import resolve_day_location
from app.services.weather import get_conditions

router = APIRouter(prefix="/trips/{trip_id}/days/{day_id}/conditions", tags=["conditions"])


def resolve_conditions_for_day(day) -> dict:
    """Shared by the owner-side and public (share-token) conditions endpoints."""
    location = resolve_day_location(day)
    if location is None:
        return {"status": "unavailable"}
    return get_conditions(location)


@router.get("")
def get_day_conditions(trip_id: str, day_id: str, db: Session = Depends(get_db)):
    get_trip_or_404(db, trip_id)
    day = get_day_or_404(db, trip_id, day_id)
    return resolve_conditions_for_day(day)

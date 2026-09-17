from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFoundError
from app.models import Trip
from app.schemas.day import DayOut
from app.schemas.trip import TripCreate, TripDetail, TripSummary

router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_or_404(db: Session, trip_id: str) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None:
        raise NotFoundError("Trip not found")
    return trip


def _date_range(trip: Trip) -> tuple[object | None, object | None]:
    dates = [d.date for d in trip.days]
    return (min(dates), max(dates)) if dates else (None, None)


def _to_summary(trip: Trip) -> TripSummary:
    start_date, end_date = _date_range(trip)
    return TripSummary(
        id=trip.id,
        name=trip.name,
        start_date=start_date,
        end_date=end_date,
        day_count=len(trip.days),
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )


def to_trip_detail(trip: Trip) -> TripDetail:
    start_date, end_date = _date_range(trip)
    return TripDetail(
        id=trip.id,
        name=trip.name,
        start_date=start_date,
        end_date=end_date,
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        days=[DayOut.model_validate(d) for d in trip.days],
    )


@router.get("", response_model=list[TripSummary])
def list_trips(db: Session = Depends(get_db)):
    trips = db.query(Trip).order_by(Trip.created_at).all()
    return [_to_summary(t) for t in trips]


@router.post("", response_model=TripDetail, status_code=status.HTTP_201_CREATED)
def create_trip(payload: TripCreate, db: Session = Depends(get_db)):
    trip = Trip(name=payload.name)
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return to_trip_detail(trip)


@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = get_trip_or_404(db, trip_id)
    return to_trip_detail(trip)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: str, db: Session = Depends(get_db)):
    trip = get_trip_or_404(db, trip_id)
    db.delete(trip)
    db.commit()

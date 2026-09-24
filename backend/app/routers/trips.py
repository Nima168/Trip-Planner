from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Day, Trip, User
from app.schemas.trip import TripCreate, TripDetail, TripSummary
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/trips", tags=["trips"])


def get_trip_or_404(db: Session, trip_id: str, user_id: str) -> Trip:
    trip = db.get(Trip, trip_id)
    if trip is None or trip.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")
    return trip


@router.get("", response_model=list[TripSummary])
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trips = (
        db.query(Trip)
        .filter(Trip.user_id == current_user.id)
        .order_by(Trip.created_at)
        .all()
    )
    return trips


@router.post("", response_model=TripDetail, status_code=status.HTTP_201_CREATED)
def create_trip(
    payload: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="end_date must be on or after start_date"
        )
    # The server doesn't know the user's timezone, so allow one day of slack: a user
    # whose local "today" is still yesterday in UTC must not be rejected. The
    # frontend enforces the exact rule (start date today or later, local time).
    earliest_allowed = datetime.now(UTC).date() - timedelta(days=1)
    if payload.start_date < earliest_allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="start_date cannot be in the past"
        )

    trip = Trip(
        user_id=current_user.id,
        destination=payload.destination,
        start_date=payload.start_date,
        end_date=payload.end_date,
        trip_type=payload.trip_type,
    )
    day_count = (payload.end_date - payload.start_date).days + 1
    trip.days = [
        Day(day_number=n, date=payload.start_date + timedelta(days=n - 1))
        for n in range(1, day_count + 1)
    ]

    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_trip_or_404(db, trip_id, current_user.id)


@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_trip_or_404(db, trip_id, current_user.id)
    db.delete(trip)
    db.commit()

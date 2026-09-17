from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import ConflictError, NotFoundError
from app.models import Day
from app.routers.trips import get_trip_or_404
from app.schemas.day import DayCreate, DayOut, DayUpdate
from app.services.validation import validate_time_range

router = APIRouter(prefix="/trips/{trip_id}/days", tags=["days"])

_DATE_CONFLICT_MESSAGE = "A day already exists for this trip on that date."


def get_day_or_404(db: Session, trip_id: str, day_id: str) -> Day:
    day = db.get(Day, day_id)
    if day is None or day.trip_id != trip_id:
        raise NotFoundError("Day not found")
    return day


@router.post("", response_model=DayOut, status_code=status.HTTP_201_CREATED)
def create_day(trip_id: str, payload: DayCreate, db: Session = Depends(get_db)):
    trip = get_trip_or_404(db, trip_id)
    validate_time_range(payload.start_time, payload.end_time)

    next_position = max((d.position for d in trip.days), default=-1) + 1
    day = Day(
        trip_id=trip.id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        notes=payload.notes,
        position=next_position,
    )
    db.add(day)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(_DATE_CONFLICT_MESSAGE)
    db.refresh(day)
    return DayOut.model_validate(day)


@router.patch("/{day_id}", response_model=DayOut)
def update_day(trip_id: str, day_id: str, payload: DayUpdate, db: Session = Depends(get_db)):
    get_trip_or_404(db, trip_id)
    day = get_day_or_404(db, trip_id, day_id)

    for field in payload.model_fields_set:
        setattr(day, field, getattr(payload, field))

    validate_time_range(day.start_time, day.end_time)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ConflictError(_DATE_CONFLICT_MESSAGE)
    db.refresh(day)
    return DayOut.model_validate(day)


@router.delete("/{day_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_day(trip_id: str, day_id: str, db: Session = Depends(get_db)):
    get_trip_or_404(db, trip_id)
    day = get_day_or_404(db, trip_id, day_id)
    db.delete(day)
    db.commit()

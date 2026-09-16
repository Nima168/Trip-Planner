from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NotFoundError
from app.models import Activity
from app.routers.days import get_day_or_404
from app.routers.trips import get_trip_or_404
from app.schemas.activity import ActivityCreate, ActivityOut, ActivityUpdate
from app.services.validation import validate_time_range

router = APIRouter(prefix="/trips/{trip_id}/days/{day_id}/activities", tags=["activities"])


def get_activity_or_404(db: Session, day_id: str, activity_id: str) -> Activity:
    activity = db.get(Activity, activity_id)
    if activity is None or activity.day_id != day_id:
        raise NotFoundError("Activity not found")
    return activity


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(
    trip_id: str, day_id: str, payload: ActivityCreate, db: Session = Depends(get_db)
):
    get_trip_or_404(db, trip_id)
    day = get_day_or_404(db, trip_id, day_id)
    validate_time_range(payload.start_time, payload.end_time)

    next_position = max((a.position for a in day.activities), default=-1) + 1
    activity = Activity(
        day_id=day.id,
        title=payload.title,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        notes=payload.notes,
        position=next_position,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return ActivityOut.model_validate(activity)


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(
    trip_id: str,
    day_id: str,
    activity_id: str,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
):
    get_trip_or_404(db, trip_id)
    get_day_or_404(db, trip_id, day_id)
    activity = get_activity_or_404(db, day_id, activity_id)

    for field in payload.model_fields_set:
        setattr(activity, field, getattr(payload, field))

    validate_time_range(activity.start_time, activity.end_time)

    db.commit()
    db.refresh(activity)
    return ActivityOut.model_validate(activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    trip_id: str, day_id: str, activity_id: str, db: Session = Depends(get_db)
):
    get_trip_or_404(db, trip_id)
    get_day_or_404(db, trip_id, day_id)
    activity = get_activity_or_404(db, day_id, activity_id)
    db.delete(activity)
    db.commit()

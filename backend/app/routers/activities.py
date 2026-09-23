from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Activity, Day, User
from app.routers.trips import get_trip_or_404
from app.schemas.activity import ActivityCreate, ActivityOut, ActivityUpdate
from app.services.auth_service import get_current_user

router = APIRouter(tags=["activities"])


def get_day_or_404(db: Session, trip_id: str, day_id: str) -> Day:
    day = db.get(Day, day_id)
    if day is None or day.trip_id != trip_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found")
    return day


def get_activity_or_404(db: Session, activity_id: str, user_id: str) -> Activity:
    activity = (
        db.query(Activity)
        .options(joinedload(Activity.day).joinedload(Day.trip))
        .filter(Activity.id == activity_id)
        .first()
    )
    if activity is None or activity.day.trip.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
    return activity


def _require_non_blank_text(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="text must not be empty")
    return stripped


@router.post(
    "/trips/{trip_id}/days/{day_id}/activities",
    response_model=ActivityOut,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    trip_id: str,
    day_id: str,
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_or_404(db, trip_id, current_user.id)
    day = get_day_or_404(db, trip_id, day_id)
    text = _require_non_blank_text(payload.text)

    next_sort_order = max((a.sort_order for a in day.activities), default=-1) + 1
    activity = Activity(day_id=day.id, text=text, sort_order=next_sort_order)
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


@router.patch("/activities/{activity_id}", response_model=ActivityOut)
def update_activity(
    activity_id: str,
    payload: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = get_activity_or_404(db, activity_id, current_user.id)
    activity.text = _require_non_blank_text(payload.text)
    db.commit()
    db.refresh(activity)
    return activity


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(
    activity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    activity = get_activity_or_404(db, activity_id, current_user.id)
    db.delete(activity)
    db.commit()

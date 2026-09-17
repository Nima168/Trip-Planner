from datetime import date as date_
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.activity import ActivityOut
from app.schemas.common import TimeHHMM


class DayCreate(BaseModel):
    date: date_
    start_time: TimeHHMM | None = None
    end_time: TimeHHMM | None = None
    location: str | None = None
    notes: str | None = None


class DayUpdate(BaseModel):
    date: date_ | None = None
    start_time: TimeHHMM | None = None
    end_time: TimeHHMM | None = None
    location: str | None = None
    notes: str | None = None


class DayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trip_id: str
    date: date_
    start_time: TimeHHMM | None
    end_time: TimeHHMM | None
    location: str | None
    notes: str | None
    position: int
    created_at: datetime
    updated_at: datetime
    activities: list[ActivityOut]

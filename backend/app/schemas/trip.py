from datetime import date as date_
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.day import DayOut


class TripCreate(BaseModel):
    name: str = Field(min_length=1)


class TripSummary(BaseModel):
    id: str
    name: str
    start_date: date_ | None
    end_date: date_ | None
    day_count: int
    created_at: datetime
    updated_at: datetime


class TripDetail(BaseModel):
    id: str
    name: str
    start_date: date_ | None
    end_date: date_ | None
    created_at: datetime
    updated_at: datetime
    days: list[DayOut]

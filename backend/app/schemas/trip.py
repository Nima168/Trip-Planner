from datetime import date as date_
from datetime import datetime

from pydantic import BaseModel, Field

from app.models import TripType
from app.schemas.day import DayOut


# `end_date >= start_date` is intentionally NOT enforced here: it's a business-rule
# error (400 per api-contract-spec.md), not a request-shape error (422), so it's
# checked explicitly in the router/service rather than via a pydantic validator.
class TripCreate(BaseModel):
    destination: str = Field(min_length=1)
    start_date: date_
    end_date: date_
    trip_type: TripType


class TripSummary(BaseModel):
    id: str
    destination: str
    start_date: date_
    end_date: date_
    trip_type: TripType
    created_at: datetime


class TripDetail(BaseModel):
    id: str
    destination: str
    start_date: date_
    end_date: date_
    trip_type: TripType
    created_at: datetime
    days: list[DayOut]

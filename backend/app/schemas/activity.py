from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import TimeHHMM


class ActivityCreate(BaseModel):
    title: str = Field(min_length=1)
    start_time: TimeHHMM
    end_time: TimeHHMM
    location: str | None = None
    notes: str | None = None


class ActivityUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    start_time: TimeHHMM | None = None
    end_time: TimeHHMM | None = None
    location: str | None = None
    notes: str | None = None


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    day_id: str
    title: str
    start_time: TimeHHMM
    end_time: TimeHHMM
    location: str | None
    notes: str | None
    position: int
    created_at: datetime
    updated_at: datetime

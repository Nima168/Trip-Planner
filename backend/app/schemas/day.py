from datetime import date as date_

from pydantic import BaseModel, ConfigDict

from app.schemas.activity import ActivityOut


class DayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    day_number: int
    date: date_
    activities: list[ActivityOut]

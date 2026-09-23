from datetime import datetime

from pydantic import BaseModel, ConfigDict


# `text` is intentionally unconstrained here: an empty/whitespace-only value is a
# business-rule error (400 per api-contract-spec.md), not a request-shape error (422),
# so it's checked explicitly in the router rather than via a pydantic validator.
class ActivityCreate(BaseModel):
    text: str


class ActivityUpdate(BaseModel):
    text: str


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    day_id: str
    text: str
    sort_order: int
    created_at: datetime

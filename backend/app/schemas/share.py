from datetime import datetime

from pydantic import BaseModel


class ShareLinkOut(BaseModel):
    trip_id: str
    token: str
    url: str
    created_at: datetime

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ShareLink
from app.routers.trips import get_trip_or_404
from app.schemas.share import ShareLinkOut

router = APIRouter(prefix="/trips/{trip_id}/share", tags=["share"])


def _active_link_for_trip(db: Session, trip_id: str) -> ShareLink | None:
    return (
        db.query(ShareLink)
        .filter(ShareLink.trip_id == trip_id, ShareLink.revoked_at.is_(None))
        .first()
    )


def _to_out(link: ShareLink) -> ShareLinkOut:
    return ShareLinkOut(
        trip_id=link.trip_id,
        token=link.token,
        url=f"/share/{link.token}",
        created_at=link.created_at,
    )


@router.post("", response_model=ShareLinkOut)
def create_or_get_share_link(trip_id: str, db: Session = Depends(get_db)):
    get_trip_or_404(db, trip_id)

    link = _active_link_for_trip(db, trip_id)
    if link is None:
        link = ShareLink(trip_id=trip_id, token=secrets.token_urlsafe(32))
        db.add(link)
        db.commit()
        db.refresh(link)

    return _to_out(link)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def revoke_share_link(trip_id: str, db: Session = Depends(get_db)):
    get_trip_or_404(db, trip_id)

    link = _active_link_for_trip(db, trip_id)
    if link is not None:
        link.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

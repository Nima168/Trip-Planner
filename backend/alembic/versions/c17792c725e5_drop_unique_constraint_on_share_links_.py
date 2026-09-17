"""drop unique constraint on share_links.trip_id

A trip may now have multiple ShareLink rows over time (revoked history +
at most one active), so trip_id can no longer be globally unique. "At most
one active link per trip" is enforced at the application level instead
(see app/routers/share.py). SQLite has no ALTER TABLE ... DROP CONSTRAINT,
so this recreates the table without the inline UNIQUE(trip_id).

Revision ID: c17792c725e5
Revises: 89aabb89ed3c
Create Date: 2026-09-17 01:03:08.167352

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c17792c725e5'
down_revision: Union[str, Sequence[str], None] = '89aabb89ed3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE share_links_new (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            trip_id VARCHAR(36) NOT NULL REFERENCES trips (id),
            token VARCHAR NOT NULL,
            created_at DATETIME NOT NULL,
            revoked_at DATETIME
        )
        """
    )
    op.execute(
        "INSERT INTO share_links_new (id, trip_id, token, created_at, revoked_at) "
        "SELECT id, trip_id, token, created_at, revoked_at FROM share_links"
    )
    op.execute("DROP TABLE share_links")
    op.execute("ALTER TABLE share_links_new RENAME TO share_links")
    op.create_index("ix_share_links_trip_id", "share_links", ["trip_id"], unique=False)
    op.create_index("ix_share_links_token", "share_links", ["token"], unique=True)


def downgrade() -> None:
    op.execute(
        """
        CREATE TABLE share_links_new (
            id VARCHAR(36) NOT NULL PRIMARY KEY,
            trip_id VARCHAR(36) NOT NULL UNIQUE REFERENCES trips (id),
            token VARCHAR NOT NULL,
            created_at DATETIME NOT NULL,
            revoked_at DATETIME
        )
        """
    )
    op.execute(
        "INSERT INTO share_links_new (id, trip_id, token, created_at, revoked_at) "
        "SELECT id, trip_id, token, created_at, revoked_at FROM share_links"
    )
    op.execute("DROP TABLE share_links")
    op.execute("ALTER TABLE share_links_new RENAME TO share_links")
    op.create_index("ix_share_links_token", "share_links", ["token"], unique=True)

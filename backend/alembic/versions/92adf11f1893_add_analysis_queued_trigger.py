"""add_analysis_queued_trigger

Revision ID: 92adf11f1893
Revises: f6fb336378c3
Create Date: 2026-07-18 15:56:18.704561

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '92adf11f1893'
down_revision: Union[str, Sequence[str], None] = 'f6fb336378c3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
    CREATE OR REPLACE FUNCTION notify_analysis_queued()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.analysis_status = 'queued' AND (OLD.analysis_status IS NULL OR OLD.analysis_status != 'queued') THEN
        PERFORM pg_notify('analysis_queued', NEW.id::text);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)
    op.execute("""
    CREATE TRIGGER t_analysis_queued
    AFTER INSERT OR UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION notify_analysis_queued();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS t_analysis_queued ON applications;")
    op.execute("DROP FUNCTION IF EXISTS notify_analysis_queued();")

"""shift week_start from monday to saturday

Revision ID: c290889c6f78
Revises: 5f5e45ccee65
Create Date: 2026-02-20 09:09:35.220715

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c290889c6f78'
down_revision: Union[str, Sequence[str], None] = '5f5e45ccee65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Shift existing Monday-based week_start values back 2 days to Saturday.
    # SQLite: date(week_start, '-2 days')
    op.execute("UPDATE week_plans SET week_start = date(week_start, '-2 days')")


def downgrade() -> None:
    # Reverse: shift Saturday back to Monday (+2 days)
    op.execute("UPDATE week_plans SET week_start = date(week_start, '+2 days')")

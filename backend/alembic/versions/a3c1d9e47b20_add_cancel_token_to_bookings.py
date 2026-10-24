"""add cancel_token to bookings

Revision ID: a3c1d9e47b20
Revises: 6fce8fbc6f24
Create Date: 2026-10-24 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3c1d9e47b20'
down_revision: Union[str, Sequence[str], None] = '6fce8fbc6f24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, so the bookings that already exist (e.g. the seeded ones) keep working.
    op.add_column('bookings', sa.Column('cancel_token', sa.String(length=64), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bookings', 'cancel_token')

"""add patient_phone to bookings

Revision ID: b7e2f5a81c34
Revises: a3c1d9e47b20
Create Date: 2026-10-24 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2f5a81c34'
down_revision: Union[str, Sequence[str], None] = 'a3c1d9e47b20'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable: the phone is optional, and existing bookings have none.
    op.add_column('bookings', sa.Column('patient_phone', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('bookings', 'patient_phone')

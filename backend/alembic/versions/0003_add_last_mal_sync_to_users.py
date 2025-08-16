"""Add last_mal_sync to users table

Revision ID: 0003
Revises: 0002
Create Date: 2025-01-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add last_mal_sync column to users table
    op.add_column('users', sa.Column('last_mal_sync', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove last_mal_sync column from users table
    op.drop_column('users', 'last_mal_sync')
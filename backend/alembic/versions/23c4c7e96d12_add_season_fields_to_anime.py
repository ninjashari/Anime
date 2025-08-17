"""add_season_fields_to_anime

Revision ID: 23c4c7e96d12
Revises: f805244a5eea
Create Date: 2025-08-16 13:05:23.880901

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '23c4c7e96d12'
down_revision = 'f805244a5eea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add season fields to anime table
    op.add_column('anime', sa.Column('start_season_year', sa.Integer(), nullable=True))
    op.add_column('anime', sa.Column('start_season_season', sa.String(length=10), nullable=True))


def downgrade() -> None:
    # Remove season fields from anime table
    op.drop_column('anime', 'start_season_season')
    op.drop_column('anime', 'start_season_year')
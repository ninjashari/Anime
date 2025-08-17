"""fix_episodes_constraint_allow_zero

Revision ID: f805244a5eea
Revises: 0003
Create Date: 2025-08-16 12:13:17.443299

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f805244a5eea'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old constraint that doesn't allow 0 episodes
    op.drop_constraint('check_positive_episodes', 'anime', type_='check')
    
    # Add new constraint that allows 0 episodes (for not-yet-aired anime)
    op.create_check_constraint(
        'check_positive_episodes',
        'anime',
        'episodes IS NULL OR episodes >= 0'
    )


def downgrade() -> None:
    # Drop the new constraint
    op.drop_constraint('check_positive_episodes', 'anime', type_='check')
    
    # Restore the old constraint (episodes must be > 0)
    op.create_check_constraint(
        'check_positive_episodes',
        'anime',
        'episodes IS NULL OR episodes > 0'
    )
"""Initial database schema

Revision ID: 0001
Revises: 
Create Date: 2025-01-08 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('mal_access_token', sa.Text(), nullable=True),
        sa.Column('mal_refresh_token', sa.Text(), nullable=True),
        sa.Column('mal_token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    # Create anime table
    op.create_table('anime',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('mal_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('title_english', sa.String(length=255), nullable=True),
        sa.Column('synopsis', sa.Text(), nullable=True),
        sa.Column('episodes', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('aired_from', sa.Date(), nullable=True),
        sa.Column('aired_to', sa.Date(), nullable=True),
        sa.Column('score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('rank', sa.Integer(), nullable=True),
        sa.Column('popularity', sa.Integer(), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_anime_id'), 'anime', ['id'], unique=False)
    op.create_index(op.f('ix_anime_mal_id'), 'anime', ['mal_id'], unique=True)
    op.create_index(op.f('ix_anime_title'), 'anime', ['title'], unique=False)

    # Create anidb_mappings table
    op.create_table('anidb_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('anidb_id', sa.Integer(), nullable=False),
        sa.Column('mal_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('confidence_score', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['mal_id'], ['anime.mal_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_anidb_mappings_anidb_id'), 'anidb_mappings', ['anidb_id'], unique=True)
    op.create_index(op.f('ix_anidb_mappings_id'), 'anidb_mappings', ['id'], unique=False)
    op.create_index(op.f('ix_anidb_mappings_mal_id'), 'anidb_mappings', ['mal_id'], unique=False)

    # Create user_anime_lists table
    op.create_table('user_anime_lists',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('anime_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('score', sa.Integer(), nullable=True),
        sa.Column('episodes_watched', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('finish_date', sa.Date(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.CheckConstraint('episodes_watched >= 0', name='non_negative_episodes'),
        sa.CheckConstraint("status IN ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')", name='valid_status'),
        sa.CheckConstraint('score >= 0 AND score <= 10', name='valid_score_range'),
        sa.ForeignKeyConstraint(['anime_id'], ['anime.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'anime_id', name='unique_user_anime')
    )
    op.create_index(op.f('ix_user_anime_lists_anime_id'), 'user_anime_lists', ['anime_id'], unique=False)
    op.create_index(op.f('ix_user_anime_lists_id'), 'user_anime_lists', ['id'], unique=False)
    op.create_index(op.f('ix_user_anime_lists_status'), 'user_anime_lists', ['status'], unique=False)
    op.create_index(op.f('ix_user_anime_lists_user_id'), 'user_anime_lists', ['user_id'], unique=False)

    # Create jellyfin_activities table
    op.create_table('jellyfin_activities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('anidb_id', sa.Integer(), nullable=True),
        sa.Column('mal_id', sa.Integer(), nullable=True),
        sa.Column('episode_number', sa.Integer(), nullable=True),
        sa.Column('watch_duration', sa.Integer(), nullable=True),
        sa.Column('total_duration', sa.Integer(), nullable=True),
        sa.Column('completion_percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('jellyfin_item_id', sa.String(length=255), nullable=True),
        sa.Column('processed', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jellyfin_activities_anidb_id'), 'jellyfin_activities', ['anidb_id'], unique=False)
    op.create_index(op.f('ix_jellyfin_activities_id'), 'jellyfin_activities', ['id'], unique=False)
    op.create_index(op.f('ix_jellyfin_activities_jellyfin_item_id'), 'jellyfin_activities', ['jellyfin_item_id'], unique=False)
    op.create_index(op.f('ix_jellyfin_activities_mal_id'), 'jellyfin_activities', ['mal_id'], unique=False)
    op.create_index(op.f('ix_jellyfin_activities_processed'), 'jellyfin_activities', ['processed'], unique=False)
    op.create_index(op.f('ix_jellyfin_activities_user_id'), 'jellyfin_activities', ['user_id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('jellyfin_activities')
    op.drop_table('user_anime_lists')
    op.drop_table('anidb_mappings')
    op.drop_table('anime')
    op.drop_table('users')
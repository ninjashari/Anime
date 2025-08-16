"""
Database initialization script with indexes and constraints.
"""
import logging
from sqlalchemy import text
from .database import engine, SessionLocal
from ..models import Base

logger = logging.getLogger(__name__)


def create_database_indexes() -> None:
    """
    Create additional database indexes for performance optimization.
    """
    with SessionLocal() as db:
        try:
            # Additional indexes for performance
            indexes = [
                # User table indexes
                "CREATE INDEX IF NOT EXISTS idx_users_mal_token_expires ON users(mal_token_expires_at) WHERE mal_token_expires_at IS NOT NULL",
                
                # Anime table indexes
                "CREATE INDEX IF NOT EXISTS idx_anime_status ON anime(status)",
                "CREATE INDEX IF NOT EXISTS idx_anime_score ON anime(score) WHERE score IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_anime_aired_from ON anime(aired_from) WHERE aired_from IS NOT NULL",
                
                # User anime lists indexes
                "CREATE INDEX IF NOT EXISTS idx_user_anime_lists_score ON user_anime_lists(score) WHERE score IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_user_anime_lists_episodes ON user_anime_lists(episodes_watched)",
                "CREATE INDEX IF NOT EXISTS idx_user_anime_lists_dates ON user_anime_lists(start_date, finish_date)",
                
                # AniDB mappings indexes
                "CREATE INDEX IF NOT EXISTS idx_anidb_mappings_confidence ON anidb_mappings(confidence_score) WHERE confidence_score IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_anidb_mappings_source ON anidb_mappings(source)",
                
                # Jellyfin activities indexes
                "CREATE INDEX IF NOT EXISTS idx_jellyfin_activities_episode ON jellyfin_activities(episode_number) WHERE episode_number IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_jellyfin_activities_completion ON jellyfin_activities(completion_percentage) WHERE completion_percentage IS NOT NULL",
                "CREATE INDEX IF NOT EXISTS idx_jellyfin_activities_created ON jellyfin_activities(created_at)",
            ]
            
            for index_sql in indexes:
                db.execute(text(index_sql))
                logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'custom'}")
            
            db.commit()
            logger.info("Additional database indexes created successfully")
            
        except Exception as e:
            logger.error(f"Error creating database indexes: {e}")
            db.rollback()
            raise


def create_database_constraints() -> None:
    """
    Create additional database constraints for data integrity.
    """
    with SessionLocal() as db:
        try:
            # Additional constraints
            constraints = [
                # Ensure MAL token fields are consistent
                """
                ALTER TABLE users 
                ADD CONSTRAINT check_mal_tokens 
                CHECK (
                    (mal_access_token IS NULL AND mal_refresh_token IS NULL AND mal_token_expires_at IS NULL) OR
                    (mal_access_token IS NOT NULL AND mal_refresh_token IS NOT NULL AND mal_token_expires_at IS NOT NULL)
                )
                """,
                
                # Ensure anime episodes are positive
                "ALTER TABLE anime ADD CONSTRAINT check_positive_episodes CHECK (episodes IS NULL OR episodes > 0)",
                
                # Ensure anime score is in valid range
                "ALTER TABLE anime ADD CONSTRAINT check_anime_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 10))",
                
                # Ensure user anime list episodes watched doesn't exceed total episodes
                # Note: This will be enforced at application level since we need to join with anime table
                
                # Ensure jellyfin activity durations are positive
                "ALTER TABLE jellyfin_activities ADD CONSTRAINT check_positive_durations CHECK (watch_duration IS NULL OR watch_duration >= 0)",
                "ALTER TABLE jellyfin_activities ADD CONSTRAINT check_positive_total_duration CHECK (total_duration IS NULL OR total_duration >= 0)",
                
                # Ensure completion percentage is valid
                "ALTER TABLE jellyfin_activities ADD CONSTRAINT check_completion_percentage CHECK (completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100))",
            ]
            
            for constraint_sql in constraints:
                try:
                    db.execute(text(constraint_sql))
                    constraint_name = constraint_sql.split('CONSTRAINT ')[1].split(' ')[0] if 'CONSTRAINT ' in constraint_sql else 'unnamed'
                    logger.info(f"Created constraint: {constraint_name}")
                except Exception as constraint_error:
                    # Some constraints might already exist, log but continue
                    logger.warning(f"Constraint creation failed (might already exist): {constraint_error}")
            
            db.commit()
            logger.info("Additional database constraints processed")
            
        except Exception as e:
            logger.error(f"Error creating database constraints: {e}")
            db.rollback()
            raise


def init_database() -> None:
    """
    Initialize the complete database with tables, indexes, and constraints.
    """
    try:
        logger.info("Starting database initialization...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Create additional indexes
        create_database_indexes()
        
        # Create additional constraints
        create_database_constraints()
        
        logger.info("Database initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Initialize database
    init_database()
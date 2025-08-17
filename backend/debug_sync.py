#!/usr/bin/env python3
"""
Debug script to manually test MAL sync and find missing anime.
"""
import asyncio
import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, '/home/abhinav/websites/Anime/backend')

from app.core.database import SessionLocal
from app.models.user import User
from app.services.sync_service import SyncService
from app.core.logging import setup_logging, get_logger

# Setup logging
setup_logging()
logger = get_logger("debug_sync")

async def debug_sync():
    """Debug the MAL sync process."""
    db = SessionLocal()
    try:
        # Get user abhinav
        user = db.query(User).filter(User.username == "abhinav").first()
        if not user:
            logger.error("User 'abhinav' not found")
            return
        
        if not user.mal_access_token:
            logger.error("User has no MAL access token")
            return
        
        logger.info(f"Starting debug sync for user {user.username} (ID: {user.id})")
        
        # Create sync service and run sync
        sync_service = SyncService()
        
        # Run the sync and capture results
        results = await sync_service.sync_user_anime_data(db, user, force_full_sync=True)
        
        logger.info(f"Sync completed. Results: {results}")
        
        # Check final count
        from app.models.user_anime_list import UserAnimeList
        final_count = db.query(UserAnimeList).filter(UserAnimeList.user_id == user.id).count()
        logger.info(f"Final anime count in database: {final_count}")
        
    except Exception as e:
        logger.error(f"Debug sync failed: {str(e)}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(debug_sync())
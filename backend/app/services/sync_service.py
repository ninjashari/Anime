"""
Anime data synchronization service for MyAnimeList integration.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.database import get_db
from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList
from app.services.mal_service import get_mal_service
from app.core.config import settings


logger = logging.getLogger(__name__)


class SyncConflictError(Exception):
    """Exception raised when sync conflicts cannot be resolved automatically."""
    pass


class SyncService:
    """Service for synchronizing anime data between local database and MyAnimeList."""
    
    def __init__(self):
        self.mal_service = get_mal_service()
        self.batch_size = 100
        self.max_retries = 3
        self.retry_delay = 5  # seconds
    
    async def sync_user_anime_data(
        self, 
        db: Session, 
        user: User,
        force_full_sync: bool = False
    ) -> Dict[str, Any]:
        """
        Synchronize user's anime data with MyAnimeList.
        
        Args:
            db: Database session
            user: User to sync data for
            force_full_sync: If True, sync all data regardless of last sync time
            
        Returns:
            Dictionary with sync results and statistics
        """
        logger.info(f"Starting anime data sync for user {user.id}")
        logger.debug(f"Force full sync: {force_full_sync}")
        logger.debug(f"User MAL token exists: {bool(user.mal_access_token)}")
        logger.debug(f"User last sync: {user.last_mal_sync}")
        
        sync_stats = {
            "user_id": user.id,
            "started_at": datetime.utcnow(),
            "anime_fetched": 0,
            "anime_created": 0,
            "anime_updated": 0,
            "user_lists_created": 0,
            "user_lists_updated": 0,
            "conflicts_resolved": 0,
            "errors": []
        }
        
        try:
            # Ensure user has valid MAL token
            logger.debug("Validating MAL access token...")
            access_token = await self.mal_service.ensure_valid_token(db, user)
            logger.debug(f"MAL access token validated successfully")
            
            # Fetch user's anime list from MyAnimeList
            logger.debug("Fetching complete user anime list from MAL...")
            mal_anime_data = await self._fetch_complete_user_anime_list(access_token)
            sync_stats["anime_fetched"] = len(mal_anime_data)
            logger.debug(f"Fetched {len(mal_anime_data)} anime entries from MAL")
            
            # Process anime data in batches
            for i in range(0, len(mal_anime_data), self.batch_size):
                batch = mal_anime_data[i:i + self.batch_size]
                batch_stats = await self._process_anime_batch(db, user, batch)
                
                # Aggregate batch statistics
                sync_stats["anime_created"] += batch_stats["anime_created"]
                sync_stats["anime_updated"] += batch_stats["anime_updated"]
                sync_stats["user_lists_created"] += batch_stats["user_lists_created"]
                sync_stats["user_lists_updated"] += batch_stats["user_lists_updated"]
                sync_stats["conflicts_resolved"] += batch_stats["conflicts_resolved"]
                sync_stats["errors"].extend(batch_stats["errors"])
                
                # Commit batch changes
                db.commit()
                
                logger.info(f"Processed batch {i//self.batch_size + 1} of {len(mal_anime_data)//self.batch_size + 1}")
            
            # Update user's last sync timestamp
            user.last_mal_sync = datetime.utcnow()
            db.commit()
            
            sync_stats["completed_at"] = datetime.utcnow()
            sync_stats["duration"] = (sync_stats["completed_at"] - sync_stats["started_at"]).total_seconds()
            
            logger.info(f"Completed anime data sync for user {user.id}. Stats: {sync_stats}")
            
        except Exception as e:
            logger.error(f"Error during anime data sync for user {user.id}: {str(e)}")
            sync_stats["errors"].append(f"Sync failed: {str(e)}")
            db.rollback()
            raise
        
        return sync_stats
    
    async def _fetch_complete_user_anime_list(self, access_token: str) -> List[Dict[str, Any]]:
        """
        Fetch complete user anime list from MyAnimeList with pagination.
        
        Args:
            access_token: Valid MAL access token
            
        Returns:
            List of anime data from MyAnimeList
        """
        all_anime = []
        offset = 0
        limit = 100
        
        while True:
            try:
                logger.debug(f"Fetching anime list from MAL: offset={offset}, limit={limit}")
                response = await self.mal_service.get_user_anime_list(
                    access_token=access_token,
                    limit=limit,
                    offset=offset
                )
                
                anime_list = response.get("data", [])
                logger.debug(f"MAL API returned {len(anime_list)} anime items at offset {offset}")
                
                if not anime_list:
                    logger.debug("No more anime data from MAL API, stopping pagination")
                    break
                
                all_anime.extend(anime_list)
                offset += limit
                
                logger.info(f"Fetched {len(all_anime)} total anime so far from MAL")
                
                # Check if we've fetched all data
                if len(anime_list) < limit:
                    logger.debug(f"Received {len(anime_list)} < {limit}, reached end of data")
                    break
                    
            except Exception as e:
                logger.error(f"Error fetching anime list at offset {offset}: {str(e)}")
                # Retry with exponential backoff
                await asyncio.sleep(self.retry_delay)
                continue
        
        logger.info(f"Completed fetching {len(all_anime)} total anime from MAL")
        return all_anime
    
    async def _process_anime_batch(
        self, 
        db: Session, 
        user: User, 
        anime_batch: List[Dict[str, Any]]
    ) -> Dict[str, int]:
        """
        Process a batch of anime data from MyAnimeList.
        
        Args:
            db: Database session
            user: User to sync data for
            anime_batch: Batch of anime data from MyAnimeList
            
        Returns:
            Dictionary with batch processing statistics
        """
        batch_stats = {
            "anime_created": 0,
            "anime_updated": 0,
            "user_lists_created": 0,
            "user_lists_updated": 0,
            "conflicts_resolved": 0,
            "errors": []
        }
        
        for anime_data in anime_batch:
            try:
                anime_info = anime_data.get("node", {})
                list_status = anime_data.get("list_status", {})
                
                mal_id = anime_info.get("id")
                if not mal_id:
                    logger.warning(f"Skipping anime without MAL ID: {anime_data}")
                    continue
                
                logger.debug(f"Processing anime MAL ID {mal_id}: {anime_info.get('title', 'Unknown Title')}")
                
                # Sync anime information
                anime, anime_created = await self._sync_anime_info(db, anime_info)
                if anime_created:
                    batch_stats["anime_created"] += 1
                else:
                    batch_stats["anime_updated"] += 1
                
                # Sync user list entry
                user_list, list_created, conflicts = await self._sync_user_list_entry(
                    db, user, anime, list_status
                )
                
                if list_created:
                    batch_stats["user_lists_created"] += 1
                else:
                    batch_stats["user_lists_updated"] += 1
                
                batch_stats["conflicts_resolved"] += conflicts
                
            except Exception as e:
                error_msg = f"Error processing anime {anime_info.get('id', 'unknown')}: {str(e)}"
                logger.error(error_msg)
                batch_stats["errors"].append(error_msg)
                
                # If there's a database error, rollback the current transaction
                # to prevent PendingRollbackError
                try:
                    db.rollback()
                except Exception as rollback_error:
                    logger.error(f"Error during rollback: {rollback_error}")
        
        return batch_stats
    
    async def _sync_anime_info(self, db: Session, anime_info: Dict[str, Any]) -> Tuple[Anime, bool]:
        """
        Sync anime information to local database.
        
        Args:
            db: Database session
            anime_info: Anime information from MyAnimeList
            
        Returns:
            Tuple of (Anime object, created flag)
        """
        mal_id = anime_info.get("id")
        
        # Check if anime already exists
        anime = db.query(Anime).filter(Anime.mal_id == mal_id).first()
        created = False
        
        if not anime:
            anime = Anime(mal_id=mal_id)
            db.add(anime)
            created = True
        
        # Update anime information
        anime.title = anime_info.get("title", anime.title)
        anime.title_english = anime_info.get("alternative_titles", {}).get("en", anime.title_english)
        anime.synopsis = anime_info.get("synopsis", anime.synopsis)
        anime.episodes = anime_info.get("num_episodes", anime.episodes)
        anime.status = anime_info.get("status", anime.status)
        
        # Parse dates
        start_date = anime_info.get("start_date")
        if start_date:
            try:
                anime.aired_from = datetime.strptime(start_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        
        end_date = anime_info.get("end_date")
        if end_date:
            try:
                anime.aired_to = datetime.strptime(end_date, "%Y-%m-%d").date()
            except ValueError:
                pass
        
        # Parse season information
        start_season = anime_info.get("start_season")
        if start_season:
            anime.start_season_year = start_season.get("year")
            anime.start_season_season = start_season.get("season")  # spring, summer, fall, winter
        
        # Update scores and rankings
        anime.score = anime_info.get("mean", anime.score)
        anime.rank = anime_info.get("rank", anime.rank)
        anime.popularity = anime_info.get("popularity", anime.popularity)
        
        # Update image URL
        main_picture = anime_info.get("main_picture", {})
        if main_picture:
            anime.image_url = main_picture.get("large") or main_picture.get("medium", anime.image_url)
        
        # Flush to get the anime.id for new anime records
        if created:
            db.flush()
        
        return anime, created
    
    async def _sync_user_list_entry(
        self, 
        db: Session, 
        user: User, 
        anime: Anime, 
        list_status: Dict[str, Any]
    ) -> Tuple[UserAnimeList, bool, int]:
        """
        Sync user anime list entry with conflict resolution.
        
        Args:
            db: Database session
            user: User object
            anime: Anime object
            list_status: List status data from MyAnimeList
            
        Returns:
            Tuple of (UserAnimeList object, created flag, conflicts resolved count)
        """
        # Check if user list entry already exists
        user_list = db.query(UserAnimeList).filter(
            and_(
                UserAnimeList.user_id == user.id,
                UserAnimeList.anime_id == anime.id
            )
        ).first()
        
        created = False
        conflicts_resolved = 0
        
        if not user_list:
            user_list = UserAnimeList(user_id=user.id, anime_id=anime.id)
            db.add(user_list)
            created = True
        
        # Resolve conflicts and update data
        conflicts_resolved += await self._resolve_list_conflicts(user_list, list_status)
        
        return user_list, created, conflicts_resolved
    
    async def _resolve_list_conflicts(
        self, 
        user_list: UserAnimeList, 
        mal_data: Dict[str, Any]
    ) -> int:
        """
        Resolve conflicts between local and MyAnimeList data.
        
        Args:
            user_list: Local user anime list entry
            mal_data: MyAnimeList list status data
            
        Returns:
            Number of conflicts resolved
        """
        conflicts_resolved = 0
        
        # Status conflict resolution - MAL is source of truth
        mal_status = mal_data.get("status")
        if mal_status and mal_status != user_list.status:
            logger.info(f"Resolving status conflict for anime {user_list.anime_id}: {user_list.status} -> {mal_status}")
            user_list.status = mal_status
            conflicts_resolved += 1
        
        # Score conflict resolution - prefer MAL if both exist, otherwise keep local
        mal_score = mal_data.get("score")
        if mal_score and mal_score != user_list.score:
            if mal_score > 0:  # MAL score is set
                logger.info(f"Resolving score conflict for anime {user_list.anime_id}: {user_list.score} -> {mal_score}")
                user_list.score = mal_score
                conflicts_resolved += 1
        
        # Episodes watched conflict resolution - use higher value
        mal_episodes = mal_data.get("num_episodes_watched", 0)
        if mal_episodes > user_list.episodes_watched:
            logger.info(f"Resolving episodes conflict for anime {user_list.anime_id}: {user_list.episodes_watched} -> {mal_episodes}")
            user_list.episodes_watched = mal_episodes
            conflicts_resolved += 1
        
        # Date conflict resolution - prefer MAL dates
        mal_start_date = mal_data.get("start_date")
        if mal_start_date:
            try:
                start_date = datetime.strptime(mal_start_date, "%Y-%m-%d").date()
                if start_date != user_list.start_date:
                    user_list.start_date = start_date
                    conflicts_resolved += 1
            except ValueError:
                pass
        
        mal_finish_date = mal_data.get("finish_date")
        if mal_finish_date:
            try:
                finish_date = datetime.strptime(mal_finish_date, "%Y-%m-%d").date()
                if finish_date != user_list.finish_date:
                    user_list.finish_date = finish_date
                    conflicts_resolved += 1
            except ValueError:
                pass
        
        # Comments/notes - prefer local notes if they exist
        mal_comments = mal_data.get("comments")
        if mal_comments and not user_list.notes:
            user_list.notes = mal_comments
            conflicts_resolved += 1
        
        return conflicts_resolved
    
    async def sync_all_users(self, db: Session) -> Dict[str, Any]:
        """
        Synchronize anime data for all users with MAL tokens.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with overall sync statistics
        """
        logger.info("Starting bulk user anime data synchronization")
        
        overall_stats = {
            "started_at": datetime.utcnow(),
            "users_processed": 0,
            "users_succeeded": 0,
            "users_failed": 0,
            "total_anime_synced": 0,
            "errors": []
        }
        
        # Get all users with MAL tokens
        users_with_tokens = db.query(User).filter(
            and_(
                User.mal_access_token.isnot(None),
                User.mal_refresh_token.isnot(None)
            )
        ).all()
        
        logger.info(f"Found {len(users_with_tokens)} users with MAL tokens")
        
        for user in users_with_tokens:
            try:
                user_stats = await self.sync_user_anime_data(db, user)
                overall_stats["users_succeeded"] += 1
                overall_stats["total_anime_synced"] += user_stats["anime_fetched"]
                
            except Exception as e:
                error_msg = f"Failed to sync user {user.id}: {str(e)}"
                logger.error(error_msg)
                overall_stats["users_failed"] += 1
                overall_stats["errors"].append(error_msg)
            
            overall_stats["users_processed"] += 1
        
        overall_stats["completed_at"] = datetime.utcnow()
        overall_stats["duration"] = (overall_stats["completed_at"] - overall_stats["started_at"]).total_seconds()
        
        logger.info(f"Completed bulk sync. Stats: {overall_stats}")
        return overall_stats


# Global service instance
sync_service = None


def get_sync_service() -> SyncService:
    """Get or create sync service instance."""
    global sync_service
    if sync_service is None:
        sync_service = SyncService()
    return sync_service
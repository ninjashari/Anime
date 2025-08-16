"""
Background tasks for anime data synchronization.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from celery import Task
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.user import User
from app.services.sync_service import get_sync_service

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task class that provides database session management."""
    
    def __call__(self, *args, **kwargs):
        """Execute task with database session management."""
        db = SessionLocal()
        try:
            return self.run_with_db(db, *args, **kwargs)
        except Exception as e:
            logger.error(f"Task {self.name} failed: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()
    
    def run_with_db(self, db: Session, *args, **kwargs):
        """Override this method in subclasses."""
        raise NotImplementedError


class SyncUserAnimeTask(DatabaseTask):
    """Task class for syncing user anime data."""
    
    def run_with_db(self, db: Session, user_id: int, force_full_sync: bool = False) -> Dict[str, Any]:
        """
        Background task to synchronize anime data for a specific user.
        
        Args:
            db: Database session
            user_id: ID of user to sync
            force_full_sync: Whether to force a full sync regardless of last sync time
            
        Returns:
            Dictionary with sync results
        """
        logger.info(f"Starting anime sync task for user {user_id}")
        
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User {user_id} not found")
        
        if not user.mal_access_token:
            raise ValueError(f"User {user_id} has no MyAnimeList access token")
        
        # Check if sync is needed (unless forced)
        if not force_full_sync and user.last_mal_sync:
            time_since_sync = datetime.utcnow() - user.last_mal_sync
            if time_since_sync < timedelta(hours=1):
                logger.info(f"Skipping sync for user {user_id} - last sync was {time_since_sync} ago")
                return {
                    "user_id": user_id,
                    "skipped": True,
                    "reason": "Recent sync found",
                    "last_sync": user.last_mal_sync.isoformat()
                }
        
        # Perform sync
        sync_service = get_sync_service()
        try:
            result = asyncio.run(sync_service.sync_user_anime_data(db, user, force_full_sync))
            logger.info(f"Completed anime sync task for user {user_id}")
            return result
        except Exception as e:
            logger.error(f"Anime sync task failed for user {user_id}: {str(e)}")
            raise


# Register the task with Celery
sync_user_anime_task = celery_app.register_task(SyncUserAnimeTask())


class SyncAllUsersTask(DatabaseTask):
    """Task class for syncing all users' anime data."""
    
    def run_with_db(self, db: Session) -> Dict[str, Any]:
        """
        Background task to synchronize anime data for all users with MAL tokens.
        
        Args:
            db: Database session
            
        Returns:
            Dictionary with overall sync results
        """
        logger.info("Starting bulk anime sync task for all users")
        
        sync_service = get_sync_service()
        try:
            result = asyncio.run(sync_service.sync_all_users(db))
            logger.info("Completed bulk anime sync task for all users")
            return result
        except Exception as e:
            logger.error(f"Bulk anime sync task failed: {str(e)}")
            raise


# Register the task with Celery
sync_all_users_task = celery_app.register_task(SyncAllUsersTask())


class SyncActiveUsersTask(DatabaseTask):
    """Task class for syncing active users' anime data."""
    
    def run_with_db(self, db: Session, hours_threshold: int = 24) -> Dict[str, Any]:
        """
        Background task to synchronize anime data for recently active users.
        
        Args:
            db: Database session
            hours_threshold: Only sync users who haven't been synced in this many hours
            
        Returns:
            Dictionary with sync results
        """
        logger.info(f"Starting anime sync task for active users (threshold: {hours_threshold} hours)")
        
        # Find users who need syncing
        cutoff_time = datetime.utcnow() - timedelta(hours=hours_threshold)
        
        users_to_sync = db.query(User).filter(
            and_(
                User.mal_access_token.isnot(None),
                User.mal_refresh_token.isnot(None),
                or_(
                    User.last_mal_sync.is_(None),
                    User.last_mal_sync < cutoff_time
                )
            )
        ).all()
        
        logger.info(f"Found {len(users_to_sync)} users needing sync")
        
        sync_stats = {
            "started_at": datetime.utcnow(),
            "users_found": len(users_to_sync),
            "users_processed": 0,
            "users_succeeded": 0,
            "users_failed": 0,
            "tasks_queued": 0,
            "errors": []
        }
        
        # Queue individual sync tasks for each user
        for user in users_to_sync:
            try:
                # Queue async task for each user
                sync_user_anime_task.delay(user.id, force_full_sync=False)
                sync_stats["tasks_queued"] += 1
                logger.info(f"Queued sync task for user {user.id}")
            except Exception as e:
                error_msg = f"Failed to queue sync task for user {user.id}: {str(e)}"
                logger.error(error_msg)
                sync_stats["errors"].append(error_msg)
        
        sync_stats["completed_at"] = datetime.utcnow()
        sync_stats["duration"] = (sync_stats["completed_at"] - sync_stats["started_at"]).total_seconds()
        
        logger.info(f"Completed queuing sync tasks for active users. Stats: {sync_stats}")
        return sync_stats


# Register the task with Celery
sync_active_users_task = celery_app.register_task(SyncActiveUsersTask())


class SyncUserBatchTask(DatabaseTask):
    """Task class for syncing a batch of users' anime data."""
    
    def run_with_db(self, db: Session, user_ids: List[int], force_full_sync: bool = False) -> Dict[str, Any]:
        """
        Background task to synchronize anime data for a batch of users.
        
        Args:
            db: Database session
            user_ids: List of user IDs to sync
            force_full_sync: Whether to force full sync for all users
            
        Returns:
            Dictionary with batch sync results
        """
        logger.info(f"Starting batch anime sync task for {len(user_ids)} users")
        
        batch_stats = {
            "started_at": datetime.utcnow(),
            "user_ids": user_ids,
            "users_processed": 0,
            "users_succeeded": 0,
            "users_failed": 0,
            "total_anime_synced": 0,
            "errors": []
        }
        
        sync_service = get_sync_service()
        
        for user_id in user_ids:
            try:
                # Get user
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    error_msg = f"User {user_id} not found"
                    logger.warning(error_msg)
                    batch_stats["errors"].append(error_msg)
                    continue
                
                if not user.mal_access_token:
                    error_msg = f"User {user_id} has no MyAnimeList access token"
                    logger.warning(error_msg)
                    batch_stats["errors"].append(error_msg)
                    continue
                
                # Perform sync
                user_stats = asyncio.run(sync_service.sync_user_anime_data(db, user, force_full_sync))
                batch_stats["users_succeeded"] += 1
                batch_stats["total_anime_synced"] += user_stats["anime_fetched"]
                
            except Exception as e:
                error_msg = f"Failed to sync user {user_id}: {str(e)}"
                logger.error(error_msg)
                batch_stats["users_failed"] += 1
                batch_stats["errors"].append(error_msg)
            
            batch_stats["users_processed"] += 1
        
        batch_stats["completed_at"] = datetime.utcnow()
        batch_stats["duration"] = (batch_stats["completed_at"] - batch_stats["started_at"]).total_seconds()
        
        logger.info(f"Completed batch anime sync task. Stats: {batch_stats}")
        return batch_stats


# Register the task with Celery
sync_user_batch_task = celery_app.register_task(SyncUserBatchTask())



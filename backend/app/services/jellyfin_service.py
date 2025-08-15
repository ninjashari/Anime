"""
Jellyfin service for handling webhook integration and anime progress tracking.
"""
import logging
import hashlib
import hmac
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from ..models.user import User
from ..models.jellyfin_activity import JellyfinActivity
from ..models.user_anime_list import UserAnimeList
from ..models.anime import Anime
from ..schemas.jellyfin import (
    JellyfinWebhookPayload, 
    JellyfinActivityCreate, 
    WebhookProcessingResult,
    JellyfinMappingStats
)
from ..services.anidb_mapping_service import AniDBMappingService
from ..services.anime_list_service import get_anime_list_service
from ..schemas.anime_list import EpisodeProgressUpdate
from ..core.config import settings

logger = logging.getLogger(__name__)


class JellyfinService:
    """
    Service for handling Jellyfin webhook integration and automatic anime progress tracking.
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.anidb_mapping_service = AniDBMappingService(db)
        self.anime_list_service = get_anime_list_service()
        
    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify the webhook signature to ensure it's from Jellyfin.
        
        Args:
            payload: Raw webhook payload bytes
            signature: Signature from webhook headers
            
        Returns:
            True if signature is valid, False otherwise
        """
        if not settings.JELLYFIN_WEBHOOK_SECRET:
            logger.warning("JELLYFIN_WEBHOOK_SECRET not configured, skipping signature verification")
            return True
            
        # Calculate expected signature
        expected_signature = hmac.new(
            settings.JELLYFIN_WEBHOOK_SECRET.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Compare signatures (use hmac.compare_digest for timing attack protection)
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
        
    def extract_anidb_id(self, webhook_payload: JellyfinWebhookPayload) -> Optional[int]:
        """
        Extract AniDB ID from Jellyfin webhook payload.
        
        Args:
            webhook_payload: Parsed webhook payload
            
        Returns:
            AniDB ID if found, None otherwise
        """
        # Check provider IDs first
        if webhook_payload.provider_ids:
            # Common provider ID keys for AniDB
            anidb_keys = ['anidb', 'AniDB', 'tvdb', 'TVDB']  # Sometimes TVDB contains AniDB IDs
            
            for key in anidb_keys:
                if key in webhook_payload.provider_ids:
                    try:
                        anidb_id = int(webhook_payload.provider_ids[key])
                        logger.info(f"Found AniDB ID {anidb_id} in provider_ids['{key}']")
                        return anidb_id
                    except (ValueError, TypeError):
                        continue
        
        # Check metadata for AniDB ID
        if webhook_payload.metadata:
            metadata_keys = ['anidb_id', 'AniDBId', 'anidb', 'AniDB']
            
            for key in metadata_keys:
                if key in webhook_payload.metadata:
                    try:
                        anidb_id = int(webhook_payload.metadata[key])
                        logger.info(f"Found AniDB ID {anidb_id} in metadata['{key}']")
                        return anidb_id
                    except (ValueError, TypeError):
                        continue
        
        # Try to extract from series name or item name (fallback)
        # This is less reliable but might work for some naming conventions
        series_name = webhook_payload.series_name or webhook_payload.item_name
        if series_name:
            # Look for patterns like "[12345]" in the name
            import re
            anidb_pattern = r'\[(\d+)\]'
            match = re.search(anidb_pattern, series_name)
            if match:
                try:
                    anidb_id = int(match.group(1))
                    logger.info(f"Extracted AniDB ID {anidb_id} from series name pattern")
                    return anidb_id
                except ValueError:
                    pass
        
        logger.warning(f"Could not extract AniDB ID from webhook payload for item: {webhook_payload.item_name}")
        return None
        
    def calculate_episode_progress(self, webhook_payload: JellyfinWebhookPayload) -> Tuple[Optional[int], Optional[float]]:
        """
        Calculate episode progress from playback data.
        
        Args:
            webhook_payload: Parsed webhook payload
            
        Returns:
            Tuple of (watch_duration_seconds, completion_percentage)
        """
        watch_duration = None
        completion_percentage = None
        
        if webhook_payload.playback_position_ticks and webhook_payload.runtime_ticks:
            # Convert ticks to seconds (1 tick = 100 nanoseconds)
            TICKS_PER_SECOND = 10_000_000
            
            watch_duration = int(webhook_payload.playback_position_ticks / TICKS_PER_SECOND)
            total_duration = int(webhook_payload.runtime_ticks / TICKS_PER_SECOND)
            
            if total_duration > 0:
                completion_percentage = (watch_duration / total_duration) * 100
                completion_percentage = min(100.0, max(0.0, completion_percentage))  # Clamp to 0-100
                
        logger.info(f"Calculated progress: {watch_duration}s watched, {completion_percentage}% complete")
        return watch_duration, completion_percentage
        
    def find_user_by_jellyfin_username(self, jellyfin_username: str) -> Optional[User]:
        """
        Find internal user by Jellyfin username.
        For now, we'll assume the Jellyfin username matches our internal username.
        In a real implementation, you might want a mapping table.
        
        Args:
            jellyfin_username: Username from Jellyfin webhook
            
        Returns:
            User object if found, None otherwise
        """
        user = self.db.query(User).filter(User.username == jellyfin_username).first()
        if not user:
            logger.warning(f"No user found for Jellyfin username: {jellyfin_username}")
        return user
        
    def create_jellyfin_activity(self, activity_data: JellyfinActivityCreate) -> JellyfinActivity:
        """
        Create a new Jellyfin activity record.
        
        Args:
            activity_data: Activity data to create
            
        Returns:
            Created JellyfinActivity object
        """
        activity = JellyfinActivity(**activity_data.model_dump())
        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)
        
        logger.info(f"Created Jellyfin activity record: {activity.id}")
        return activity
        
    async def update_anime_list_from_activity(self, activity: JellyfinActivity) -> Optional[int]:
        """
        Update user's anime list based on Jellyfin activity.
        
        Args:
            activity: JellyfinActivity record
            
        Returns:
            Number of episodes updated, or None if update failed
        """
        if not activity.mal_id or not activity.episode_number:
            logger.warning(f"Cannot update anime list: missing MAL ID or episode number for activity {activity.id}")
            return None
            
        # Get the user
        user = self.db.query(User).filter(User.id == activity.user_id).first()
        if not user:
            logger.error(f"User not found for activity {activity.id}")
            return None
            
        # Get the anime from our database
        anime = self.db.query(Anime).filter(Anime.mal_id == activity.mal_id).first()
        if not anime:
            logger.warning(f"Anime with MAL ID {activity.mal_id} not found in database")
            return None
            
        # Get or create user anime list entry
        user_anime = self.db.query(UserAnimeList).filter(
            and_(
                UserAnimeList.user_id == user.id,
                UserAnimeList.anime_id == anime.id
            )
        ).first()
        
        if not user_anime:
            # Create new entry if user hasn't added this anime yet
            user_anime = UserAnimeList(
                user_id=user.id,
                anime_id=anime.id,
                status='watching',
                episodes_watched=0
            )
            self.db.add(user_anime)
            self.db.commit()
            self.db.refresh(user_anime)
            logger.info(f"Created new anime list entry for user {user.id}, anime {anime.id}")
        
        # Update episode progress if this episode is further than current progress
        episodes_updated = 0
        if activity.episode_number > user_anime.episodes_watched:
            # Only consider the episode "watched" if completion percentage is high enough
            completion_threshold = 80.0  # Consider episode watched if 80% or more is completed
            
            if (activity.completion_percentage is None or 
                activity.completion_percentage >= completion_threshold):
                
                old_episodes = user_anime.episodes_watched
                new_episodes = activity.episode_number
                
                # Update episode progress
                progress_update = EpisodeProgressUpdate(episodes_watched=new_episodes)
                
                try:
                    await self.anime_list_service.update_episode_progress(
                        self.db, user, anime.id, progress_update, sync_to_mal=True
                    )
                    
                    episodes_updated = new_episodes - old_episodes
                    logger.info(f"Updated episodes watched from {old_episodes} to {new_episodes} for user {user.id}, anime {anime.id}")
                    
                    # Update anime status if completed
                    if anime.episodes and new_episodes >= anime.episodes:
                        from ..schemas.anime_list import AnimeListItemUpdate
                        status_update = AnimeListItemUpdate(status='completed')
                        await self.anime_list_service.update_anime_status(
                            self.db, user, anime.id, status_update, sync_to_mal=True
                        )
                        logger.info(f"Marked anime {anime.id} as completed for user {user.id}")
                        
                except Exception as e:
                    logger.error(f"Failed to update anime list: {e}")
                    return None
            else:
                logger.info(f"Episode {activity.episode_number} not marked as watched due to low completion: {activity.completion_percentage}%")
        
        return episodes_updated
        
    async def process_webhook(self, webhook_payload: JellyfinWebhookPayload) -> WebhookProcessingResult:
        """
        Process a Jellyfin webhook payload and update anime progress.
        
        Args:
            webhook_payload: Parsed webhook payload
            
        Returns:
            Processing result with success status and details
        """
        errors = []
        
        try:
            # Find the user
            user = self.find_user_by_jellyfin_username(webhook_payload.user_name)
            if not user:
                return WebhookProcessingResult(
                    success=False,
                    message=f"User not found: {webhook_payload.user_name}",
                    errors=[f"No user found for Jellyfin username: {webhook_payload.user_name}"]
                )
            
            # Extract AniDB ID
            anidb_id = self.extract_anidb_id(webhook_payload)
            if not anidb_id:
                return WebhookProcessingResult(
                    success=False,
                    message="Could not extract AniDB ID from webhook payload",
                    errors=["AniDB ID not found in provider_ids or metadata"]
                )
            
            # Map AniDB ID to MyAnimeList ID
            mal_id = self.anidb_mapping_service.get_mal_id_from_anidb_id(anidb_id)
            if not mal_id:
                # Create unmapped entry for manual review
                self.anidb_mapping_service.create_mapping(
                    anidb_id=anidb_id,
                    title=webhook_payload.series_name or webhook_payload.item_name,
                    source='jellyfin_webhook'
                )
                
                return WebhookProcessingResult(
                    success=False,
                    message=f"No MyAnimeList mapping found for AniDB ID {anidb_id}",
                    anidb_id=anidb_id,
                    errors=[f"AniDB ID {anidb_id} not mapped to MyAnimeList ID"]
                )
            
            # Calculate progress
            watch_duration, completion_percentage = self.calculate_episode_progress(webhook_payload)
            
            # Create activity record
            activity_data = JellyfinActivityCreate(
                user_id=user.id,
                anidb_id=anidb_id,
                mal_id=mal_id,
                episode_number=webhook_payload.episode_number,
                watch_duration=watch_duration,
                total_duration=int(webhook_payload.runtime_ticks / 10_000_000) if webhook_payload.runtime_ticks else None,
                completion_percentage=completion_percentage,
                jellyfin_item_id=webhook_payload.item_id,
                processed=False
            )
            
            activity = self.create_jellyfin_activity(activity_data)
            
            # Update anime list
            episodes_updated = await self.update_anime_list_from_activity(activity)
            
            # Mark activity as processed
            activity.processed = True
            self.db.commit()
            
            return WebhookProcessingResult(
                success=True,
                message="Webhook processed successfully",
                activity_id=activity.id,
                anidb_id=anidb_id,
                mal_id=mal_id,
                episodes_updated=episodes_updated or 0
            )
            
        except Exception as e:
            logger.error(f"Error processing webhook: {e}")
            return WebhookProcessingResult(
                success=False,
                message=f"Error processing webhook: {str(e)}",
                errors=[str(e)]
            )
    
    def get_jellyfin_activities(
        self, 
        user_id: Optional[int] = None,
        processed: Optional[bool] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[JellyfinActivity]:
        """
        Get Jellyfin activities with optional filtering.
        
        Args:
            user_id: Filter by user ID (optional)
            processed: Filter by processed status (optional)
            limit: Maximum number of activities to return
            offset: Number of activities to skip
            
        Returns:
            List of JellyfinActivity objects
        """
        query = self.db.query(JellyfinActivity)
        
        if user_id is not None:
            query = query.filter(JellyfinActivity.user_id == user_id)
        if processed is not None:
            query = query.filter(JellyfinActivity.processed == processed)
            
        return query.order_by(JellyfinActivity.created_at.desc()).offset(offset).limit(limit).all()
    
    def get_mapping_statistics(self) -> JellyfinMappingStats:
        """
        Get statistics about Jellyfin activities and mappings.
        
        Returns:
            Statistics about Jellyfin integration
        """
        total_activities = self.db.query(JellyfinActivity).count()
        processed_activities = self.db.query(JellyfinActivity).filter(
            JellyfinActivity.processed == True
        ).count()
        unprocessed_activities = total_activities - processed_activities
        
        mapped_activities = self.db.query(JellyfinActivity).filter(
            JellyfinActivity.mal_id.isnot(None)
        ).count()
        unmapped_activities = self.db.query(JellyfinActivity).filter(
            JellyfinActivity.mal_id.is_(None)
        ).count()
        
        unique_series = self.db.query(JellyfinActivity.mal_id).filter(
            JellyfinActivity.mal_id.isnot(None)
        ).distinct().count()
        
        return JellyfinMappingStats(
            total_activities=total_activities,
            processed_activities=processed_activities,
            unprocessed_activities=unprocessed_activities,
            mapped_activities=mapped_activities,
            unmapped_activities=unmapped_activities,
            unique_series=unique_series
        )
    
    async def reprocess_failed_activities(self, limit: int = 50) -> Dict[str, Any]:
        """
        Reprocess failed/unprocessed Jellyfin activities.
        
        Args:
            limit: Maximum number of activities to reprocess
            
        Returns:
            Dictionary with reprocessing statistics
        """
        # Get unprocessed activities
        unprocessed = self.get_jellyfin_activities(
            processed=False,
            limit=limit
        )
        
        success_count = 0
        error_count = 0
        errors = []
        
        for activity in unprocessed:
            try:
                if activity.mal_id:
                    # Try to update anime list again
                    episodes_updated = await self.update_anime_list_from_activity(activity)
                    if episodes_updated is not None:
                        activity.processed = True
                        success_count += 1
                    else:
                        error_count += 1
                        errors.append(f"Activity {activity.id}: Failed to update anime list")
                else:
                    # Try to find mapping again
                    if activity.anidb_id:
                        mal_id = self.anidb_mapping_service.get_mal_id_from_anidb_id(activity.anidb_id)
                        if mal_id:
                            activity.mal_id = mal_id
                            episodes_updated = await self.update_anime_list_from_activity(activity)
                            if episodes_updated is not None:
                                activity.processed = True
                                success_count += 1
                            else:
                                error_count += 1
                                errors.append(f"Activity {activity.id}: Failed to update anime list after mapping")
                        else:
                            error_count += 1
                            errors.append(f"Activity {activity.id}: Still no mapping for AniDB ID {activity.anidb_id}")
                    else:
                        error_count += 1
                        errors.append(f"Activity {activity.id}: No AniDB ID available")
                        
            except Exception as e:
                error_count += 1
                errors.append(f"Activity {activity.id}: {str(e)}")
        
        self.db.commit()
        
        return {
            "processed_count": len(unprocessed),
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors[:10]  # Limit error list to avoid huge responses
        }


def get_jellyfin_service(db: Session) -> JellyfinService:
    """Get Jellyfin service instance."""
    return JellyfinService(db)
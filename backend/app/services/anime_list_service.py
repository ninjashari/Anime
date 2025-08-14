"""
Service for anime list management operations.
"""
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func

from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList
from app.schemas.anime_list import (
    AnimeListItemCreate, 
    AnimeListItemUpdate, 
    EpisodeProgressUpdate,
    BatchUpdateItem
)
from app.services.mal_service import get_mal_service


class AnimeListService:
    """Service for managing user anime lists."""
    
    def __init__(self):
        self.mal_service = None
    
    def _get_mal_service(self):
        """Lazy initialization of MAL service."""
        if self.mal_service is None:
            self.mal_service = get_mal_service()
        return self.mal_service
    
    def get_anime_lists_by_status(
        self, 
        db: Session, 
        user: User, 
        status: Optional[str] = None,
        page: int = 1,
        per_page: int = 50
    ) -> Tuple[List[UserAnimeList], int]:
        """Get user's anime lists filtered by status with pagination."""
        query = db.query(UserAnimeList).options(
            joinedload(UserAnimeList.anime)
        ).filter(UserAnimeList.user_id == user.id)
        
        if status:
            query = query.filter(UserAnimeList.status == status)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        items = query.order_by(UserAnimeList.updated_at.desc()).offset(offset).limit(per_page).all()
        
        return items, total
    
    def get_anime_list_item(
        self, 
        db: Session, 
        user: User, 
        anime_id: int
    ) -> Optional[UserAnimeList]:
        """Get a specific anime list item for a user."""
        return db.query(UserAnimeList).options(
            joinedload(UserAnimeList.anime)
        ).filter(
            and_(
                UserAnimeList.user_id == user.id,
                UserAnimeList.anime_id == anime_id
            )
        ).first()
    
    async def update_anime_status(
        self, 
        db: Session, 
        user: User, 
        anime_id: int, 
        update_data: AnimeListItemUpdate,
        sync_to_mal: bool = True
    ) -> UserAnimeList:
        """Update anime status in user's list and sync to MyAnimeList."""
        # Get the anime list item
        anime_list_item = self.get_anime_list_item(db, user, anime_id)
        if not anime_list_item:
            raise ValueError("Anime not found in user's list")
        
        # Update local data
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(anime_list_item, field, value)
        
        anime_list_item.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(anime_list_item)
        
        # Sync to MyAnimeList if requested and user has tokens
        if sync_to_mal and user.mal_access_token:
            try:
                access_token = await self.mal_service.ensure_valid_token(db, user)
                
                # Convert local status to MAL status format
                mal_status_map = {
                    'watching': 'watching',
                    'completed': 'completed',
                    'on_hold': 'on_hold',
                    'dropped': 'dropped',
                    'plan_to_watch': 'plan_to_watch'
                }
                
                mal_data = {}
                if anime_list_item.status:
                    mal_data['status'] = mal_status_map.get(anime_list_item.status)
                if anime_list_item.score:
                    mal_data['score'] = anime_list_item.score
                if anime_list_item.episodes_watched is not None:
                    mal_data['num_episodes_watched'] = anime_list_item.episodes_watched
                if anime_list_item.start_date:
                    mal_data['start_date'] = anime_list_item.start_date.isoformat()
                if anime_list_item.finish_date:
                    mal_data['finish_date'] = anime_list_item.finish_date.isoformat()
                if anime_list_item.notes:
                    mal_data['comments'] = anime_list_item.notes
                
                await self.mal_service.update_anime_list_status(
                    access_token,
                    anime_list_item.anime.mal_id,
                    **mal_data
                )
            except Exception as e:
                # Log the error but don't fail the local update
                print(f"Failed to sync to MyAnimeList: {e}")
        
        return anime_list_item
    
    async def update_episode_progress(
        self, 
        db: Session, 
        user: User, 
        anime_id: int, 
        progress_data: EpisodeProgressUpdate,
        sync_to_mal: bool = True
    ) -> UserAnimeList:
        """Update episode progress for an anime."""
        update_data = AnimeListItemUpdate(episodes_watched=progress_data.episodes_watched)
        return await self.update_anime_status(db, user, anime_id, update_data, sync_to_mal)
    
    async def remove_anime_from_list(
        self, 
        db: Session, 
        user: User, 
        anime_id: int,
        sync_to_mal: bool = True
    ) -> bool:
        """Remove anime from user's list and sync to MyAnimeList."""
        # Get the anime list item
        anime_list_item = self.get_anime_list_item(db, user, anime_id)
        if not anime_list_item:
            return False
        
        mal_id = anime_list_item.anime.mal_id
        
        # Remove from local database
        db.delete(anime_list_item)
        db.commit()
        
        # Sync to MyAnimeList if requested and user has tokens
        if sync_to_mal and user.mal_access_token:
            try:
                if self.mal_service is None:
                    self.mal_service = self._get_mal_service()
                access_token = await self.mal_service.ensure_valid_token(db, user)
                await self.mal_service.delete_anime_from_list(access_token, mal_id)
            except Exception as e:
                # Log the error but don't fail the local removal
                print(f"Failed to sync removal to MyAnimeList: {e}")
        
        return True
    
    async def batch_update_anime_list(
        self, 
        db: Session, 
        user: User, 
        updates: List[BatchUpdateItem],
        sync_to_mal: bool = True
    ) -> Dict[str, Any]:
        """Perform batch updates on anime list items."""
        success_count = 0
        error_count = 0
        errors = []
        
        for update_item in updates:
            try:
                # Create update data from the batch item
                update_data = AnimeListItemUpdate(
                    status=update_item.status,
                    score=update_item.score,
                    episodes_watched=update_item.episodes_watched
                )
                
                await self.update_anime_status(
                    db, user, update_item.anime_id, update_data, sync_to_mal
                )
                success_count += 1
                
            except Exception as e:
                error_count += 1
                errors.append(f"Anime ID {update_item.anime_id}: {str(e)}")
        
        return {
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        }
    
    def get_anime_list_stats(self, db: Session, user: User) -> Dict[str, Any]:
        """Get statistics about user's anime lists."""
        stats = {}
        
        # Count by status
        status_counts = db.query(
            UserAnimeList.status,
            func.count(UserAnimeList.id).label('count')
        ).filter(
            UserAnimeList.user_id == user.id
        ).group_by(UserAnimeList.status).all()
        
        stats['by_status'] = {status: count for status, count in status_counts}
        
        # Total anime count
        stats['total_anime'] = sum(stats['by_status'].values())
        
        # Total episodes watched
        total_episodes = db.query(
            func.sum(UserAnimeList.episodes_watched)
        ).filter(UserAnimeList.user_id == user.id).scalar() or 0
        
        stats['total_episodes_watched'] = total_episodes
        
        # Average score
        avg_score = db.query(
            func.avg(UserAnimeList.score)
        ).filter(
            and_(
                UserAnimeList.user_id == user.id,
                UserAnimeList.score.isnot(None)
            )
        ).scalar()
        
        stats['average_score'] = float(avg_score) if avg_score else None
        
        return stats


# Global service instance
anime_list_service = AnimeListService()


def get_anime_list_service() -> AnimeListService:
    """Get anime list service instance."""
    return anime_list_service
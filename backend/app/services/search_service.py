"""
Service for anime search functionality with caching and history.
"""
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList
from app.models.search_history import SearchHistory
from app.schemas.search import SearchAnimeResult, AddToListRequest
from app.services.mal_service import get_mal_service
from app.core.config import settings


class SearchCache:
    """Simple in-memory cache for search results."""
    
    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default TTL
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl_seconds = ttl_seconds
    
    def _get_cache_key(self, query: str, limit: int, offset: int) -> str:
        """Generate cache key for search parameters."""
        key_data = f"{query.lower().strip()}:{limit}:{offset}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, query: str, limit: int, offset: int) -> Optional[Dict[str, Any]]:
        """Get cached search results."""
        cache_key = self._get_cache_key(query, limit, offset)
        
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            # Check if cache is still valid
            if datetime.utcnow() - cached_data["timestamp"] < timedelta(seconds=self.ttl_seconds):
                return cached_data["data"]
            else:
                # Remove expired cache entry
                del self.cache[cache_key]
        
        return None
    
    def set(self, query: str, limit: int, offset: int, data: Dict[str, Any]) -> None:
        """Cache search results."""
        cache_key = self._get_cache_key(query, limit, offset)
        self.cache[cache_key] = {
            "data": data,
            "timestamp": datetime.utcnow()
        }
        
        # Simple cache cleanup - remove entries older than TTL
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.ttl_seconds)
        expired_keys = [
            key for key, value in self.cache.items()
            if value["timestamp"] < cutoff_time
        ]
        for key in expired_keys:
            del self.cache[key]


class SearchService:
    """Service for anime search functionality."""
    
    def __init__(self):
        self.mal_service = get_mal_service()
        self.cache = SearchCache(ttl_seconds=getattr(settings, 'SEARCH_CACHE_TTL', 300))
    
    async def search_anime(
        self,
        db: Session,
        user: User,
        query: str,
        limit: int = 10,
        offset: int = 0
    ) -> Tuple[List[SearchAnimeResult], int, bool]:
        """
        Search for anime using MyAnimeList API with caching.
        
        Returns:
            Tuple of (results, total_count, was_cached)
        """
        # Check cache first
        cached_result = self.cache.get(query, limit, offset)
        if cached_result:
            results = [SearchAnimeResult(**item) for item in cached_result["results"]]
            # Update user list status for cached results
            results = await self._update_user_list_status(db, user, results)
            return results, cached_result["total"], True
        
        # Get valid access token
        access_token = await self.mal_service.ensure_valid_token(db, user)
        
        # Search MyAnimeList API
        search_response = await self.mal_service.search_anime(
            access_token, query, limit, offset
        )
        
        # Process search results
        results = []
        for item in search_response.get("data", []):
            anime_data = item["node"]
            
            # Extract genres
            genres = [genre["name"] for genre in anime_data.get("genres", [])]
            
            # Extract studios
            studios = [studio["name"] for studio in anime_data.get("studios", [])]
            
            # Get main picture URL
            image_url = None
            if anime_data.get("main_picture"):
                image_url = anime_data["main_picture"].get("large") or anime_data["main_picture"].get("medium")
            
            result = SearchAnimeResult(
                mal_id=anime_data["id"],
                title=anime_data["title"],
                title_english=anime_data.get("alternative_titles", {}).get("en"),
                synopsis=anime_data.get("synopsis"),
                episodes=anime_data.get("num_episodes"),
                status=anime_data.get("status"),
                score=anime_data.get("mean"),
                rank=anime_data.get("rank"),
                popularity=anime_data.get("popularity"),
                image_url=image_url,
                media_type=anime_data.get("media_type"),
                source=anime_data.get("source"),
                rating=anime_data.get("rating"),
                start_date=anime_data.get("start_date"),
                end_date=anime_data.get("end_date"),
                genres=genres,
                studios=studios,
                in_user_list=False,  # Will be updated below
                user_list_status=None
            )
            results.append(result)
        
        # Update user list status
        results = await self._update_user_list_status(db, user, results)
        
        # Cache the results (without user-specific data)
        cache_data = {
            "results": [
                {
                    **result.model_dump(),
                    "in_user_list": False,  # Don't cache user-specific data
                    "user_list_status": None
                }
                for result in results
            ],
            "total": len(results)  # MAL doesn't provide total count
        }
        self.cache.set(query, limit, offset, cache_data)
        
        # Record search in history
        self._record_search_history(db, user, query, len(results))
        
        return results, len(results), False
    
    async def _update_user_list_status(
        self,
        db: Session,
        user: User,
        results: List[SearchAnimeResult]
    ) -> List[SearchAnimeResult]:
        """Update search results with user's list status."""
        if not results:
            return results
        
        # Get MAL IDs from results
        mal_ids = [result.mal_id for result in results]
        
        # Query user's anime list for these MAL IDs
        user_anime_query = (
            db.query(UserAnimeList, Anime)
            .join(Anime, UserAnimeList.anime_id == Anime.id)
            .filter(UserAnimeList.user_id == user.id)
            .filter(Anime.mal_id.in_(mal_ids))
        )
        
        user_anime_dict = {
            anime.mal_id: user_anime_list.status
            for user_anime_list, anime in user_anime_query.all()
        }
        
        # Update results with user list status
        for result in results:
            if result.mal_id in user_anime_dict:
                result.in_user_list = True
                result.user_list_status = user_anime_dict[result.mal_id]
        
        return results
    
    def _record_search_history(
        self,
        db: Session,
        user: User,
        query: str,
        result_count: int
    ) -> None:
        """Record search query in user's search history."""
        try:
            # Check if this exact query already exists for this user recently
            existing_search = (
                db.query(SearchHistory)
                .filter(SearchHistory.user_id == user.id)
                .filter(SearchHistory.query == query)
                .filter(SearchHistory.created_at >= datetime.utcnow() - timedelta(hours=1))
                .first()
            )
            
            if not existing_search:
                search_history = SearchHistory(
                    user_id=user.id,
                    query=query,
                    result_count=result_count
                )
                db.add(search_history)
                db.commit()
        except Exception:
            # Don't fail the search if history recording fails
            db.rollback()
    
    async def add_anime_to_list(
        self,
        db: Session,
        user: User,
        request: AddToListRequest
    ) -> Dict[str, Any]:
        """Add anime to user's list."""
        # First, ensure the anime exists in our database
        anime = db.query(Anime).filter(Anime.mal_id == request.mal_id).first()
        
        if not anime:
            # Fetch anime data from MyAnimeList and create local record
            access_token = await self.mal_service.ensure_valid_token(db, user)
            
            # Search for the specific anime to get its details
            search_response = await self.mal_service.search_anime(
                access_token, str(request.mal_id), limit=1
            )
            
            if not search_response.get("data"):
                return {"success": False, "message": "Anime not found"}
            
            anime_data = search_response["data"][0]["node"]
            
            # Create anime record
            anime = Anime(
                mal_id=anime_data["id"],
                title=anime_data["title"],
                title_english=anime_data.get("alternative_titles", {}).get("en"),
                synopsis=anime_data.get("synopsis"),
                episodes=anime_data.get("num_episodes"),
                status=anime_data.get("status"),
                score=anime_data.get("mean"),
                rank=anime_data.get("rank"),
                popularity=anime_data.get("popularity"),
                image_url=(
                    anime_data.get("main_picture", {}).get("large") or
                    anime_data.get("main_picture", {}).get("medium")
                )
            )
            db.add(anime)
            db.flush()  # Get the ID
        
        # Check if anime is already in user's list
        existing_list_item = (
            db.query(UserAnimeList)
            .filter(UserAnimeList.user_id == user.id)
            .filter(UserAnimeList.anime_id == anime.id)
            .first()
        )
        
        if existing_list_item:
            return {
                "success": False,
                "message": "Anime is already in your list",
                "anime_id": anime.id,
                "list_item_id": existing_list_item.id
            }
        
        # Create new list item
        list_item = UserAnimeList(
            user_id=user.id,
            anime_id=anime.id,
            status=request.status,
            score=request.score,
            episodes_watched=request.episodes_watched or 0
        )
        db.add(list_item)
        
        # Sync to MyAnimeList
        try:
            access_token = await self.mal_service.ensure_valid_token(db, user)
            await self.mal_service.update_anime_list_status(
                access_token,
                request.mal_id,
                status=request.status,
                score=request.score,
                num_episodes_watched=request.episodes_watched or 0
            )
        except Exception as e:
            # Don't fail the local operation if MAL sync fails
            print(f"Failed to sync to MyAnimeList: {e}")
        
        db.commit()
        
        return {
            "success": True,
            "message": "Anime added to your list successfully",
            "anime_id": anime.id,
            "list_item_id": list_item.id
        }
    
    def get_search_history(
        self,
        db: Session,
        user: User,
        limit: int = 20
    ) -> List[SearchHistory]:
        """Get user's search history."""
        return (
            db.query(SearchHistory)
            .filter(SearchHistory.user_id == user.id)
            .order_by(desc(SearchHistory.created_at))
            .limit(limit)
            .all()
        )
    
    def get_search_suggestions(
        self,
        db: Session,
        user: User,
        query_prefix: str = "",
        limit: int = 10
    ) -> List[str]:
        """Get search suggestions based on user's search history."""
        query_filter = SearchHistory.user_id == user.id
        
        if query_prefix:
            query_filter = query_filter & SearchHistory.query.ilike(f"{query_prefix}%")
        
        # Get most frequent queries
        suggestions = (
            db.query(SearchHistory.query, func.count(SearchHistory.query).label('count'))
            .filter(query_filter)
            .group_by(SearchHistory.query)
            .order_by(desc('count'), desc(SearchHistory.created_at))
            .limit(limit)
            .all()
        )
        
        return [suggestion.query for suggestion in suggestions]


# Global service instance
search_service = None


def get_search_service() -> SearchService:
    """Get or create search service instance."""
    global search_service
    if search_service is None:
        search_service = SearchService()
    return search_service
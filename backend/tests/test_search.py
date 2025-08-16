"""
Unit tests for anime search functionality.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList
from app.models.search_history import SearchHistory
from app.services.search_service import SearchService, SearchCache
from app.schemas.search import AddToListRequest, SearchAnimeResult


class TestSearchCache:
    """Test cases for SearchCache class."""
    
    def test_cache_key_generation(self):
        """Test cache key generation."""
        cache = SearchCache()
        key1 = cache._get_cache_key("naruto", 10, 0)
        key2 = cache._get_cache_key("NARUTO", 10, 0)
        key3 = cache._get_cache_key("naruto ", 10, 0)
        
        # Should be the same (case insensitive and trimmed)
        assert key1 == key2 == key3
        
        # Different parameters should generate different keys
        key4 = cache._get_cache_key("naruto", 20, 0)
        assert key1 != key4
    
    def test_cache_set_and_get(self):
        """Test cache set and get operations."""
        cache = SearchCache(ttl_seconds=60)
        test_data = {"results": [], "total": 0}
        
        # Initially should return None
        assert cache.get("naruto", 10, 0) is None
        
        # Set data
        cache.set("naruto", 10, 0, test_data)
        
        # Should return the cached data
        cached_data = cache.get("naruto", 10, 0)
        assert cached_data == test_data
    
    def test_cache_expiration(self):
        """Test cache expiration."""
        cache = SearchCache(ttl_seconds=0)  # Immediate expiration
        test_data = {"results": [], "total": 0}
        
        cache.set("naruto", 10, 0, test_data)
        
        # Should be expired immediately
        assert cache.get("naruto", 10, 0) is None


class TestSearchService:
    """Test cases for SearchService class."""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database session."""
        return MagicMock(spec=Session)
    
    @pytest.fixture
    def mock_user(self):
        """Mock user."""
        user = MagicMock(spec=User)
        user.id = 1
        user.mal_access_token = "test_token"
        user.mal_token_expires_at = datetime.utcnow() + timedelta(hours=1)
        return user
    
    @pytest.fixture
    def search_service(self):
        """Search service instance."""
        with patch('app.services.search_service.get_mal_service') as mock_mal:
            mock_mal.return_value = AsyncMock()
            service = SearchService()
            return service
    
    @pytest.mark.asyncio
    async def test_search_anime_success(self, search_service, mock_db, mock_user):
        """Test successful anime search."""
        # Mock MAL service response
        mock_mal_response = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Naruto",
                        "alternative_titles": {"en": "Naruto"},
                        "synopsis": "A ninja story",
                        "num_episodes": 220,
                        "status": "finished_airing",
                        "mean": 8.5,
                        "rank": 100,
                        "popularity": 50,
                        "main_picture": {"large": "http://example.com/image.jpg"},
                        "media_type": "tv",
                        "source": "manga",
                        "rating": "PG-13",
                        "start_date": "2002-10-03",
                        "end_date": "2007-02-08",
                        "genres": [{"name": "Action"}, {"name": "Adventure"}],
                        "studios": [{"name": "Pierrot"}]
                    }
                }
            ]
        }
        
        search_service.mal_service.ensure_valid_token.return_value = "test_token"
        search_service.mal_service.search_anime.return_value = mock_mal_response
        
        # Mock database query for user anime lists
        mock_db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = []
        
        results, total, cached = await search_service.search_anime(
            mock_db, mock_user, "naruto", 10, 0
        )
        
        assert len(results) == 1
        assert results[0].mal_id == 1
        assert results[0].title == "Naruto"
        assert results[0].title_english == "Naruto"
        assert results[0].genres == ["Action", "Adventure"]
        assert results[0].studios == ["Pierrot"]
        assert results[0].in_user_list is False
        assert total == 1
        assert cached is False
    
    @pytest.mark.asyncio
    async def test_search_anime_with_user_list_status(self, search_service, mock_db, mock_user):
        """Test search with anime in user's list."""
        # Mock MAL service response
        mock_mal_response = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Naruto",
                        "alternative_titles": {},
                        "genres": [],
                        "studios": []
                    }
                }
            ]
        }
        
        search_service.mal_service.ensure_valid_token.return_value = "test_token"
        search_service.mal_service.search_anime.return_value = mock_mal_response
        
        # Mock database query to return anime in user's list
        mock_anime = MagicMock()
        mock_anime.mal_id = 1
        mock_user_anime = MagicMock()
        mock_user_anime.status = "watching"
        
        mock_db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = [
            (mock_user_anime, mock_anime)
        ]
        
        results, total, cached = await search_service.search_anime(
            mock_db, mock_user, "naruto", 10, 0
        )
        
        assert len(results) == 1
        assert results[0].in_user_list is True
        assert results[0].user_list_status == "watching"
    
    @pytest.mark.asyncio
    async def test_search_anime_cached_result(self, search_service, mock_db, mock_user):
        """Test search with cached results."""
        # Set up cache with test data
        cached_data = {
            "results": [
                {
                    "mal_id": 1,
                    "title": "Naruto",
                    "title_english": None,
                    "synopsis": None,
                    "episodes": None,
                    "status": None,
                    "score": None,
                    "rank": None,
                    "popularity": None,
                    "image_url": None,
                    "media_type": None,
                    "source": None,
                    "rating": None,
                    "start_date": None,
                    "end_date": None,
                    "genres": [],
                    "studios": [],
                    "in_user_list": False,
                    "user_list_status": None
                }
            ],
            "total": 1
        }
        
        search_service.cache.set("naruto", 10, 0, cached_data)
        
        # Mock database query for user anime lists
        mock_db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = []
        
        results, total, cached = await search_service.search_anime(
            mock_db, mock_user, "naruto", 10, 0
        )
        
        assert len(results) == 1
        assert results[0].mal_id == 1
        assert total == 1
        assert cached is True
        
        # MAL service should not be called for cached results
        search_service.mal_service.search_anime.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_add_anime_to_list_new_anime(self, search_service, mock_db, mock_user):
        """Test adding new anime to user's list."""
        request = AddToListRequest(
            mal_id=1,
            status="plan_to_watch",
            score=None,
            episodes_watched=0
        )
        
        # Mock anime doesn't exist in database
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Mock MAL service response for anime details
        mock_mal_response = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Naruto",
                        "alternative_titles": {"en": "Naruto"},
                        "synopsis": "A ninja story",
                        "num_episodes": 220,
                        "status": "finished_airing",
                        "mean": 8.5,
                        "rank": 100,
                        "popularity": 50,
                        "main_picture": {"large": "http://example.com/image.jpg"}
                    }
                }
            ]
        }
        
        search_service.mal_service.ensure_valid_token.return_value = "test_token"
        search_service.mal_service.search_anime.return_value = mock_mal_response
        search_service.mal_service.update_anime_list_status.return_value = {}
        
        # Mock database operations
        mock_anime = MagicMock()
        mock_anime.id = 1
        mock_db.add.return_value = None
        mock_db.flush.return_value = None
        mock_db.commit.return_value = None
        
        # Mock that anime is not in user's list
        mock_db.query.return_value.filter.return_value.filter.return_value.first.side_effect = [
            None,  # Anime doesn't exist
            None   # Not in user's list
        ]
        
        result = await search_service.add_anime_to_list(mock_db, mock_user, request)
        
        assert result["success"] is True
        assert "added to your list successfully" in result["message"]
        
        # Verify database operations
        assert mock_db.add.call_count == 2  # Anime and UserAnimeList
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_add_anime_to_list_already_exists(self, search_service, mock_db, mock_user):
        """Test adding anime that's already in user's list."""
        request = AddToListRequest(
            mal_id=1,
            status="plan_to_watch"
        )
        
        # Mock anime exists in database
        mock_anime = MagicMock()
        mock_anime.id = 1
        mock_db.query.return_value.filter.return_value.first.return_value = mock_anime
        
        # Mock anime is already in user's list
        mock_list_item = MagicMock()
        mock_list_item.id = 1
        mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = mock_list_item
        
        result = await search_service.add_anime_to_list(mock_db, mock_user, request)
        
        assert result["success"] is False
        assert "already in your list" in result["message"]
        assert result["anime_id"] == 1
        assert result["list_item_id"] == 1
    
    def test_record_search_history(self, search_service, mock_db, mock_user):
        """Test recording search history."""
        # Mock no existing recent search
        mock_db.query.return_value.filter.return_value.filter.return_value.filter.return_value.first.return_value = None
        
        search_service._record_search_history(mock_db, mock_user, "naruto", 5)
        
        # Verify search history was added
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        
        # Get the added search history
        added_history = mock_db.add.call_args[0][0]
        assert isinstance(added_history, SearchHistory)
        assert added_history.user_id == mock_user.id
        assert added_history.query == "naruto"
        assert added_history.result_count == 5
    
    def test_record_search_history_duplicate_recent(self, search_service, mock_db, mock_user):
        """Test not recording duplicate recent search."""
        # Mock existing recent search
        mock_existing = MagicMock()
        mock_db.query.return_value.filter.return_value.filter.return_value.filter.return_value.first.return_value = mock_existing
        
        search_service._record_search_history(mock_db, mock_user, "naruto", 5)
        
        # Verify search history was not added
        mock_db.add.assert_not_called()
        mock_db.commit.assert_not_called()
    
    def test_get_search_history(self, search_service, mock_db, mock_user):
        """Test getting search history."""
        # Mock search history items
        mock_history = [MagicMock(), MagicMock()]
        mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = mock_history
        
        result = search_service.get_search_history(mock_db, mock_user, 20)
        
        assert result == mock_history
        mock_db.query.assert_called_with(SearchHistory)
    
    def test_get_search_suggestions(self, search_service, mock_db, mock_user):
        """Test getting search suggestions."""
        # Mock suggestion results
        mock_suggestion1 = MagicMock()
        mock_suggestion1.query = "naruto"
        mock_suggestion2 = MagicMock()
        mock_suggestion2.query = "naruto shippuden"
        
        mock_suggestions = [mock_suggestion1, mock_suggestion2]
        mock_db.query.return_value.filter.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = mock_suggestions
        
        result = search_service.get_search_suggestions(mock_db, mock_user, "nar", 10)
        
        assert result == ["naruto", "naruto shippuden"]
    
    def test_get_search_suggestions_no_prefix(self, search_service, mock_db, mock_user):
        """Test getting search suggestions without prefix."""
        mock_suggestions = []
        mock_db.query.return_value.filter.return_value.group_by.return_value.order_by.return_value.limit.return_value.all.return_value = mock_suggestions
        
        result = search_service.get_search_suggestions(mock_db, mock_user, "", 10)
        
        assert result == []


@pytest.mark.asyncio
async def test_search_service_mal_error_handling():
    """Test search service error handling for MAL API failures."""
    with patch('app.services.search_service.get_mal_service') as mock_mal:
        mock_mal.return_value = AsyncMock()
        service = SearchService()
        
        mock_db = MagicMock()
        mock_user = MagicMock()
        mock_user.id = 1
        
        # Mock MAL service to raise an exception
        service.mal_service.ensure_valid_token.side_effect = Exception("MAL API error")
        
        with pytest.raises(Exception, match="MAL API error"):
            await service.search_anime(mock_db, mock_user, "naruto", 10, 0)


def test_search_cache_cleanup():
    """Test search cache cleanup of expired entries."""
    cache = SearchCache(ttl_seconds=1)
    
    # Add some test data
    cache.set("query1", 10, 0, {"data": "test1"})
    cache.set("query2", 10, 0, {"data": "test2"})
    
    # Verify data is cached
    assert cache.get("query1", 10, 0) is not None
    assert cache.get("query2", 10, 0) is not None
    
    # Wait for expiration and add new data (triggers cleanup)
    import time
    time.sleep(1.1)
    cache.set("query3", 10, 0, {"data": "test3"})
    
    # Old data should be cleaned up
    assert cache.get("query1", 10, 0) is None
    assert cache.get("query2", 10, 0) is None
    # New data should still be there
    assert cache.get("query3", 10, 0) is not None
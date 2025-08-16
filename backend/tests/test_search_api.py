"""
API tests for anime search endpoints.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.models.user import User
from app.models.search_history import SearchHistory
from app.schemas.search import SearchAnimeResult


client = TestClient(app)


@pytest.fixture
def mock_current_user():
    """Mock current user for authentication."""
    user = MagicMock(spec=User)
    user.id = 1
    user.username = "testuser"
    user.name = "Test User"
    return user


@pytest.fixture
def mock_search_service():
    """Mock search service."""
    with patch('app.api.search.get_search_service') as mock:
        service = AsyncMock()
        mock.return_value = service
        yield service


@pytest.fixture
def auth_headers():
    """Mock authentication headers."""
    return {"Authorization": "Bearer test_token"}


class TestSearchAPI:
    """Test cases for search API endpoints."""
    
    @patch('app.core.auth.get_current_user')
    def test_search_anime_success(self, mock_auth, mock_search_service, auth_headers):
        """Test successful anime search."""
        # Mock authentication
        mock_user = MagicMock(id=1, username="testuser")
        mock_auth.return_value = mock_user
        
        # Mock search results
        mock_results = [
            SearchAnimeResult(
                mal_id=1,
                title="Naruto",
                title_english="Naruto",
                synopsis="A ninja story",
                episodes=220,
                status="finished_airing",
                score=8.5,
                rank=100,
                popularity=50,
                image_url="http://example.com/image.jpg",
                media_type="tv",
                source="manga",
                rating="PG-13",
                start_date="2002-10-03",
                end_date="2007-02-08",
                genres=["Action", "Adventure"],
                studios=["Pierrot"],
                in_user_list=False,
                user_list_status=None
            )
        ]
        
        mock_search_service.search_anime.return_value = (mock_results, 1, False)
        
        response = client.get(
            "/api/search/anime?query=naruto&limit=10&offset=0",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["query"] == "naruto"
        assert data["total"] == 1
        assert data["limit"] == 10
        assert data["offset"] == 0
        assert data["has_next"] is False
        assert data["cached"] is False
        assert len(data["results"]) == 1
        
        result = data["results"][0]
        assert result["mal_id"] == 1
        assert result["title"] == "Naruto"
        assert result["genres"] == ["Action", "Adventure"]
        assert result["in_user_list"] is False
    
    def test_search_anime_cached_result(self, mock_search_service, auth_headers):
        """Test search with cached results."""
        mock_results = [
            SearchAnimeResult(
                mal_id=1,
                title="Naruto",
                genres=[],
                studios=[],
                in_user_list=False
            )
        ]
        
        mock_search_service.search_anime.return_value = (mock_results, 1, True)
        
        response = client.get(
            "/api/search/anime?query=naruto",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["cached"] is True
    
    def test_search_anime_invalid_query(self, auth_headers):
        """Test search with invalid query parameters."""
        # Empty query
        response = client.get(
            "/api/search/anime?query=",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Query too long
        long_query = "a" * 101
        response = client.get(
            f"/api/search/anime?query={long_query}",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid limit
        response = client.get(
            "/api/search/anime?query=naruto&limit=0",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        response = client.get(
            "/api/search/anime?query=naruto&limit=51",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid offset
        response = client.get(
            "/api/search/anime?query=naruto&offset=-1",
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_search_anime_service_error(self, mock_search_service, auth_headers):
        """Test search with service error."""
        mock_search_service.search_anime.side_effect = Exception("Search failed")
        
        response = client.get(
            "/api/search/anime?query=naruto",
            headers=auth_headers
        )
        
        assert response.status_code == 500
        assert "Search failed" in response.json()["detail"]
    
    def test_search_anime_value_error(self, mock_search_service, auth_headers):
        """Test search with value error."""
        mock_search_service.search_anime.side_effect = ValueError("Invalid token")
        
        response = client.get(
            "/api/search/anime?query=naruto",
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Invalid token" in response.json()["detail"]
    
    def test_add_anime_to_list_success(self, mock_search_service, auth_headers):
        """Test successfully adding anime to list."""
        mock_search_service.add_anime_to_list.return_value = {
            "success": True,
            "message": "Anime added to your list successfully",
            "anime_id": 1,
            "list_item_id": 1
        }
        
        request_data = {
            "mal_id": 1,
            "status": "plan_to_watch",
            "score": 8,
            "episodes_watched": 0
        }
        
        response = client.post(
            "/api/search/anime/add",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "added to your list successfully" in data["message"]
        assert data["anime_id"] == 1
        assert data["list_item_id"] == 1
    
    def test_add_anime_to_list_already_exists(self, mock_search_service, auth_headers):
        """Test adding anime that's already in list."""
        mock_search_service.add_anime_to_list.return_value = {
            "success": False,
            "message": "Anime is already in your list",
            "anime_id": 1,
            "list_item_id": 1
        }
        
        request_data = {
            "mal_id": 1,
            "status": "plan_to_watch"
        }
        
        response = client.post(
            "/api/search/anime/add",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is False
        assert "already in your list" in data["message"]
    
    def test_add_anime_to_list_invalid_request(self, auth_headers):
        """Test adding anime with invalid request data."""
        # Missing mal_id
        response = client.post(
            "/api/search/anime/add",
            json={"status": "plan_to_watch"},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid status
        response = client.post(
            "/api/search/anime/add",
            json={"mal_id": 1, "status": "invalid_status"},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid score
        response = client.post(
            "/api/search/anime/add",
            json={"mal_id": 1, "status": "plan_to_watch", "score": 11},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Invalid episodes_watched
        response = client.post(
            "/api/search/anime/add",
            json={"mal_id": 1, "status": "plan_to_watch", "episodes_watched": -1},
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_add_anime_to_list_service_error(self, mock_search_service, auth_headers):
        """Test adding anime with service error."""
        mock_search_service.add_anime_to_list.side_effect = Exception("Add failed")
        
        request_data = {
            "mal_id": 1,
            "status": "plan_to_watch"
        }
        
        response = client.post(
            "/api/search/anime/add",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 500
        assert "Failed to add anime to list" in response.json()["detail"]
    
    def test_get_search_history_success(self, mock_search_service, auth_headers):
        """Test getting search history."""
        mock_history = [
            MagicMock(
                id=1,
                query="naruto",
                result_count=5,
                created_at=datetime(2023, 1, 1, 12, 0, 0)
            ),
            MagicMock(
                id=2,
                query="one piece",
                result_count=3,
                created_at=datetime(2023, 1, 1, 11, 0, 0)
            )
        ]
        
        mock_search_service.get_search_history.return_value = mock_history
        
        response = client.get(
            "/api/search/history?limit=20",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 2
        assert len(data["history"]) == 2
        
        assert data["history"][0]["id"] == 1
        assert data["history"][0]["query"] == "naruto"
        assert data["history"][0]["result_count"] == 5
    
    def test_get_search_history_invalid_limit(self, auth_headers):
        """Test getting search history with invalid limit."""
        response = client.get(
            "/api/search/history?limit=0",
            headers=auth_headers
        )
        assert response.status_code == 422
        
        response = client.get(
            "/api/search/history?limit=101",
            headers=auth_headers
        )
        assert response.status_code == 422
    
    def test_get_search_suggestions_success(self, mock_search_service, auth_headers):
        """Test getting search suggestions."""
        mock_search_service.get_search_suggestions.return_value = [
            "naruto",
            "naruto shippuden"
        ]
        
        response = client.get(
            "/api/search/suggestions?query=nar&limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["suggestions"] == ["naruto", "naruto shippuden"]
    
    def test_get_search_suggestions_no_query(self, mock_search_service, auth_headers):
        """Test getting search suggestions without query prefix."""
        mock_search_service.get_search_suggestions.return_value = [
            "naruto",
            "one piece",
            "attack on titan"
        ]
        
        response = client.get(
            "/api/search/suggestions",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["suggestions"]) == 3
    
    def test_clear_search_history_success(self, auth_headers):
        """Test clearing search history."""
        with patch('app.api.search.SearchHistory') as mock_history:
            mock_db = MagicMock()
            
            with patch('app.core.database.get_db') as mock_get_db:
                mock_get_db.return_value = mock_db
                mock_db.query.return_value.filter.return_value.delete.return_value = 5
                
                response = client.delete(
                    "/api/search/history",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert "cleared successfully" in data["message"]
                assert data["deleted_count"] == 5
                mock_db.commit.assert_called_once()
    
    def test_delete_search_history_item_success(self, auth_headers):
        """Test deleting specific search history item."""
        with patch('app.api.search.SearchHistory') as mock_history:
            mock_db = MagicMock()
            mock_history_item = MagicMock()
            
            with patch('app.core.database.get_db') as mock_get_db:
                mock_get_db.return_value = mock_db
                mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = mock_history_item
                
                response = client.delete(
                    "/api/search/history/1",
                    headers=auth_headers
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert "deleted successfully" in data["message"]
                mock_db.delete.assert_called_once_with(mock_history_item)
                mock_db.commit.assert_called_once()
    
    def test_delete_search_history_item_not_found(self, auth_headers):
        """Test deleting non-existent search history item."""
        with patch('app.api.search.SearchHistory'):
            mock_db = MagicMock()
            
            with patch('app.core.database.get_db') as mock_get_db:
                mock_get_db.return_value = mock_db
                mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
                
                response = client.delete(
                    "/api/search/history/999",
                    headers=auth_headers
                )
                
                assert response.status_code == 404
                assert "not found" in response.json()["detail"]
    
    def test_search_endpoints_require_authentication(self):
        """Test that search endpoints require authentication."""
        # Search anime
        response = client.get("/api/search/anime?query=naruto")
        assert response.status_code == 401
        
        # Add anime to list
        response = client.post(
            "/api/search/anime/add",
            json={"mal_id": 1, "status": "plan_to_watch"}
        )
        assert response.status_code == 401
        
        # Get search history
        response = client.get("/api/search/history")
        assert response.status_code == 401
        
        # Get search suggestions
        response = client.get("/api/search/suggestions")
        assert response.status_code == 401
        
        # Clear search history
        response = client.delete("/api/search/history")
        assert response.status_code == 401
        
        # Delete search history item
        response = client.delete("/api/search/history/1")
        assert response.status_code == 401
"""
Tests for anime list API endpoints.
"""
import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_anime(db_session: Session):
    """Create a sample anime."""
    anime = Anime(
        mal_id=12345,
        title="Test Anime",
        title_english="Test Anime English",
        synopsis="Test synopsis",
        episodes=24,
        status="finished_airing",
        score=8.5,
        rank=100,
        popularity=50,
        image_url="https://example.com/image.jpg"
    )
    db_session.add(anime)
    db_session.commit()
    db_session.refresh(anime)
    return anime


@pytest.fixture
def sample_anime_list_item(db_session: Session, test_user: User, sample_anime: Anime):
    """Create a sample anime list item."""
    item = UserAnimeList(
        user_id=test_user.id,
        anime_id=sample_anime.id,
        status="watching",
        score=8,
        episodes_watched=12,
        start_date=date(2024, 1, 1),
        notes="Great anime!"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


class TestAnimeListEndpoints:
    """Test cases for anime list API endpoints."""
    
    def test_get_anime_lists_success(
        self, 
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful retrieval of anime lists."""
        response = client.get("/api/anime-lists", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 1
        assert data["page"] == 1
        assert data["per_page"] == 50
        assert data["has_next"] is False
        assert data["has_prev"] is False
        assert len(data["items"]) == 1
        
        item = data["items"][0]
        assert item["status"] == "watching"
        assert item["score"] == 8
        assert item["episodes_watched"] == 12
        assert item["anime"]["title"] == "Test Anime"
    
    def test_get_anime_lists_with_status_filter(
        self, 
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test anime lists retrieval with status filter."""
        # Test with matching status
        response = client.get("/api/anime-lists?status=watching", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        
        # Test with non-matching status
        response = client.get("/api/anime-lists?status=completed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
    
    def test_get_anime_lists_invalid_status(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test anime lists retrieval with invalid status."""
        response = client.get("/api/anime-lists?status=invalid_status", headers=auth_headers)
        assert response.status_code == 400
        assert "Invalid status" in response.json()["detail"]
    
    def test_get_anime_lists_pagination(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test anime lists pagination."""
        response = client.get("/api/anime-lists?page=2&per_page=10", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 2
        assert data["per_page"] == 10
    
    def test_get_anime_list_item_success(
        self, 
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful retrieval of specific anime list item."""
        response = client.get(
            f"/api/anime-lists/{sample_anime_list_item.anime_id}", 
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "watching"
        assert data["score"] == 8
        assert data["episodes_watched"] == 12
        assert data["anime"]["title"] == "Test Anime"
    
    def test_get_anime_list_item_not_found(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test retrieval of non-existent anime list item."""
        response = client.get("/api/anime-lists/99999", headers=auth_headers)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]
    
    @patch('app.services.anime_list_service.get_mal_service')
    def test_update_anime_status_success(
        self, 
        mock_get_mal_service,
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful anime status update."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        mock_get_mal_service.return_value = mock_mal_service
        
        update_data = {
            "status": "completed",
            "score": 9,
            "episodes_watched": 24
        }
        
        response = client.put(
            f"/api/anime-lists/{sample_anime_list_item.anime_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "completed"
        assert data["score"] == 9
        assert data["episodes_watched"] == 24
    
    def test_update_anime_status_not_found(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test updating non-existent anime status."""
        update_data = {"status": "completed"}
        
        response = client.put(
            "/api/anime-lists/99999",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    def test_update_anime_status_invalid_data(
        self, 
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test updating anime status with invalid data."""
        # Invalid status
        update_data = {"status": "invalid_status"}
        
        response = client.put(
            f"/api/anime-lists/{sample_anime_list_item.anime_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('app.services.anime_list_service.get_mal_service')
    def test_update_episode_progress_success(
        self, 
        mock_get_mal_service,
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful episode progress update."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        mock_get_mal_service.return_value = mock_mal_service
        
        progress_data = {"episodes_watched": 20}
        
        response = client.put(
            f"/api/anime-lists/{sample_anime_list_item.anime_id}/progress",
            json=progress_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["episodes_watched"] == 20
    
    @patch('app.services.anime_list_service.get_mal_service')
    def test_remove_anime_from_list_success(
        self, 
        mock_get_mal_service,
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful anime removal from list."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.delete_anime_from_list.return_value = None
        mock_get_mal_service.return_value = mock_mal_service
        
        response = client.delete(
            f"/api/anime-lists/{sample_anime_list_item.anime_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "removed" in data["message"]
    
    def test_remove_anime_from_list_not_found(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test removing non-existent anime from list."""
        response = client.delete("/api/anime-lists/99999", headers=auth_headers)
        assert response.status_code == 404
    
    @patch('app.services.anime_list_service.get_mal_service')
    def test_batch_update_anime_list_success(
        self, 
        mock_get_mal_service,
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful batch update of anime list."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        mock_get_mal_service.return_value = mock_mal_service
        
        batch_data = {
            "updates": [
                {
                    "anime_id": sample_anime_list_item.anime_id,
                    "status": "completed",
                    "score": 9
                }
            ]
        }
        
        response = client.post(
            "/api/anime-lists/batch-update",
            json=batch_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success_count"] == 1
        assert data["error_count"] == 0
        assert len(data["errors"]) == 0
    
    def test_batch_update_empty_updates(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test batch update with empty updates list."""
        batch_data = {"updates": []}
        
        response = client.post(
            "/api/anime-lists/batch-update",
            json=batch_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "No updates provided" in response.json()["detail"]
    
    def test_batch_update_too_many_updates(
        self, 
        client: TestClient, 
        test_user: User,
        auth_headers: dict
    ):
        """Test batch update with too many updates."""
        # Create 101 updates (exceeds limit of 100)
        updates = [{"anime_id": i, "status": "completed"} for i in range(101)]
        batch_data = {"updates": updates}
        
        response = client.post(
            "/api/anime-lists/batch-update",
            json=batch_data,
            headers=auth_headers
        )
        
        assert response.status_code == 400
        assert "Too many updates" in response.json()["detail"]
    
    def test_get_anime_list_stats_success(
        self, 
        client: TestClient, 
        test_user: User,
        sample_anime_list_item: UserAnimeList,
        auth_headers: dict
    ):
        """Test successful retrieval of anime list statistics."""
        response = client.get("/api/anime-lists/stats/summary", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total_anime" in data
        assert "by_status" in data
        assert "total_episodes_watched" in data
        assert "average_score" in data
        
        assert data["total_anime"] == 1
        assert data["by_status"]["watching"] == 1
        assert data["total_episodes_watched"] == 12
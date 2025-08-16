"""
Tests for dashboard API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList


class TestDashboardEndpoints:
    """Test cases for dashboard API endpoints."""
    
    def test_get_dashboard_stats_unauthorized(self, client: TestClient):
        """Test dashboard stats endpoint without authentication."""
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 403
    
    def test_get_dashboard_stats_empty(self, client: TestClient, auth_headers: dict):
        """Test dashboard stats with no anime data."""
        response = client.get("/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        
        stats = data["data"]
        assert stats["total_anime_count"] == 0
        assert stats["total_episodes_watched"] == 0
        assert stats["time_spent_watching"]["minutes"] == 0
        assert stats["time_to_complete_planned"]["minutes"] == 0
        assert stats["mean_score"] is None
        assert len(stats["score_distribution"]) == 10
        assert all(item["count"] == 0 for item in stats["score_distribution"])
    
    def test_get_dashboard_stats_with_data(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session: Session, 
        test_user: User
    ):
        """Test dashboard stats with anime data."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        db_session.add_all([anime1, anime2])
        db_session.flush()
        
        # Add to user's lists
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="watching",
            episodes_watched=5
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            episodes_watched=24,
            score=8
        )
        db_session.add_all([list1, list2])
        db_session.commit()
        
        response = client.get("/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        stats = data["data"]
        assert stats["total_anime_count"] == 2
        assert stats["total_episodes_watched"] == 29
        assert stats["time_spent_watching"]["minutes"] == 696  # 29 * 24
        assert stats["mean_score"] == 8.0
        
        # Check status breakdown
        breakdown = stats["status_breakdown"]
        assert breakdown["watching"] == 1
        assert breakdown["completed"] == 1
        assert breakdown["on_hold"] == 0
        assert breakdown["dropped"] == 0
        assert breakdown["plan_to_watch"] == 0
    
    def test_get_anime_count_unauthorized(self, client: TestClient):
        """Test anime count endpoint without authentication."""
        response = client.get("/api/dashboard/stats/anime-count")
        assert response.status_code == 403
    
    def test_get_anime_count(self, client: TestClient, auth_headers: dict):
        """Test anime count endpoint."""
        response = client.get("/api/dashboard/stats/anime-count", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "total_anime_count" in data["data"]
        assert data["data"]["total_anime_count"] == 0
    
    def test_get_episodes_watched_unauthorized(self, client: TestClient):
        """Test episodes watched endpoint without authentication."""
        response = client.get("/api/dashboard/stats/episodes-watched")
        assert response.status_code == 403
    
    def test_get_episodes_watched(self, client: TestClient, auth_headers: dict):
        """Test episodes watched endpoint."""
        response = client.get("/api/dashboard/stats/episodes-watched", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "total_episodes_watched" in data["data"]
        assert data["data"]["total_episodes_watched"] == 0
    
    def test_get_time_spent_unauthorized(self, client: TestClient):
        """Test time spent endpoint without authentication."""
        response = client.get("/api/dashboard/stats/time-spent")
        assert response.status_code == 403
    
    def test_get_time_spent(self, client: TestClient, auth_headers: dict):
        """Test time spent endpoint."""
        response = client.get("/api/dashboard/stats/time-spent", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "time_spent_watching" in data["data"]
        
        time_data = data["data"]["time_spent_watching"]
        assert "minutes" in time_data
        assert "hours" in time_data
        assert "days" in time_data
        assert time_data["minutes"] == 0
    
    def test_get_mean_score_unauthorized(self, client: TestClient):
        """Test mean score endpoint without authentication."""
        response = client.get("/api/dashboard/stats/mean-score")
        assert response.status_code == 403
    
    def test_get_mean_score(self, client: TestClient, auth_headers: dict):
        """Test mean score endpoint."""
        response = client.get("/api/dashboard/stats/mean-score", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "mean_score" in data["data"]
        assert data["data"]["mean_score"] is None
    
    def test_get_score_distribution_unauthorized(self, client: TestClient):
        """Test score distribution endpoint without authentication."""
        response = client.get("/api/dashboard/stats/score-distribution")
        assert response.status_code == 403
    
    def test_get_score_distribution(self, client: TestClient, auth_headers: dict):
        """Test score distribution endpoint."""
        response = client.get("/api/dashboard/stats/score-distribution", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "score_distribution" in data["data"]
        
        distribution = data["data"]["score_distribution"]
        assert len(distribution) == 10
        for item in distribution:
            assert "score" in item
            assert "count" in item
            assert 1 <= item["score"] <= 10
            assert item["count"] == 0
    
    def test_get_status_breakdown_unauthorized(self, client: TestClient):
        """Test status breakdown endpoint without authentication."""
        response = client.get("/api/dashboard/stats/status-breakdown")
        assert response.status_code == 403
    
    def test_get_status_breakdown(self, client: TestClient, auth_headers: dict):
        """Test status breakdown endpoint."""
        response = client.get("/api/dashboard/stats/status-breakdown", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "status_breakdown" in data["data"]
        
        breakdown = data["data"]["status_breakdown"]
        expected_statuses = ["watching", "completed", "on_hold", "dropped", "plan_to_watch"]
        for status in expected_statuses:
            assert status in breakdown
            assert breakdown[status] == 0
    
    def test_get_score_distribution_with_data(
        self, 
        client: TestClient, 
        auth_headers: dict, 
        db_session: Session, 
        test_user: User
    ):
        """Test score distribution endpoint with actual score data."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        db_session.add_all([anime1, anime2])
        db_session.flush()
        
        # Add to user's lists with scores
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="completed",
            score=8
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            score=6
        )
        db_session.add_all([list1, list2])
        db_session.commit()
        
        response = client.get("/api/dashboard/stats/score-distribution", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        distribution = data["data"]["score_distribution"]
        
        # Find score 8 and 6 items
        score_8_item = next(item for item in distribution if item["score"] == 8)
        score_6_item = next(item for item in distribution if item["score"] == 6)
        
        assert score_8_item["count"] == 1
        assert score_6_item["count"] == 1
        
        # Other scores should have count 0
        for item in distribution:
            if item["score"] not in [6, 8]:
                assert item["count"] == 0
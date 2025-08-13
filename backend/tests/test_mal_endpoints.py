"""
Unit tests for MyAnimeList API endpoints.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User


class TestMALEndpoints:
    """Test cases for MyAnimeList API endpoints."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = TestClient(app)
        self.mock_user = MagicMock(spec=User)
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        self.mock_user.mal_access_token = "test_access_token"
        self.mock_user.mal_refresh_token = "test_refresh_token"
        self.mock_user.mal_token_expires_at = datetime.utcnow() + timedelta(hours=1)
    
    @patch('app.api.mal.get_mal_service')
    def test_get_auth_url_success(self, mock_get_service):
        """Test successful authorization URL generation."""
        mock_service = MagicMock()
        mock_service.generate_auth_url.return_value = "https://myanimelist.net/v1/oauth2/authorize?client_id=test"
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/auth-url")
        
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "state" in data
        assert data["auth_url"] == "https://myanimelist.net/v1/oauth2/authorize?client_id=test"
    
    @patch('app.api.mal.get_mal_service')
    def test_get_auth_url_configuration_error(self, mock_get_service):
        """Test authorization URL generation with configuration error."""
        mock_service = MagicMock()
        mock_service.generate_auth_url.side_effect = ValueError("API not configured")
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/auth-url")
        
        assert response.status_code == 500
        assert "MyAnimeList API not configured" in response.json()["detail"]
    
    @patch('app.api.mal.get_current_user')
    @patch('app.api.mal.get_db')
    @patch('app.api.mal.get_mal_service')
    def test_oauth_callback_success(self, mock_get_service, mock_get_db, mock_get_current_user):
        """Test successful OAuth callback handling."""
        mock_get_current_user.return_value = self.mock_user
        mock_get_db.return_value = MagicMock(spec=Session)
        
        mock_service = MagicMock()
        mock_token_data = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_service.exchange_code_for_tokens.return_value = mock_token_data
        mock_service.store_tokens.return_value = None
        mock_get_service.return_value = mock_service
        
        response = self.client.post(
            "/api/mal/callback",
            json={"code": "test_code", "state": "test_state"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "new_access_token"
        assert data["token_type"] == "Bearer"
    
    @patch('app.api.mal.get_current_user')
    @patch('app.api.mal.get_db')
    @patch('app.api.mal.get_mal_service')
    def test_get_user_info_success(self, mock_get_service, mock_get_db, mock_get_current_user):
        """Test successful user info retrieval."""
        mock_get_current_user.return_value = self.mock_user
        mock_get_db.return_value = MagicMock(spec=Session)
        
        mock_service = MagicMock()
        mock_user_info = {
            "id": 12345,
            "name": "TestUser",
            "picture": "https://example.com/picture.jpg"
        }
        mock_service.ensure_valid_token.return_value = "valid_token"
        mock_service.get_user_info.return_value = mock_user_info
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/user-info")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 12345
        assert data["name"] == "TestUser"
    
    @patch('app.api.mal.get_current_user')
    @patch('app.api.mal.get_db')
    @patch('app.api.mal.get_mal_service')
    def test_get_anime_list_success(self, mock_get_service, mock_get_db, mock_get_current_user):
        """Test successful anime list retrieval."""
        mock_get_current_user.return_value = self.mock_user
        mock_get_db.return_value = MagicMock(spec=Session)
        
        mock_service = MagicMock()
        mock_anime_list = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Test Anime"
                    },
                    "list_status": {
                        "status": "watching",
                        "score": 8
                    }
                }
            ]
        }
        mock_service.ensure_valid_token.return_value = "valid_token"
        mock_service.get_user_anime_list.return_value = mock_anime_list
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/animelist?status=watching&limit=50")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["node"]["title"] == "Test Anime"
    
    @patch('app.api.mal.get_current_user')
    def test_get_token_status_with_tokens(self, mock_get_current_user):
        """Test token status check with valid tokens."""
        mock_get_current_user.return_value = self.mock_user
        
        response = self.client.get("/api/mal/token-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_tokens"] is True
        assert data["is_expired"] is False
        assert data["expires_at"] is not None
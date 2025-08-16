"""
Unit tests for MyAnimeList API endpoints.
"""
import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.user import User
from app.core.auth import get_current_user
from app.core.database import get_db


class TestMALEndpoints:
    """Test cases for MyAnimeList API endpoints."""
    
    @classmethod
    def setup_class(cls):
        """Set up test client once for all tests."""
        cls.client = TestClient(app)
    
    def setup_method(self):
        """Set up test fixtures."""
        self.mock_user = MagicMock(spec=User)
        self.mock_user.id = 1
        self.mock_user.username = "testuser"
        self.mock_user.mal_access_token = "test_access_token"
        self.mock_user.mal_refresh_token = "test_refresh_token"
        self.mock_user.mal_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        self.mock_db = MagicMock(spec=Session)
        
        # Override FastAPI dependencies
        app.dependency_overrides[get_current_user] = lambda: self.mock_user
        app.dependency_overrides[get_db] = lambda: self.mock_db
    
    def teardown_method(self):
        """Clean up after each test."""
        # Clear dependency overrides
        app.dependency_overrides.clear()
    
    @classmethod
    def teardown_class(cls):
        """Clean up test client."""
        # Ensure dependency overrides are cleared
        app.dependency_overrides.clear()
    
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
    
    @patch('app.api.mal.get_mal_service')
    def test_oauth_callback_success(self, mock_get_service):
        """Test successful OAuth callback handling."""
        mock_service = MagicMock()
        mock_token_data = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_service.exchange_code_for_tokens = AsyncMock(return_value=mock_token_data)
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
    
    @patch('app.api.mal.get_mal_service')
    def test_get_user_info_success(self, mock_get_service):
        """Test successful user info retrieval."""
        mock_service = MagicMock()
        mock_user_info = {
            "id": 12345,
            "name": "TestUser",
            "picture": "https://example.com/picture.jpg"
        }
        mock_service.ensure_valid_token = AsyncMock(return_value="valid_token")
        mock_service.get_user_info = AsyncMock(return_value=mock_user_info)
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/user-info")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 12345
        assert data["name"] == "TestUser"
    
    @patch('app.api.mal.get_mal_service')
    def test_get_anime_list_success(self, mock_get_service):
        """Test successful anime list retrieval."""
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
        mock_service.ensure_valid_token = AsyncMock(return_value="valid_token")
        mock_service.get_user_anime_list = AsyncMock(return_value=mock_anime_list)
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/animelist?status=watching&limit=50")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["node"]["title"] == "Test Anime"
    
    def test_get_token_status_with_tokens(self):
        """Test token status check with valid tokens."""
        response = self.client.get("/api/mal/token-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_tokens"] is True
        assert data["is_expired"] is False
        assert data["expires_at"] is not None
    
    def test_get_token_status_with_expired_tokens(self):
        """Test token status check with expired tokens."""
        # Set token to be expired
        self.mock_user.mal_token_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        
        response = self.client.get("/api/mal/token-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_tokens"] is True
        assert data["is_expired"] is True
        assert data["expires_at"] is not None
    
    def test_get_token_status_without_tokens(self):
        """Test token status check without tokens."""
        # Set user to have no tokens
        self.mock_user.mal_access_token = None
        self.mock_user.mal_refresh_token = None
        self.mock_user.mal_token_expires_at = None
        
        response = self.client.get("/api/mal/token-status")
        
        assert response.status_code == 200
        data = response.json()
        assert data["has_tokens"] is False
        assert data["is_expired"] is False
        assert data["expires_at"] is None
    
    @patch('app.api.mal.get_mal_service')
    def test_refresh_token_success(self, mock_get_service):
        """Test successful token refresh."""
        mock_service = MagicMock()
        mock_token_data = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        mock_service.refresh_access_token = AsyncMock(return_value=mock_token_data)
        mock_service.store_tokens.return_value = None
        mock_get_service.return_value = mock_service
        
        response = self.client.post("/api/mal/refresh-token")
        
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "new_access_token"
        assert data["token_type"] == "Bearer"
    
    def test_refresh_token_without_refresh_token(self):
        """Test token refresh without refresh token."""
        # Set user to have no refresh token
        self.mock_user.mal_refresh_token = None
        
        response = self.client.post("/api/mal/refresh-token")
        
        assert response.status_code == 400
        assert "No refresh token available" in response.json()["detail"]
    
    @patch('app.api.mal.get_mal_service')
    def test_user_info_with_token_refresh(self, mock_get_service):
        """Test user info endpoint with automatic token refresh."""
        mock_service = MagicMock()
        mock_user_info = {
            "id": 12345,
            "name": "TestUser",
            "picture": "https://example.com/picture.jpg"
        }
        # First call returns refreshed token, second call returns user info
        mock_service.ensure_valid_token = AsyncMock(return_value="refreshed_token")
        mock_service.get_user_info = AsyncMock(return_value=mock_user_info)
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/user-info")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 12345
        assert data["name"] == "TestUser"
        
        # Verify that ensure_valid_token was called
        mock_service.ensure_valid_token.assert_called_once()
    
    @patch('app.api.mal.get_mal_service')
    def test_anime_list_with_authentication_error(self, mock_get_service):
        """Test anime list endpoint with authentication error."""
        mock_service = MagicMock()
        mock_service.ensure_valid_token = AsyncMock(side_effect=ValueError("No access token"))
        mock_get_service.return_value = mock_service
        
        response = self.client.get("/api/mal/animelist")
        
        assert response.status_code == 401
        assert "No access token" in response.json()["detail"]
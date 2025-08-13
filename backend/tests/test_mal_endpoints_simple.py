"""
Simple unit tests for MyAnimeList API endpoints.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient

from app.main import app


def test_get_auth_url_success():
    """Test successful authorization URL generation."""
    client = TestClient(app)
    
    with patch('app.api.mal.get_mal_service') as mock_get_service:
        mock_service = MagicMock()
        mock_service.generate_auth_url.return_value = "https://myanimelist.net/v1/oauth2/authorize?client_id=test"
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/mal/auth-url")
        
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "state" in data
        assert data["auth_url"] == "https://myanimelist.net/v1/oauth2/authorize?client_id=test"


def test_get_auth_url_configuration_error():
    """Test authorization URL generation with configuration error."""
    client = TestClient(app)
    
    with patch('app.api.mal.get_mal_service') as mock_get_service:
        mock_service = MagicMock()
        mock_service.generate_auth_url.side_effect = ValueError("API not configured")
        mock_get_service.return_value = mock_service
        
        response = client.get("/api/mal/auth-url")
        
        assert response.status_code == 500
        assert "MyAnimeList API not configured" in response.json()["detail"]
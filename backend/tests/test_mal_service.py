"""
Unit tests for MyAnimeList service.
"""
import asyncio
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.orm import Session

from app.services.mal_service import MyAnimeListService, RateLimiter
from app.models.user import User


class TestRateLimiter:
    """Test cases for RateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_allows_first_request(self):
        """Test that rate limiter allows the first request immediately."""
        limiter = RateLimiter(max_requests=1, time_window=1.0)
        
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should not have waited
        assert end_time - start_time < 0.1
    
    @pytest.mark.asyncio
    async def test_rate_limiter_enforces_limit(self):
        """Test that rate limiter enforces request limits."""
        limiter = RateLimiter(max_requests=1, time_window=1.0)
        
        # First request should be immediate
        await limiter.acquire()
        
        # Second request should wait
        start_time = asyncio.get_event_loop().time()
        await limiter.acquire()
        end_time = asyncio.get_event_loop().time()
        
        # Should have waited approximately 1 second
        assert end_time - start_time >= 0.9


class TestMyAnimeListService:
    """Test cases for MyAnimeListService class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        with patch('app.services.mal_service.settings') as mock_settings:
            mock_settings.MAL_CLIENT_ID = "test_client_id"
            mock_settings.MAL_CLIENT_SECRET = "test_client_secret"
            mock_settings.MAL_REDIRECT_URI = "http://localhost:3005/auth/callback"
            self.service = MyAnimeListService()
    
    def test_init_raises_error_without_credentials(self):
        """Test that service raises error when credentials are missing."""
        with patch('app.services.mal_service.settings') as mock_settings:
            mock_settings.MAL_CLIENT_ID = None
            mock_settings.MAL_CLIENT_SECRET = "secret"
            mock_settings.MAL_REDIRECT_URI = "uri"
            
            with pytest.raises(ValueError, match="MyAnimeList API credentials not configured"):
                MyAnimeListService()
    
    def test_generate_auth_url(self):
        """Test OAuth authorization URL generation."""
        state = "test_state_123"
        auth_url = self.service.generate_auth_url(state)
        
        assert "https://myanimelist.net/v1/oauth2/authorize" in auth_url
        assert "client_id=test_client_id" in auth_url
        assert "redirect_uri=http%3A%2F%2Flocalhost%3A3005%2Fauth%2Fcallback" in auth_url
        assert f"state={state}" in auth_url
        assert "scope=read+write" in auth_url
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_tokens_success(self):
        """Test successful token exchange."""
        mock_response = {
            "access_token": "test_access_token",
            "refresh_token": "test_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response_obj
            
            result = await self.service.exchange_code_for_tokens("test_code", "test_state")
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_refresh_access_token_success(self):
        """Test successful token refresh."""
        mock_response = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
            "token_type": "Bearer"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response_obj
            
            result = await self.service.refresh_access_token("test_refresh_token")
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_get_user_info_success(self):
        """Test successful user info retrieval."""
        mock_response = {
            "id": 12345,
            "name": "TestUser",
            "picture": "https://example.com/picture.jpg"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.request.return_value = mock_response_obj
            
            result = await self.service.get_user_info("test_access_token")
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_get_user_anime_list_success(self):
        """Test successful anime list retrieval."""
        mock_response = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Test Anime",
                        "main_picture": {"medium": "https://example.com/image.jpg"}
                    },
                    "list_status": {
                        "status": "watching",
                        "score": 8,
                        "num_episodes_watched": 5
                    }
                }
            ],
            "paging": {"next": "https://api.myanimelist.net/v2/users/@me/animelist?offset=100"}
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.request.return_value = mock_response_obj
            
            result = await self.service.get_user_anime_list("test_access_token", status="watching")
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_update_anime_list_status_success(self):
        """Test successful anime status update."""
        mock_response = {
            "status": "completed",
            "score": 9,
            "num_episodes_watched": 12
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.request.return_value = mock_response_obj
            
            result = await self.service.update_anime_list_status(
                "test_access_token",
                anime_id=1,
                status="completed",
                score=9,
                num_episodes_watched=12
            )
            
            assert result == mock_response
    
    @pytest.mark.asyncio
    async def test_search_anime_success(self):
        """Test successful anime search."""
        mock_response = {
            "data": [
                {
                    "node": {
                        "id": 1,
                        "title": "Search Result Anime",
                        "main_picture": {"medium": "https://example.com/image.jpg"},
                        "synopsis": "Test synopsis"
                    }
                }
            ]
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = MagicMock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.request.return_value = mock_response_obj
            
            result = await self.service.search_anime("test_access_token", "test query")
            
            assert result == mock_response
    
    def test_store_tokens(self):
        """Test token storage in user record."""
        mock_db = MagicMock(spec=Session)
        mock_user = MagicMock(spec=User)
        
        access_token = "test_access_token"
        refresh_token = "test_refresh_token"
        expires_in = 3600
        
        self.service.store_tokens(mock_db, mock_user, access_token, refresh_token, expires_in)
        
        assert mock_user.mal_access_token == access_token
        assert mock_user.mal_refresh_token == refresh_token
        assert isinstance(mock_user.mal_token_expires_at, datetime)
        mock_db.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ensure_valid_token_no_token(self):
        """Test ensure_valid_token raises error when user has no token."""
        mock_db = MagicMock(spec=Session)
        mock_user = MagicMock(spec=User)
        mock_user.mal_access_token = None
        
        with pytest.raises(ValueError, match="User has no MyAnimeList access token"):
            await self.service.ensure_valid_token(mock_db, mock_user)
    
    @pytest.mark.asyncio
    async def test_ensure_valid_token_valid_token(self):
        """Test ensure_valid_token returns token when it's still valid."""
        mock_db = MagicMock(spec=Session)
        mock_user = MagicMock(spec=User)
        mock_user.mal_access_token = "valid_token"
        mock_user.mal_token_expires_at = datetime.utcnow() + timedelta(hours=1)
        
        result = await self.service.ensure_valid_token(mock_db, mock_user)
        
        assert result == "valid_token"
    
    @pytest.mark.asyncio
    async def test_ensure_valid_token_expired_token_refresh_success(self):
        """Test ensure_valid_token refreshes expired token successfully."""
        mock_db = MagicMock(spec=Session)
        mock_user = MagicMock(spec=User)
        mock_user.mal_access_token = "expired_token"
        mock_user.mal_refresh_token = "refresh_token"
        mock_user.mal_token_expires_at = datetime.utcnow() - timedelta(minutes=1)
        
        mock_token_response = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600
        }
        
        def mock_store_tokens(db, user, access_token, refresh_token, expires_in):
            user.mal_access_token = access_token
        
        with patch.object(self.service, 'refresh_access_token', return_value=mock_token_response):
            with patch.object(self.service, 'store_tokens', side_effect=mock_store_tokens) as mock_store:
                result = await self.service.ensure_valid_token(mock_db, mock_user)
                
                assert result == "new_access_token"
                mock_store.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_ensure_valid_token_expired_no_refresh_token(self):
        """Test ensure_valid_token raises error when token is expired and no refresh token."""
        mock_db = MagicMock(spec=Session)
        mock_user = MagicMock(spec=User)
        mock_user.mal_access_token = "expired_token"
        mock_user.mal_refresh_token = None
        mock_user.mal_token_expires_at = datetime.utcnow() - timedelta(minutes=1)
        
        with pytest.raises(ValueError, match="Access token expired and no refresh token available"):
            await self.service.ensure_valid_token(mock_db, mock_user)
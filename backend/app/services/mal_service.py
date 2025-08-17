"""
MyAnimeList API integration service.
"""
import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    ExternalAPIError, 
    RateLimitError, 
    AuthenticationError,
    ConfigurationError,
    ValidationError
)
from app.core.logging import get_logger
from app.core.retry import RetryableHTTPClient, MAL_API_RETRY_CONFIG
from app.core.validation import ValidationUtils
from app.models.user import User

logger = get_logger("mal_service")


class RateLimiter:
    """Rate limiter for MyAnimeList API (1 request per second)."""
    
    def __init__(self, max_requests: int = 1, time_window: float = 1.0):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """Acquire permission to make a request."""
        async with self._lock:
            now = time.time()
            # Remove old requests outside the time window
            self.requests = [req_time for req_time in self.requests if now - req_time < self.time_window]
            
            if len(self.requests) >= self.max_requests:
                # Wait until we can make another request
                sleep_time = self.time_window - (now - self.requests[0])
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    # Remove the old request after waiting
                    self.requests.pop(0)
            
            self.requests.append(now)


class MyAnimeListService:
    """Service for interacting with MyAnimeList API."""
    
    def __init__(self):
        self.client_id = settings.MAL_CLIENT_ID
        self.redirect_uri = settings.MAL_REDIRECT_URI
        self.base_url = "https://api.myanimelist.net/v2"
        self.auth_url = "https://myanimelist.net/v1/oauth2"
        self.rate_limiter = RateLimiter()
        self.http_client = RetryableHTTPClient(config=MAL_API_RETRY_CONFIG)
        
        if not all([self.client_id, self.redirect_uri]):
            raise ConfigurationError("MyAnimeList API credentials not configured")
        
        logger.info("MyAnimeList service initialized")
    
    def generate_auth_url(self, state: str) -> str:
        """Generate OAuth 2.0 authorization URL."""
        if not state:
            raise ValidationError("State parameter is required for OAuth flow")
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "read write",
            "code_challenge_method": "plain",
            "code_challenge": state  # Using state as code challenge for simplicity
        }
        
        auth_url = f"{self.auth_url}/authorize?{urlencode(params)}"
        logger.info("Generated MAL OAuth URL", extra={"state": state})
        return auth_url
    
    async def exchange_code_for_tokens(self, code: str, state: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens."""
        if not code:
            raise ValidationError("Authorization code is required")
        if not state:
            raise ValidationError("State parameter is required")
        
        await self.rate_limiter.acquire()
        
        data = {
            "client_id": self.client_id,
            "code": code,
            "code_verifier": state,  # Using state as code verifier
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        try:
            response = await self.http_client.post(
                f"{self.auth_url}/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            token_data = response.json()
            logger.info("Successfully exchanged code for tokens", extra={"state": state})
            return token_data
            
        except httpx.HTTPStatusError as e:
            logger.error(
                "Failed to exchange code for tokens",
                extra={
                    "status_code": e.response.status_code,
                    "response_text": e.response.text,
                    "external_service": "MyAnimeList"
                }
            )
            raise ExternalAPIError(
                "Failed to exchange authorization code for tokens",
                service="MyAnimeList",
                status_code=e.response.status_code,
                response_data={"error": e.response.text}
            )
        except Exception as e:
            logger.error("Unexpected error during token exchange", exc_info=True)
            raise ExternalAPIError(
                "Unexpected error during token exchange",
                service="MyAnimeList"
            )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        if not refresh_token:
            raise ValidationError("Refresh token is required")
        
        await self.rate_limiter.acquire()
        
        data = {
            "client_id": self.client_id,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        try:
            response = await self.http_client.post(
                f"{self.auth_url}/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            token_data = response.json()
            logger.info("Successfully refreshed access token")
            return token_data
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.warning("Refresh token is invalid or expired")
                raise AuthenticationError("Refresh token is invalid or expired")
            
            logger.error(
                "Failed to refresh access token",
                extra={
                    "status_code": e.response.status_code,
                    "response_text": e.response.text,
                    "external_service": "MyAnimeList"
                }
            )
            raise ExternalAPIError(
                "Failed to refresh access token",
                service="MyAnimeList",
                status_code=e.response.status_code,
                response_data={"error": e.response.text}
            )
        except Exception as e:
            logger.error("Unexpected error during token refresh", exc_info=True)
            raise ExternalAPIError(
                "Unexpected error during token refresh",
                service="MyAnimeList"
            )
    
    async def _make_authenticated_request(
        self, 
        method: str, 
        endpoint: str, 
        access_token: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        use_form_data: bool = False
    ) -> Dict[str, Any]:
        """Make authenticated request to MyAnimeList API."""
        if not access_token:
            raise AuthenticationError("Access token is required")
        
        await self.rate_limiter.acquire()
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        # Use form-encoded data for list updates, JSON for other endpoints
        if use_form_data and data:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            request_data = data
            json_data = None
        else:
            headers["Content-Type"] = "application/json"
            request_data = None
            json_data = data
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        try:
            response = await self.http_client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                data=request_data,
                json=json_data
            )
            
            result = response.json()
            logger.debug(
                f"MAL API request successful: {method} {endpoint}",
                extra={
                    "method": method,
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "external_service": "MyAnimeList"
                }
            )
            return result
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                logger.warning("MAL access token is invalid or expired")
                raise AuthenticationError("Access token is invalid or expired")
            elif e.response.status_code == 429:
                retry_after = e.response.headers.get("Retry-After")
                logger.warning(
                    "MAL API rate limit exceeded",
                    extra={"retry_after": retry_after, "external_service": "MyAnimeList"}
                )
                raise RateLimitError(
                    "MyAnimeList API rate limit exceeded",
                    retry_after=int(retry_after) if retry_after else None
                )
            
            logger.error(
                f"MAL API request failed: {method} {endpoint}",
                extra={
                    "method": method,
                    "endpoint": endpoint,
                    "status_code": e.response.status_code,
                    "response_text": e.response.text,
                    "external_service": "MyAnimeList"
                }
            )
            raise ExternalAPIError(
                f"MyAnimeList API request failed: {e.response.status_code}",
                service="MyAnimeList",
                status_code=e.response.status_code,
                response_data={"error": e.response.text}
            )
        except Exception as e:
            logger.error(
                f"Unexpected error during MAL API request: {method} {endpoint}",
                exc_info=True
            )
            raise ExternalAPIError(
                "Unexpected error during MyAnimeList API request",
                service="MyAnimeList"
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Get user information from MyAnimeList."""
        return await self._make_authenticated_request(
            "GET", 
            "/users/@me", 
            access_token
        )
    
    async def get_user_anime_list(
        self, 
        access_token: str, 
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get user's anime list from MyAnimeList."""
        params = {
            "fields": "list_status,num_episodes,mean,rank,popularity,nsfw,created_at,updated_at,media_type,status,genres,my_list_status,num_episodes,start_season,broadcast,source,average_episode_duration,rating,pictures,background,related_anime,related_manga,recommendations,studios,statistics",
            "limit": limit,
            "offset": offset
        }
        
        if status:
            params["status"] = status
        
        return await self._make_authenticated_request(
            "GET",
            "/users/@me/animelist",
            access_token,
            params=params
        )
    
    async def update_anime_list_status(
        self,
        access_token: str,
        anime_id: int,
        status: Optional[str] = None,
        score: Optional[int] = None,
        num_episodes_watched: Optional[int] = None,
        start_date: Optional[str] = None,
        finish_date: Optional[str] = None,
        comments: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update anime status in user's MyAnimeList."""
        # Validate inputs
        anime_id = ValidationUtils.validate_mal_id(anime_id)
        if status:
            status = ValidationUtils.validate_anime_status(status)
        if score is not None:
            score = ValidationUtils.validate_anime_score(score)
        if num_episodes_watched is not None:
            num_episodes_watched = ValidationUtils.validate_episode_count(num_episodes_watched)
        
        data = {}
        
        if status:
            data["status"] = status
        if score is not None:
            data["score"] = score
        if num_episodes_watched is not None:
            data["num_episodes_watched"] = num_episodes_watched
        if start_date:
            data["start_date"] = start_date
        if finish_date:
            data["finish_date"] = finish_date
        if comments:
            data["comments"] = comments
        
        if not data:
            raise ValidationError("At least one field must be provided for update")
        
        logger.info(
            f"Updating anime {anime_id} status on MAL",
            extra={"anime_id": anime_id, "updates": list(data.keys())}
        )
        
        return await self._make_authenticated_request(
            "PUT",
            f"/anime/{anime_id}/my_list_status",
            access_token,
            data=data
        )
    
    async def delete_anime_from_list(self, access_token: str, anime_id: int) -> None:
        """Remove anime from user's MyAnimeList."""
        await self._make_authenticated_request(
            "DELETE",
            f"/anime/{anime_id}/my_list_status",
            access_token
        )
    
    async def search_anime(
        self, 
        access_token: str, 
        query: str, 
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search for anime on MyAnimeList."""
        # Validate inputs
        query = ValidationUtils.validate_search_query(query)
        offset, limit = ValidationUtils.validate_pagination(offset, limit)
        
        params = {
            "q": query,
            "limit": limit,
            "offset": offset,
            "fields": "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,status,genres,media_type,source,average_episode_duration,rating,studios"
        }
        
        logger.info(
            f"Searching anime on MAL: '{query}'",
            extra={"query": query, "limit": limit, "offset": offset}
        )
        
        return await self._make_authenticated_request(
            "GET",
            "/anime",
            access_token,
            params=params
        )
    
    def store_tokens(
        self, 
        db: Session, 
        user: User, 
        access_token: str, 
        refresh_token: str, 
        expires_in: int
    ) -> None:
        """Store MyAnimeList tokens in user record."""
        user.mal_access_token = access_token
        user.mal_refresh_token = refresh_token
        user.mal_token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        db.commit()
    
    async def ensure_valid_token(self, db: Session, user: User) -> str:
        """Ensure user has a valid access token, refresh if necessary."""
        if not user.mal_access_token:
            raise AuthenticationError("User has no MyAnimeList access token")
        
        # Check if token is expired (with 5 minute buffer)
        if user.mal_token_expires_at:
            from datetime import timezone
            now = datetime.now(timezone.utc) + timedelta(minutes=5)
            expires_at = user.mal_token_expires_at
            if expires_at.tzinfo is None:
                # If stored datetime is naive, assume it's UTC
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            if expires_at <= now:
                if not user.mal_refresh_token:
                    raise AuthenticationError("Access token expired and no refresh token available")
                
                logger.info(f"Refreshing expired MAL token for user {user.id}")
                
                try:
                    # Refresh the token
                    token_data = await self.refresh_access_token(user.mal_refresh_token)
                    self.store_tokens(
                        db, 
                        user, 
                        token_data["access_token"], 
                        token_data.get("refresh_token", user.mal_refresh_token),
                        token_data["expires_in"]
                    )
                    logger.info(f"Successfully refreshed MAL token for user {user.id}")
                except Exception as e:
                    logger.error(f"Failed to refresh MAL token for user {user.id}", exc_info=True)
                    raise
        
        return user.mal_access_token


# Global service instance - will be initialized when needed
mal_service = None


def get_mal_service() -> MyAnimeListService:
    """Get or create MyAnimeList service instance."""
    global mal_service
    if mal_service is None:
        mal_service = MyAnimeListService()
    return mal_service
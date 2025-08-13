"""
MyAnimeList API integration service.
"""
import asyncio
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User


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
        self.client_secret = settings.MAL_CLIENT_SECRET
        self.redirect_uri = settings.MAL_REDIRECT_URI
        self.base_url = "https://api.myanimelist.net/v2"
        self.auth_url = "https://myanimelist.net/v1/oauth2"
        self.rate_limiter = RateLimiter()
        
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            raise ValueError("MyAnimeList API credentials not configured")
    
    def generate_auth_url(self, state: str) -> str:
        """Generate OAuth 2.0 authorization URL."""
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": "read write",
            "code_challenge_method": "plain",
            "code_challenge": state  # Using state as code challenge for simplicity
        }
        return f"{self.auth_url}/authorize?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str, state: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens."""
        await self.rate_limiter.acquire()
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "code_verifier": state,  # Using state as code verifier
            "grant_type": "authorization_code",
            "redirect_uri": self.redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        await self.rate_limiter.acquire()
        
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_url}/token",
                data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            return response.json()
    
    async def _make_authenticated_request(
        self, 
        method: str, 
        endpoint: str, 
        access_token: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make authenticated request to MyAnimeList API."""
        await self.rate_limiter.acquire()
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=data
            )
            response.raise_for_status()
            return response.json()
    
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
        
        return await self._make_authenticated_request(
            "PATCH",
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
        params = {
            "q": query,
            "limit": limit,
            "offset": offset,
            "fields": "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,status,genres,media_type,source,average_episode_duration,rating,studios"
        }
        
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
        user.mal_token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        db.commit()
    
    async def ensure_valid_token(self, db: Session, user: User) -> str:
        """Ensure user has a valid access token, refresh if necessary."""
        if not user.mal_access_token:
            raise ValueError("User has no MyAnimeList access token")
        
        # Check if token is expired (with 5 minute buffer)
        if user.mal_token_expires_at and user.mal_token_expires_at <= datetime.utcnow() + timedelta(minutes=5):
            if not user.mal_refresh_token:
                raise ValueError("Access token expired and no refresh token available")
            
            # Refresh the token
            token_data = await self.refresh_access_token(user.mal_refresh_token)
            self.store_tokens(
                db, 
                user, 
                token_data["access_token"], 
                token_data.get("refresh_token", user.mal_refresh_token),
                token_data["expires_in"]
            )
        
        return user.mal_access_token


# Global service instance - will be initialized when needed
mal_service = None


def get_mal_service() -> MyAnimeListService:
    """Get or create MyAnimeList service instance."""
    global mal_service
    if mal_service is None:
        mal_service = MyAnimeListService()
    return mal_service
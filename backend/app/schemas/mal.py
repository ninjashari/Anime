"""
MyAnimeList API schemas for request/response validation.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MALAuthUrlResponse(BaseModel):
    """Response schema for MyAnimeList authorization URL."""
    auth_url: str
    state: str


class MALTokenRequest(BaseModel):
    """Request schema for MyAnimeList token exchange."""
    code: str
    state: str


class MALTokenResponse(BaseModel):
    """Response schema for MyAnimeList token data."""
    access_token: str
    refresh_token: str
    expires_in: int
    token_type: str = "Bearer"


class MALUserInfo(BaseModel):
    """MyAnimeList user information schema."""
    id: int
    name: str
    picture: Optional[str] = None
    gender: Optional[str] = None
    birthday: Optional[str] = None
    location: Optional[str] = None
    joined_at: Optional[datetime] = None


class MALAnimePicture(BaseModel):
    """MyAnimeList anime picture schema."""
    medium: Optional[str] = None
    large: Optional[str] = None


class MALAnimeAlternativeTitles(BaseModel):
    """MyAnimeList anime alternative titles schema."""
    synonyms: List[str] = []
    en: Optional[str] = None
    ja: Optional[str] = None


class MALAnimeGenre(BaseModel):
    """MyAnimeList anime genre schema."""
    id: int
    name: str


class MALAnimeStudio(BaseModel):
    """MyAnimeList anime studio schema."""
    id: int
    name: str


class MALAnimeListStatus(BaseModel):
    """MyAnimeList anime list status schema."""
    status: str
    score: int = 0
    num_episodes_watched: int = 0
    is_rewatching: bool = False
    start_date: Optional[str] = None
    finish_date: Optional[str] = None
    priority: int = 0
    num_times_rewatched: int = 0
    rewatch_value: int = 0
    tags: List[str] = []
    comments: str = ""
    updated_at: Optional[datetime] = None


class MALAnime(BaseModel):
    """MyAnimeList anime schema."""
    id: int
    title: str
    main_picture: Optional[MALAnimePicture] = None
    alternative_titles: Optional[MALAnimeAlternativeTitles] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    synopsis: Optional[str] = None
    mean: Optional[float] = None
    rank: Optional[int] = None
    popularity: Optional[int] = None
    num_episodes: Optional[int] = None
    status: Optional[str] = None
    genres: List[MALAnimeGenre] = []
    media_type: Optional[str] = None
    source: Optional[str] = None
    average_episode_duration: Optional[int] = None
    rating: Optional[str] = None
    studios: List[MALAnimeStudio] = []
    my_list_status: Optional[MALAnimeListStatus] = None


class MALAnimeListItem(BaseModel):
    """MyAnimeList anime list item schema."""
    node: MALAnime
    list_status: Optional[MALAnimeListStatus] = None


class MALAnimeListResponse(BaseModel):
    """MyAnimeList anime list response schema."""
    data: List[MALAnimeListItem]
    paging: Optional[Dict[str, Any]] = None


class MALAnimeSearchResponse(BaseModel):
    """MyAnimeList anime search response schema."""
    data: List[MALAnimeListItem]
    paging: Optional[Dict[str, Any]] = None


class MALUpdateAnimeStatusRequest(BaseModel):
    """Request schema for updating anime status."""
    status: Optional[str] = Field(None, pattern="^(watching|completed|on_hold|dropped|plan_to_watch)$")
    score: Optional[int] = Field(None, ge=0, le=10)
    num_episodes_watched: Optional[int] = Field(None, ge=0)
    start_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    finish_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    comments: Optional[str] = None


class MALSearchRequest(BaseModel):
    """Request schema for anime search."""
    query: str = Field(..., min_length=1, max_length=100)
    limit: Optional[int] = Field(10, ge=1, le=100)
    offset: Optional[int] = Field(0, ge=0)


class MALAnimeListRequest(BaseModel):
    """Request schema for getting anime list."""
    status: Optional[str] = Field(None, pattern="^(watching|completed|on_hold|dropped|plan_to_watch)$")
    limit: Optional[int] = Field(100, ge=1, le=1000)
    offset: Optional[int] = Field(0, ge=0)
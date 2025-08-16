"""
Schemas for anime search functionality.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class SearchRequest(BaseModel):
    """Request schema for anime search."""
    query: str = Field(..., min_length=1, max_length=100, description="Search query")
    limit: Optional[int] = Field(10, ge=1, le=50, description="Number of results to return")
    offset: Optional[int] = Field(0, ge=0, description="Number of results to skip")


class SearchAnimeResult(BaseModel):
    """Schema for individual anime search result."""
    mal_id: int
    title: str
    title_english: Optional[str] = None
    synopsis: Optional[str] = None
    episodes: Optional[int] = None
    status: Optional[str] = None
    score: Optional[float] = None
    rank: Optional[int] = None
    popularity: Optional[int] = None
    image_url: Optional[str] = None
    media_type: Optional[str] = None
    source: Optional[str] = None
    rating: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    genres: List[str] = []
    studios: List[str] = []
    in_user_list: bool = False
    user_list_status: Optional[str] = None


class SearchResponse(BaseModel):
    """Response schema for anime search."""
    results: List[SearchAnimeResult]
    total: int
    query: str
    limit: int
    offset: int
    has_next: bool
    cached: bool = False


class AddToListRequest(BaseModel):
    """Request schema for adding anime to user list."""
    mal_id: int = Field(..., description="MyAnimeList anime ID")
    status: str = Field(..., description="Initial status for the anime")
    score: Optional[int] = Field(None, ge=0, le=10, description="Initial score (0-10)")
    episodes_watched: Optional[int] = Field(0, ge=0, description="Initial episodes watched")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class AddToListResponse(BaseModel):
    """Response schema for adding anime to user list."""
    success: bool
    message: str
    anime_id: Optional[int] = None
    list_item_id: Optional[int] = None


class SearchHistoryItem(BaseModel):
    """Schema for search history item."""
    id: int
    query: str
    result_count: int
    created_at: datetime


class SearchHistoryResponse(BaseModel):
    """Response schema for search history."""
    history: List[SearchHistoryItem]
    total: int


class SearchSuggestionResponse(BaseModel):
    """Response schema for search suggestions."""
    suggestions: List[str]
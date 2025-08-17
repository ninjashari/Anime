"""
Schemas for anime list management operations.
"""
from datetime import date
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict


class AnimeListItemBase(BaseModel):
    """Base schema for anime list items."""
    status: str = Field(..., description="Anime status")
    score: Optional[int] = Field(None, ge=0, le=10, description="User score (0-10)")
    episodes_watched: int = Field(0, ge=0, description="Number of episodes watched")
    start_date: Optional[date] = Field(None, description="Date started watching")
    finish_date: Optional[date] = Field(None, description="Date finished watching")
    notes: Optional[str] = Field(None, description="User notes")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
        if v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class AnimeListItemCreate(AnimeListItemBase):
    """Schema for creating anime list items."""
    anime_id: int = Field(..., description="Anime ID")


class AnimeListItemUpdate(BaseModel):
    """Schema for updating anime list items."""
    status: Optional[str] = Field(None, description="Anime status")
    score: Optional[int] = Field(None, ge=0, le=10, description="User score (0-10)")
    episodes_watched: Optional[int] = Field(None, ge=0, description="Number of episodes watched")
    start_date: Optional[date] = Field(None, description="Date started watching")
    finish_date: Optional[date] = Field(None, description="Date finished watching")
    notes: Optional[str] = Field(None, description="User notes")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class AnimeInfo(BaseModel):
    """Schema for anime information."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    mal_id: int
    title: str
    title_english: Optional[str]
    synopsis: Optional[str]
    episodes: Optional[int]
    status: Optional[str]
    aired_from: Optional[date]
    aired_to: Optional[date]
    start_season_year: Optional[int]
    start_season_season: Optional[str]
    score: Optional[float]
    rank: Optional[int]
    popularity: Optional[int]
    image_url: Optional[str]


class AnimeListItemResponse(AnimeListItemBase):
    """Schema for anime list item responses."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    anime_id: int
    anime: AnimeInfo
    created_at: str
    updated_at: str


class AnimeListResponse(BaseModel):
    """Schema for anime list responses."""
    items: List[AnimeListItemResponse]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class EpisodeProgressUpdate(BaseModel):
    """Schema for updating episode progress."""
    episodes_watched: int = Field(..., ge=0, description="Number of episodes watched")


class BatchUpdateItem(BaseModel):
    """Schema for batch update items."""
    anime_id: int = Field(..., description="Anime ID")
    status: Optional[str] = Field(None, description="New status")
    score: Optional[int] = Field(None, ge=0, le=10, description="New score")
    episodes_watched: Optional[int] = Field(None, ge=0, description="New episodes watched")
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
            if v not in valid_statuses:
                raise ValueError(f'Status must be one of: {", ".join(valid_statuses)}')
        return v


class BatchUpdateRequest(BaseModel):
    """Schema for batch update requests."""
    updates: List[BatchUpdateItem] = Field(..., description="List of updates to apply")


class BatchUpdateResponse(BaseModel):
    """Schema for batch update responses."""
    success_count: int
    error_count: int
    errors: List[str]
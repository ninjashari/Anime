"""
Pydantic schemas for Jellyfin webhook integration.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class JellyfinWebhookPayload(BaseModel):
    """Schema for Jellyfin webhook payload."""
    
    # Event information
    event: str = Field(..., description="The type of event (e.g., 'playback.stop')")
    timestamp: datetime = Field(..., description="When the event occurred")
    
    # User information
    user_id: str = Field(..., description="Jellyfin user ID")
    user_name: str = Field(..., description="Jellyfin username")
    
    # Item information
    item_id: str = Field(..., description="Jellyfin item ID")
    item_name: str = Field(..., description="Name of the media item")
    item_type: str = Field(..., description="Type of media (Episode, Movie, etc.)")
    
    # Series information (for episodes)
    series_name: Optional[str] = Field(None, description="Name of the series")
    series_id: Optional[str] = Field(None, description="Jellyfin series ID")
    
    # Episode information
    season_number: Optional[int] = Field(None, description="Season number")
    episode_number: Optional[int] = Field(None, description="Episode number")
    
    # Playback information
    playback_position_ticks: Optional[int] = Field(None, description="Current playback position in ticks")
    runtime_ticks: Optional[int] = Field(None, description="Total runtime in ticks")
    
    # Provider IDs (where AniDB ID might be found)
    provider_ids: Optional[Dict[str, str]] = Field(None, description="External provider IDs")
    
    # Additional metadata
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    @field_validator('event')
    @classmethod
    def validate_event(cls, v):
        """Validate that the event is a supported type."""
        supported_events = ['playback.stop', 'playback.scrobble', 'item.played']
        if v not in supported_events:
            raise ValueError(f"Unsupported event type: {v}")
        return v
    
    @field_validator('item_type')
    @classmethod
    def validate_item_type(cls, v):
        """Validate that the item type is Episode (we only care about anime episodes)."""
        if v != 'Episode':
            raise ValueError(f"Only Episode items are supported, got: {v}")
        return v


class JellyfinActivityCreate(BaseModel):
    """Schema for creating a Jellyfin activity record."""
    
    user_id: int = Field(..., description="Internal user ID")
    anidb_id: Optional[int] = Field(None, description="AniDB ID extracted from metadata")
    mal_id: Optional[int] = Field(None, description="MyAnimeList ID from mapping")
    episode_number: Optional[int] = Field(None, description="Episode number")
    watch_duration: Optional[int] = Field(None, description="Duration watched in seconds")
    total_duration: Optional[int] = Field(None, description="Total episode duration in seconds")
    completion_percentage: Optional[float] = Field(None, description="Percentage of episode watched")
    jellyfin_item_id: str = Field(..., description="Jellyfin item ID")
    processed: bool = Field(False, description="Whether this activity has been processed")


class JellyfinActivityResponse(BaseModel):
    """Schema for Jellyfin activity response."""
    
    id: int
    user_id: int
    anidb_id: Optional[int]
    mal_id: Optional[int]
    episode_number: Optional[int]
    watch_duration: Optional[int]
    total_duration: Optional[int]
    completion_percentage: Optional[float]
    jellyfin_item_id: str
    processed: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class WebhookProcessingResult(BaseModel):
    """Schema for webhook processing result."""
    
    success: bool = Field(..., description="Whether the webhook was processed successfully")
    message: str = Field(..., description="Processing result message")
    activity_id: Optional[int] = Field(None, description="Created activity record ID")
    anidb_id: Optional[int] = Field(None, description="Extracted AniDB ID")
    mal_id: Optional[int] = Field(None, description="Mapped MyAnimeList ID")
    episodes_updated: Optional[int] = Field(None, description="Number of episodes updated in user's list")
    errors: Optional[list[str]] = Field(None, description="Any errors that occurred during processing")


class JellyfinMappingStats(BaseModel):
    """Schema for Jellyfin mapping statistics."""
    
    total_activities: int = Field(..., description="Total number of Jellyfin activities")
    processed_activities: int = Field(..., description="Number of processed activities")
    unprocessed_activities: int = Field(..., description="Number of unprocessed activities")
    mapped_activities: int = Field(..., description="Number of activities with successful AniDB->MAL mapping")
    unmapped_activities: int = Field(..., description="Number of activities without mapping")
    unique_series: int = Field(..., description="Number of unique anime series tracked")
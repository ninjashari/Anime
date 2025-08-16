"""
Pydantic schemas for AniDB mapping operations.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class AniDBMappingBase(BaseModel):
    """Base schema for AniDB mapping."""
    anidb_id: int = Field(..., description="AniDB ID")
    mal_id: Optional[int] = Field(None, description="MyAnimeList ID")
    title: Optional[str] = Field(None, max_length=255, description="Anime title")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    source: str = Field(default='manual', description="Source of the mapping")
    
    @field_validator('source')
    @classmethod
    def validate_source(cls, v):
        allowed_sources = ['manual', 'auto', 'github_file']
        if v not in allowed_sources:
            raise ValueError(f"Source must be one of: {allowed_sources}")
        return v


class AniDBMappingCreate(AniDBMappingBase):
    """Schema for creating AniDB mapping."""
    pass


class AniDBMappingUpdate(BaseModel):
    """Schema for updating AniDB mapping."""
    mal_id: Optional[int] = Field(None, description="MyAnimeList ID")
    title: Optional[str] = Field(None, max_length=255, description="Anime title")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    source: Optional[str] = Field(None, description="Source of the mapping")
    
    @field_validator('source')
    @classmethod
    def validate_source(cls, v):
        if v is not None:
            allowed_sources = ['manual', 'auto', 'github_file']
            if v not in allowed_sources:
                raise ValueError(f"Source must be one of: {allowed_sources}")
        return v


class AniDBMappingResponse(AniDBMappingBase):
    """Schema for AniDB mapping response."""
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class AniDBMappingList(BaseModel):
    """Schema for paginated AniDB mapping list."""
    mappings: List[AniDBMappingResponse]
    total: int
    limit: int
    offset: int


class AniDBMappingSearch(BaseModel):
    """Schema for AniDB mapping search request."""
    query: str = Field(..., min_length=1, description="Search query")
    limit: int = Field(default=50, ge=1, le=100, description="Maximum results")


class AniDBMappingStatistics(BaseModel):
    """Schema for AniDB mapping statistics."""
    total_mappings: int
    mapped_count: int
    unmapped_count: int
    manual_count: int
    auto_count: int
    github_count: int
    average_confidence: Optional[float]


class MappingRefreshRequest(BaseModel):
    """Schema for mapping data refresh request."""
    source_url: Optional[str] = Field(None, description="Custom source URL for mapping data")


class MappingRefreshResponse(BaseModel):
    """Schema for mapping data refresh response."""
    loaded: int
    updated: int
    errors: int
    message: str


class ConfidenceScoreRequest(BaseModel):
    """Schema for confidence score calculation request."""
    anidb_title: str = Field(..., description="AniDB title")
    mal_title: str = Field(..., description="MyAnimeList title")
    additional_factors: Optional[Dict[str, Any]] = Field(None, description="Additional factors for scoring")


class ConfidenceScoreResponse(BaseModel):
    """Schema for confidence score calculation response."""
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Calculated confidence score")
    anidb_title: str
    mal_title: str
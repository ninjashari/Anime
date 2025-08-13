"""
Dashboard schemas for API responses.
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class TimeSpent(BaseModel):
    """Time spent watching schema."""
    minutes: int = Field(..., description="Total minutes spent watching")
    hours: int = Field(..., description="Total hours spent watching")
    days: int = Field(..., description="Total days spent watching")


class ScoreDistributionItem(BaseModel):
    """Score distribution item schema."""
    score: int = Field(..., ge=1, le=10, description="Score value (1-10)")
    count: int = Field(..., ge=0, description="Number of anime with this score")


class StatusBreakdown(BaseModel):
    """Status breakdown schema."""
    watching: int = Field(..., ge=0, description="Number of anime currently watching")
    completed: int = Field(..., ge=0, description="Number of completed anime")
    on_hold: int = Field(..., ge=0, description="Number of anime on hold")
    dropped: int = Field(..., ge=0, description="Number of dropped anime")
    plan_to_watch: int = Field(..., ge=0, description="Number of anime planned to watch")


class DashboardStats(BaseModel):
    """Complete dashboard statistics schema."""
    total_anime_count: int = Field(..., ge=0, description="Total anime count across all lists")
    total_episodes_watched: int = Field(..., ge=0, description="Total episodes watched")
    time_spent_watching: TimeSpent = Field(..., description="Time spent watching anime")
    time_to_complete_planned: TimeSpent = Field(..., description="Estimated time to complete planned anime")
    mean_score: Optional[float] = Field(None, ge=0, le=10, description="Mean score across rated anime")
    score_distribution: List[ScoreDistributionItem] = Field(..., description="Score distribution data")
    status_breakdown: StatusBreakdown = Field(..., description="Breakdown by anime status")


class DashboardResponse(BaseModel):
    """Dashboard API response schema."""
    success: bool = Field(True, description="Request success status")
    data: DashboardStats = Field(..., description="Dashboard statistics data")
    message: str = Field("Dashboard statistics retrieved successfully", description="Response message")
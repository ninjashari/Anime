"""
Dashboard API endpoints for anime statistics.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import DashboardResponse, DashboardStats, TimeSpent, StatusBreakdown

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardResponse)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics for the current user.
    
    Returns:
        DashboardResponse: Complete dashboard statistics
    """
    try:
        dashboard_service = DashboardService(db)
        stats_data = dashboard_service.get_user_statistics(current_user.id)
        
        # Add status breakdown
        status_breakdown = dashboard_service.get_status_breakdown(current_user.id)
        stats_data["status_breakdown"] = status_breakdown
        
        # Convert to Pydantic models
        dashboard_stats = DashboardStats(
            total_anime_count=stats_data["total_anime_count"],
            total_episodes_watched=stats_data["total_episodes_watched"],
            time_spent_watching=TimeSpent(**stats_data["time_spent_watching"]),
            time_to_complete_planned=TimeSpent(**stats_data["time_to_complete_planned"]),
            mean_score=stats_data["mean_score"],
            score_distribution=stats_data["score_distribution"],
            status_breakdown=StatusBreakdown(**stats_data["status_breakdown"])
        )
        
        return DashboardResponse(data=dashboard_stats)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve dashboard statistics: {str(e)}"
        )


@router.get("/stats/anime-count")
def get_anime_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get total anime count for the current user.
    
    Returns:
        dict: Total anime count
    """
    try:
        dashboard_service = DashboardService(db)
        count = dashboard_service.get_total_anime_count(current_user.id)
        
        return {
            "success": True,
            "data": {"total_anime_count": count},
            "message": "Anime count retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve anime count: {str(e)}"
        )


@router.get("/stats/episodes-watched")
def get_episodes_watched(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get total episodes watched for the current user.
    
    Returns:
        dict: Total episodes watched
    """
    try:
        dashboard_service = DashboardService(db)
        episodes = dashboard_service.get_total_episodes_watched(current_user.id)
        
        return {
            "success": True,
            "data": {"total_episodes_watched": episodes},
            "message": "Episodes watched count retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve episodes watched: {str(e)}"
        )


@router.get("/stats/time-spent")
def get_time_spent(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get time spent watching anime for the current user.
    
    Returns:
        dict: Time spent watching in minutes, hours, and days
    """
    try:
        dashboard_service = DashboardService(db)
        time_data = dashboard_service.get_time_spent_watching(current_user.id)
        
        return {
            "success": True,
            "data": {"time_spent_watching": time_data},
            "message": "Time spent watching retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve time spent watching: {str(e)}"
        )


@router.get("/stats/mean-score")
def get_mean_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get mean score across rated anime for the current user.
    
    Returns:
        dict: Mean score or null if no rated anime
    """
    try:
        dashboard_service = DashboardService(db)
        mean_score = dashboard_service.get_mean_score(current_user.id)
        
        return {
            "success": True,
            "data": {"mean_score": mean_score},
            "message": "Mean score retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve mean score: {str(e)}"
        )


@router.get("/stats/score-distribution")
def get_score_distribution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get score distribution data for chart display.
    
    Returns:
        dict: Score distribution data for scores 1-10
    """
    try:
        dashboard_service = DashboardService(db)
        distribution = dashboard_service.get_score_distribution(current_user.id)
        
        return {
            "success": True,
            "data": {"score_distribution": distribution},
            "message": "Score distribution retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve score distribution: {str(e)}"
        )


@router.get("/stats/status-breakdown")
def get_status_breakdown(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get breakdown of anime by status.
    
    Returns:
        dict: Count of anime by status
    """
    try:
        dashboard_service = DashboardService(db)
        breakdown = dashboard_service.get_status_breakdown(current_user.id)
        
        return {
            "success": True,
            "data": {"status_breakdown": breakdown},
            "message": "Status breakdown retrieved successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve status breakdown: {str(e)}"
        )
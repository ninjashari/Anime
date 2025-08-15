"""
Jellyfin webhook API endpoints.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.auth import get_current_user
from ..models.user import User
from ..schemas.jellyfin import (
    JellyfinWebhookPayload,
    JellyfinActivityResponse,
    WebhookProcessingResult,
    JellyfinMappingStats
)
from ..services.jellyfin_service import get_jellyfin_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jellyfin", tags=["jellyfin"])


@router.post("/webhook", response_model=WebhookProcessingResult)
async def jellyfin_webhook(
    request: Request,
    webhook_payload: JellyfinWebhookPayload,
    db: Session = Depends(get_db),
    x_jellyfin_signature: Optional[str] = Header(None, alias="X-Jellyfin-Signature")
):
    """
    Receive and process Jellyfin webhook for anime playback events.
    
    This endpoint receives webhooks from Jellyfin when users watch anime episodes.
    It extracts AniDB IDs, maps them to MyAnimeList IDs, and automatically updates
    the user's anime list progress.
    
    Args:
        request: FastAPI request object
        webhook_payload: Parsed webhook payload from Jellyfin
        db: Database session
        x_jellyfin_signature: Webhook signature for verification
        
    Returns:
        Processing result with success status and details
        
    Raises:
        HTTPException: If webhook signature is invalid or processing fails
    """
    jellyfin_service = get_jellyfin_service(db)
    
    # Verify webhook signature if configured
    if x_jellyfin_signature:
        body = await request.body()
        if not jellyfin_service.verify_webhook_signature(body, x_jellyfin_signature):
            logger.warning("Invalid webhook signature received")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )
    
    # Log the webhook event
    logger.info(f"Received Jellyfin webhook: {webhook_payload.event} for user {webhook_payload.user_name}")
    
    # Process the webhook
    try:
        result = await jellyfin_service.process_webhook(webhook_payload)
        
        if result.success:
            logger.info(f"Successfully processed webhook: {result.message}")
        else:
            logger.warning(f"Failed to process webhook: {result.message}")
            
        return result
        
    except Exception as e:
        logger.error(f"Unexpected error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing webhook: {str(e)}"
        )


@router.get("/activities", response_model=List[JellyfinActivityResponse])
def get_jellyfin_activities(
    processed: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Jellyfin activities for the current user.
    
    Args:
        processed: Filter by processed status (optional)
        limit: Maximum number of activities to return (default: 50)
        offset: Number of activities to skip (default: 0)
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of Jellyfin activities
    """
    jellyfin_service = get_jellyfin_service(db)
    
    activities = jellyfin_service.get_jellyfin_activities(
        user_id=current_user.id,
        processed=processed,
        limit=limit,
        offset=offset
    )
    
    return activities


@router.get("/activities/all", response_model=List[JellyfinActivityResponse])
def get_all_jellyfin_activities(
    user_id: Optional[int] = None,
    processed: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all Jellyfin activities (admin endpoint).
    
    Note: In a real application, you'd want to add admin role checking here.
    
    Args:
        user_id: Filter by user ID (optional)
        processed: Filter by processed status (optional)
        limit: Maximum number of activities to return (default: 100)
        offset: Number of activities to skip (default: 0)
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        List of Jellyfin activities
    """
    jellyfin_service = get_jellyfin_service(db)
    
    activities = jellyfin_service.get_jellyfin_activities(
        user_id=user_id,
        processed=processed,
        limit=limit,
        offset=offset
    )
    
    return activities


@router.get("/stats", response_model=JellyfinMappingStats)
def get_jellyfin_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about Jellyfin activities and mappings.
    
    Args:
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Statistics about Jellyfin integration
    """
    jellyfin_service = get_jellyfin_service(db)
    return jellyfin_service.get_mapping_statistics()


@router.post("/reprocess")
async def reprocess_failed_activities(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reprocess failed/unprocessed Jellyfin activities.
    
    This endpoint attempts to reprocess activities that failed initially,
    which might succeed if new mappings have been added.
    
    Args:
        limit: Maximum number of activities to reprocess (default: 50)
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Dictionary with reprocessing statistics
    """
    jellyfin_service = get_jellyfin_service(db)
    
    try:
        result = await jellyfin_service.reprocess_failed_activities(limit=limit)
        return result
        
    except Exception as e:
        logger.error(f"Error reprocessing activities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reprocessing activities: {str(e)}"
        )


@router.delete("/activities/{activity_id}")
def delete_jellyfin_activity(
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific Jellyfin activity.
    
    Args:
        activity_id: ID of the activity to delete
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If activity not found or user doesn't have permission
    """
    from ..models.jellyfin_activity import JellyfinActivity
    
    activity = db.query(JellyfinActivity).filter(
        JellyfinActivity.id == activity_id
    ).first()
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )
    
    # Check if user owns this activity (or is admin)
    if activity.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this activity"
        )
    
    db.delete(activity)
    db.commit()
    
    return {"message": "Activity deleted successfully"}


# Health check endpoint for Jellyfin webhook
@router.get("/webhook/health")
def webhook_health_check():
    """
    Health check endpoint for Jellyfin webhook integration.
    
    Returns:
        Simple health status
    """
    return {"status": "healthy", "service": "jellyfin-webhook"}
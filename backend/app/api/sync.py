"""
API endpoints for anime data synchronization.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.sync_service import get_sync_service
from app.tasks.sync_tasks import (
    sync_user_anime_task,
    sync_all_users_task,
    sync_active_users_task,
    sync_user_batch_task
)

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/user", response_model=Dict[str, Any])
async def sync_current_user_anime(
    force_full_sync: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger anime data synchronization for the current user.
    
    Args:
        force_full_sync: Whether to force a full sync regardless of last sync time
        background_tasks: FastAPI background tasks
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with sync task information
    """
    if not current_user.mal_access_token:
        raise HTTPException(
            status_code=400,
            detail="User has no MyAnimeList access token. Please connect your MAL account first."
        )
    
    # Queue background task
    task = sync_user_anime_task.delay(current_user.id, force_full_sync)
    
    return {
        "message": "Anime data synchronization started",
        "task_id": task.id,
        "user_id": current_user.id,
        "force_full_sync": force_full_sync,
        "started_at": datetime.utcnow().isoformat()
    }


@router.post("/user/{user_id}", response_model=Dict[str, Any])
async def sync_user_anime(
    user_id: int,
    force_full_sync: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger anime data synchronization for a specific user (admin only).
    
    Args:
        user_id: ID of user to sync
        force_full_sync: Whether to force a full sync
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with sync task information
    """
    # For now, only allow users to sync their own data
    # In the future, this could be restricted to admin users
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only sync your own anime data"
        )
    
    # Get target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not target_user.mal_access_token:
        raise HTTPException(
            status_code=400,
            detail="User has no MyAnimeList access token"
        )
    
    # Queue background task
    task = sync_user_anime_task.delay(user_id, force_full_sync)
    
    return {
        "message": f"Anime data synchronization started for user {user_id}",
        "task_id": task.id,
        "user_id": user_id,
        "force_full_sync": force_full_sync,
        "started_at": datetime.utcnow().isoformat()
    }


@router.post("/users/batch", response_model=Dict[str, Any])
async def sync_user_batch(
    user_ids: List[int],
    force_full_sync: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger anime data synchronization for a batch of users.
    
    Args:
        user_ids: List of user IDs to sync
        force_full_sync: Whether to force full sync for all users
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with batch sync task information
    """
    # For now, only allow users to sync their own data
    if len(user_ids) != 1 or user_ids[0] != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only sync your own anime data"
        )
    
    # Validate all users exist and have MAL tokens
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    found_user_ids = {user.id for user in users}
    missing_user_ids = set(user_ids) - found_user_ids
    
    if missing_user_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Users not found: {list(missing_user_ids)}"
        )
    
    users_without_tokens = [user.id for user in users if not user.mal_access_token]
    if users_without_tokens:
        raise HTTPException(
            status_code=400,
            detail=f"Users without MAL tokens: {users_without_tokens}"
        )
    
    # Queue background task
    task = sync_user_batch_task.delay(user_ids, force_full_sync)
    
    return {
        "message": f"Batch anime data synchronization started for {len(user_ids)} users",
        "task_id": task.id,
        "user_ids": user_ids,
        "force_full_sync": force_full_sync,
        "started_at": datetime.utcnow().isoformat()
    }


@router.post("/all-users", response_model=Dict[str, Any])
async def sync_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger anime data synchronization for all users (admin only).
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with sync task information
    """
    # This would typically be restricted to admin users
    # For now, we'll disable this endpoint
    raise HTTPException(
        status_code=403,
        detail="Bulk sync for all users is not available"
    )
    
    # Queue background task
    task = sync_all_users_task.delay()
    
    return {
        "message": "Bulk anime data synchronization started for all users",
        "task_id": task.id,
        "started_at": datetime.utcnow().isoformat()
    }


@router.post("/active-users", response_model=Dict[str, Any])
async def sync_active_users(
    hours_threshold: int = 24,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger anime data synchronization for recently active users.
    
    Args:
        hours_threshold: Only sync users who haven't been synced in this many hours
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with sync task information
    """
    # This would typically be restricted to admin users
    # For now, we'll disable this endpoint
    raise HTTPException(
        status_code=403,
        detail="Bulk sync for active users is not available"
    )
    
    # Queue background task
    task = sync_active_users_task.delay(hours_threshold)
    
    return {
        "message": f"Active users anime data synchronization started (threshold: {hours_threshold} hours)",
        "task_id": task.id,
        "hours_threshold": hours_threshold,
        "started_at": datetime.utcnow().isoformat()
    }


@router.get("/status/{task_id}", response_model=Dict[str, Any])
async def get_sync_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get the status of a synchronization task.
    
    Args:
        task_id: ID of the sync task
        current_user: Current authenticated user
        
    Returns:
        Dictionary with task status information
    """
    from app.core.celery_app import celery_app
    
    try:
        task = celery_app.AsyncResult(task_id)
        
        return {
            "task_id": task_id,
            "status": task.status,
            "result": task.result if task.ready() else None,
            "info": task.info if hasattr(task, 'info') else None,
            "ready": task.ready(),
            "successful": task.successful() if task.ready() else None,
            "failed": task.failed() if task.ready() else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving task status: {str(e)}"
        )


@router.get("/user/last-sync", response_model=Dict[str, Any])
async def get_user_last_sync(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get the last synchronization timestamp for the current user.
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Dictionary with last sync information
    """
    return {
        "user_id": current_user.id,
        "last_mal_sync": current_user.last_mal_sync.isoformat() if current_user.last_mal_sync else None,
        "has_mal_token": bool(current_user.mal_access_token),
        "token_expires_at": current_user.mal_token_expires_at.isoformat() if current_user.mal_token_expires_at else None
    }
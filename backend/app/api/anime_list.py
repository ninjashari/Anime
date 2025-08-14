"""
API endpoints for anime list management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.anime_list import (
    AnimeListResponse,
    AnimeListItemResponse,
    AnimeListItemUpdate,
    EpisodeProgressUpdate,
    BatchUpdateRequest,
    BatchUpdateResponse
)
from app.services.anime_list_service import get_anime_list_service

router = APIRouter(prefix="/anime-lists", tags=["anime-lists"])


@router.get("", response_model=AnimeListResponse)
async def get_anime_lists(
    status: Optional[str] = Query(None, description="Filter by anime status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's anime lists with optional status filtering and pagination.
    
    Valid status values: watching, completed, on_hold, dropped, plan_to_watch
    """
    anime_list_service = get_anime_list_service()
    
    # Validate status if provided
    if status:
        valid_statuses = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
    
    try:
        items, total = anime_list_service.get_anime_lists_by_status(
            db, current_user, status, page, per_page
        )
        
        # Convert to response format
        response_items = []
        for item in items:
            response_items.append(AnimeListItemResponse(
                id=item.id,
                user_id=item.user_id,
                anime_id=item.anime_id,
                status=item.status,
                score=item.score,
                episodes_watched=item.episodes_watched,
                start_date=item.start_date,
                finish_date=item.finish_date,
                notes=item.notes,
                anime=item.anime,
                created_at=item.created_at.isoformat(),
                updated_at=item.updated_at.isoformat()
            ))
        
        return AnimeListResponse(
            items=response_items,
            total=total,
            page=page,
            per_page=per_page,
            has_next=page * per_page < total,
            has_prev=page > 1
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anime lists: {str(e)}")


@router.get("/{anime_id}", response_model=AnimeListItemResponse)
async def get_anime_list_item(
    anime_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific anime list item for the current user."""
    anime_list_service = get_anime_list_service()
    
    item = anime_list_service.get_anime_list_item(db, current_user, anime_id)
    if not item:
        raise HTTPException(status_code=404, detail="Anime not found in user's list")
    
    return AnimeListItemResponse(
        id=item.id,
        user_id=item.user_id,
        anime_id=item.anime_id,
        status=item.status,
        score=item.score,
        episodes_watched=item.episodes_watched,
        start_date=item.start_date,
        finish_date=item.finish_date,
        notes=item.notes,
        anime=item.anime,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat()
    )


@router.put("/{anime_id}", response_model=AnimeListItemResponse)
async def update_anime_status(
    anime_id: int,
    update_data: AnimeListItemUpdate,
    sync_to_mal: bool = Query(True, description="Whether to sync changes to MyAnimeList"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update anime status and other properties in user's list."""
    anime_list_service = get_anime_list_service()
    
    try:
        updated_item = await anime_list_service.update_anime_status(
            db, current_user, anime_id, update_data, sync_to_mal
        )
        
        return AnimeListItemResponse(
            id=updated_item.id,
            user_id=updated_item.user_id,
            anime_id=updated_item.anime_id,
            status=updated_item.status,
            score=updated_item.score,
            episodes_watched=updated_item.episodes_watched,
            start_date=updated_item.start_date,
            finish_date=updated_item.finish_date,
            notes=updated_item.notes,
            anime=updated_item.anime,
            created_at=updated_item.created_at.isoformat(),
            updated_at=updated_item.updated_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update anime status: {str(e)}")


@router.put("/{anime_id}/progress", response_model=AnimeListItemResponse)
async def update_episode_progress(
    anime_id: int,
    progress_data: EpisodeProgressUpdate,
    sync_to_mal: bool = Query(True, description="Whether to sync changes to MyAnimeList"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update episode progress for an anime in user's list."""
    anime_list_service = get_anime_list_service()
    
    try:
        updated_item = await anime_list_service.update_episode_progress(
            db, current_user, anime_id, progress_data, sync_to_mal
        )
        
        return AnimeListItemResponse(
            id=updated_item.id,
            user_id=updated_item.user_id,
            anime_id=updated_item.anime_id,
            status=updated_item.status,
            score=updated_item.score,
            episodes_watched=updated_item.episodes_watched,
            start_date=updated_item.start_date,
            finish_date=updated_item.finish_date,
            notes=updated_item.notes,
            anime=updated_item.anime,
            created_at=updated_item.created_at.isoformat(),
            updated_at=updated_item.updated_at.isoformat()
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update episode progress: {str(e)}")


@router.delete("/{anime_id}")
async def remove_anime_from_list(
    anime_id: int,
    sync_to_mal: bool = Query(True, description="Whether to sync removal to MyAnimeList"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove anime from user's list."""
    anime_list_service = get_anime_list_service()
    
    try:
        success = await anime_list_service.remove_anime_from_list(
            db, current_user, anime_id, sync_to_mal
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Anime not found in user's list")
        
        return {"message": "Anime removed from list successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove anime from list: {str(e)}")


@router.post("/batch-update", response_model=BatchUpdateResponse)
async def batch_update_anime_list(
    batch_request: BatchUpdateRequest,
    sync_to_mal: bool = Query(True, description="Whether to sync changes to MyAnimeList"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Perform batch updates on multiple anime list items."""
    anime_list_service = get_anime_list_service()
    
    if not batch_request.updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    if len(batch_request.updates) > 100:
        raise HTTPException(status_code=400, detail="Too many updates (max 100)")
    
    try:
        result = await anime_list_service.batch_update_anime_list(
            db, current_user, batch_request.updates, sync_to_mal
        )
        
        return BatchUpdateResponse(
            success_count=result["success_count"],
            error_count=result["error_count"],
            errors=result["errors"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to perform batch update: {str(e)}")


@router.get("/stats/summary")
async def get_anime_list_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get statistics about user's anime lists."""
    anime_list_service = get_anime_list_service()
    
    try:
        stats = anime_list_service.get_anime_list_stats(db, current_user)
        return stats
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch anime list stats: {str(e)}")
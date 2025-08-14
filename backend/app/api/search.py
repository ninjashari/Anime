"""
API endpoints for anime search functionality.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchAnimeResult,
    AddToListRequest,
    AddToListResponse,
    SearchHistoryResponse,
    SearchHistoryItem,
    SearchSuggestionResponse
)
from app.services.search_service import get_search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/anime", response_model=SearchResponse)
async def search_anime(
    query: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Number of results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for anime using MyAnimeList API.
    
    Results are cached for improved performance and include user's list status.
    """
    search_service = get_search_service()
    
    try:
        results, total, cached = await search_service.search_anime(
            db, current_user, query, limit, offset
        )
        
        return SearchResponse(
            results=results,
            total=total,
            query=query,
            limit=limit,
            offset=offset,
            has_next=offset + limit < total,
            cached=cached
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/anime/add", response_model=AddToListResponse)
async def add_anime_to_list(
    request: AddToListRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add anime to user's list from search results.
    
    This will create a local database entry and sync to MyAnimeList.
    """
    search_service = get_search_service()
    
    try:
        result = await search_service.add_anime_to_list(db, current_user, request)
        
        return AddToListResponse(
            success=result["success"],
            message=result["message"],
            anime_id=result.get("anime_id"),
            list_item_id=result.get("list_item_id")
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add anime to list: {str(e)}")


@router.get("/history", response_model=SearchHistoryResponse)
async def get_search_history(
    limit: int = Query(20, ge=1, le=100, description="Number of history items to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's search history.
    
    Returns recent search queries ordered by creation date.
    """
    search_service = get_search_service()
    
    try:
        history_items = search_service.get_search_history(db, current_user, limit)
        
        history = [
            SearchHistoryItem(
                id=item.id,
                query=item.query,
                result_count=item.result_count,
                created_at=item.created_at
            )
            for item in history_items
        ]
        
        return SearchHistoryResponse(
            history=history,
            total=len(history)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch search history: {str(e)}")


@router.get("/suggestions", response_model=SearchSuggestionResponse)
async def get_search_suggestions(
    query: str = Query("", description="Query prefix for suggestions"),
    limit: int = Query(10, ge=1, le=20, description="Number of suggestions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get search suggestions based on user's search history.
    
    Returns frequently used queries that match the provided prefix.
    """
    search_service = get_search_service()
    
    try:
        suggestions = search_service.get_search_suggestions(
            db, current_user, query, limit
        )
        
        return SearchSuggestionResponse(suggestions=suggestions)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch search suggestions: {str(e)}")


@router.delete("/history")
async def clear_search_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear user's search history.
    
    This will remove all search history entries for the current user.
    """
    try:
        from app.models.search_history import SearchHistory
        
        deleted_count = (
            db.query(SearchHistory)
            .filter(SearchHistory.user_id == current_user.id)
            .delete()
        )
        
        db.commit()
        
        return {
            "message": f"Search history cleared successfully",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear search history: {str(e)}")


@router.delete("/history/{history_id}")
async def delete_search_history_item(
    history_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a specific search history item.
    
    Only the owner of the search history item can delete it.
    """
    try:
        from app.models.search_history import SearchHistory
        
        history_item = (
            db.query(SearchHistory)
            .filter(SearchHistory.id == history_id)
            .filter(SearchHistory.user_id == current_user.id)
            .first()
        )
        
        if not history_item:
            raise HTTPException(status_code=404, detail="Search history item not found")
        
        db.delete(history_item)
        db.commit()
        
        return {"message": "Search history item deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete search history item: {str(e)}")
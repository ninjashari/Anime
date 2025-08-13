"""
MyAnimeList API endpoints.
"""
import secrets
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.mal import (
    MALAuthUrlResponse,
    MALTokenRequest,
    MALTokenResponse,
    MALUserInfo,
    MALAnimeListRequest,
    MALAnimeListResponse,
    MALSearchRequest,
    MALAnimeSearchResponse,
    MALUpdateAnimeStatusRequest
)
from app.services.mal_service import get_mal_service

router = APIRouter(prefix="/mal", tags=["MyAnimeList"])


@router.get("/auth-url", response_model=MALAuthUrlResponse)
async def get_auth_url():
    """Generate MyAnimeList OAuth 2.0 authorization URL."""
    try:
        # Generate a random state for CSRF protection
        state = secrets.token_urlsafe(32)
        auth_url = get_mal_service().generate_auth_url(state)
        
        return MALAuthUrlResponse(auth_url=auth_url, state=state)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MyAnimeList API not configured: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.post("/callback", response_model=MALTokenResponse)
async def handle_oauth_callback(
    token_request: MALTokenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Handle MyAnimeList OAuth callback and exchange code for tokens."""
    try:
        # Exchange authorization code for tokens
        service = get_mal_service()
        token_data = await service.exchange_code_for_tokens(
            token_request.code, 
            token_request.state
        )
        
        # Store tokens in user record
        service.store_tokens(
            db,
            current_user,
            token_data["access_token"],
            token_data["refresh_token"],
            token_data["expires_in"]
        )
        
        return MALTokenResponse(**token_data)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to exchange authorization code: {str(e)}"
        )


@router.get("/user-info", response_model=MALUserInfo)
async def get_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get MyAnimeList user information."""
    try:
        service = get_mal_service()
        access_token = await service.ensure_valid_token(db, current_user)
        user_info = await service.get_user_info(access_token)
        
        return MALUserInfo(**user_info)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user info: {str(e)}"
        )


@router.post("/refresh-token", response_model=MALTokenResponse)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refresh MyAnimeList access token."""
    try:
        if not current_user.mal_refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No refresh token available"
            )
        
        service = get_mal_service()
        token_data = await service.refresh_access_token(current_user.mal_refresh_token)
        
        # Store new tokens
        service.store_tokens(
            db,
            current_user,
            token_data["access_token"],
            token_data.get("refresh_token", current_user.mal_refresh_token),
            token_data["expires_in"]
        )
        
        return MALTokenResponse(**token_data)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to refresh token: {str(e)}"
        )


@router.get("/animelist", response_model=Dict[str, Any])
async def get_anime_list(
    status: str = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's anime list from MyAnimeList."""
    try:
        service = get_mal_service()
        access_token = await service.ensure_valid_token(db, current_user)
        anime_list = await service.get_user_anime_list(
            access_token, 
            status=status,
            limit=limit,
            offset=offset
        )
        
        return anime_list
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get anime list: {str(e)}"
        )


@router.get("/search", response_model=Dict[str, Any])
async def search_anime(
    query: str,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for anime on MyAnimeList."""
    try:
        if not query or len(query.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Search query cannot be empty"
            )
        
        service = get_mal_service()
        access_token = await service.ensure_valid_token(db, current_user)
        search_results = await service.search_anime(
            access_token,
            query.strip(),
            limit=limit,
            offset=offset
        )
        
        return search_results
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search anime: {str(e)}"
        )


@router.patch("/anime/{anime_id}/status")
async def update_anime_status(
    anime_id: int,
    update_request: MALUpdateAnimeStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update anime status in user's MyAnimeList."""
    try:
        service = get_mal_service()
        access_token = await service.ensure_valid_token(db, current_user)
        
        # Convert request to dict, excluding None values
        update_data = update_request.dict(exclude_none=True)
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No update data provided"
            )
        
        result = await service.update_anime_list_status(
            access_token,
            anime_id,
            **update_data
        )
        
        return {"message": "Anime status updated successfully", "data": result}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update anime status: {str(e)}"
        )


@router.delete("/anime/{anime_id}")
async def remove_anime_from_list(
    anime_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove anime from user's MyAnimeList."""
    try:
        service = get_mal_service()
        access_token = await service.ensure_valid_token(db, current_user)
        
        await service.delete_anime_from_list(access_token, anime_id)
        
        return {"message": "Anime removed from list successfully"}
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove anime from list: {str(e)}"
        )


@router.get("/token-status")
async def get_token_status(
    current_user: User = Depends(get_current_user)
):
    """Get MyAnimeList token status for current user."""
    has_tokens = bool(current_user.mal_access_token and current_user.mal_refresh_token)
    is_expired = False
    
    if has_tokens and current_user.mal_token_expires_at:
        from datetime import datetime
        is_expired = current_user.mal_token_expires_at <= datetime.utcnow()
    
    return {
        "has_tokens": has_tokens,
        "is_expired": is_expired,
        "expires_at": current_user.mal_token_expires_at.isoformat() if current_user.mal_token_expires_at else None
    }
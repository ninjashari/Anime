"""
Authentication middleware and dependencies.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import auth_service
from app.models.user import User


# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials containing JWT token
        db: Database session
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Verify the token
    payload = auth_service.verify_token(credentials.credentials, token_type="access")
    if payload is None:
        raise credentials_exception
    
    # Extract user ID from token
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # Get user from database
    user = auth_service.get_user_by_id(db, user_id=int(user_id))
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get the current active user.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Current active user
        
    Raises:
        HTTPException: If user is inactive (for future use)
    """
    # For now, all users are considered active
    # This can be extended later to check for user status
    return current_user


def verify_refresh_token(token: str, db: Session) -> Optional[User]:
    """
    Verify refresh token and return associated user.
    
    Args:
        token: JWT refresh token
        db: Database session
        
    Returns:
        User object if token is valid, None otherwise
    """
    payload = auth_service.verify_token(token, token_type="refresh")
    if payload is None:
        return None
    
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        return None
    
    return auth_service.get_user_by_id(db, user_id=int(user_id))
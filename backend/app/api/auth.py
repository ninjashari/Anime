"""
Authentication API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_active_user, verify_refresh_token
from app.services.auth_service import auth_service
from app.schemas.auth import (
    UserRegistration, 
    UserLogin, 
    Token, 
    TokenRefresh, 
    UserProfile, 
    AuthResponse
)
from app.models.user import User


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegistration,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    
    Args:
        user_data: User registration data
        db: Database session
        
    Returns:
        AuthResponse: User profile and authentication tokens
        
    Raises:
        HTTPException: If username already exists
    """
    try:
        # Create new user
        user = auth_service.create_user(
            db=db,
            username=user_data.username,
            name=user_data.name,
            password=user_data.password
        )
        
        # Generate tokens
        access_token = auth_service.create_access_token(data={"sub": str(user.id)})
        refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
        
        # Create response
        tokens = Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
        
        user_profile = UserProfile.from_orm(user)
        
        return AuthResponse(user=user_profile, tokens=tokens)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )


@router.post("/login", response_model=AuthResponse)
async def login_user(
    user_credentials: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return tokens.
    
    Args:
        user_credentials: User login credentials
        db: Database session
        
    Returns:
        AuthResponse: User profile and authentication tokens
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Authenticate user
    user = auth_service.authenticate_user(
        db=db,
        username=user_credentials.username,
        password=user_credentials.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    # Create response
    tokens = Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )
    
    user_profile = UserProfile.from_orm(user)
    
    return AuthResponse(user=user_profile, tokens=tokens)


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    
    Args:
        token_data: Refresh token data
        db: Database session
        
    Returns:
        Token: New access and refresh tokens
        
    Raises:
        HTTPException: If refresh token is invalid
    """
    # Verify refresh token
    user = verify_refresh_token(token_data.refresh_token, db)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate new tokens
    access_token = auth_service.create_access_token(data={"sub": str(user.id)})
    refresh_token = auth_service.create_refresh_token(data={"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's profile information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        UserProfile: Current user's profile data
    """
    return UserProfile.from_orm(current_user)


@router.post("/logout")
async def logout_user(
    current_user: User = Depends(get_current_active_user)
):
    """
    Logout current user.
    
    Note: In a stateless JWT implementation, logout is handled client-side
    by removing the tokens. This endpoint is provided for consistency
    and can be extended for token blacklisting if needed.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        dict: Success message
    """
    return {"message": "Successfully logged out"}
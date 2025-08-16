"""
Authentication-related Pydantic schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserRegistration(BaseModel):
    """Schema for user registration request."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    name: str = Field(..., min_length=1, max_length=100, description="User's display name")
    password: str = Field(..., min_length=6, max_length=100, description="User's password")


class UserLogin(BaseModel):
    """Schema for user login request."""
    username: str = Field(..., description="User's username")
    password: str = Field(..., description="User's password")


class Token(BaseModel):
    """Schema for token response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")


class TokenRefresh(BaseModel):
    """Schema for token refresh request."""
    refresh_token: str = Field(..., description="JWT refresh token")


class UserProfile(BaseModel):
    """Schema for user profile response."""
    id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    name: str = Field(..., description="User's display name")
    mal_token_expires_at: Optional[datetime] = Field(None, description="MyAnimeList token expiration")
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """Schema for authentication response."""
    user: UserProfile
    tokens: Token
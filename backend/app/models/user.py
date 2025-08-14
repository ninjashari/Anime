"""
User model for authentication and profile management.
"""
from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.orm import relationship
from .base import BaseModel


class User(BaseModel):
    """
    User model for storing user account information and MyAnimeList tokens.
    """
    __tablename__ = "users"
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # MyAnimeList integration fields
    mal_access_token = Column(Text, nullable=True)
    mal_refresh_token = Column(Text, nullable=True)
    mal_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    anime_lists = relationship("UserAnimeList", back_populates="user", cascade="all, delete-orphan")
    jellyfin_activities = relationship("JellyfinActivity", back_populates="user", cascade="all, delete-orphan")
    search_history = relationship("SearchHistory", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username='{self.username}', name='{self.name}')>"
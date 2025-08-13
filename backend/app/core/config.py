"""
Application configuration settings.
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./anime_management.db"
    )
    
    # Redis settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # MyAnimeList API settings
    MAL_CLIENT_ID: Optional[str] = os.getenv("MAL_CLIENT_ID")
    MAL_CLIENT_SECRET: Optional[str] = os.getenv("MAL_CLIENT_SECRET")
    MAL_REDIRECT_URI: Optional[str] = os.getenv("MAL_REDIRECT_URI")
    
    # Jellyfin settings
    JELLYFIN_WEBHOOK_SECRET: Optional[str] = os.getenv("JELLYFIN_WEBHOOK_SECRET")
    
    # External API settings
    ANIDB_MAPPING_URL: str = os.getenv(
        "ANIDB_MAPPING_URL", 
        "https://raw.githubusercontent.com/Anime-Lists/anime-lists/master/anime-list-full.xml"
    )
    
    # Application settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    CORS_ORIGINS: list[str] = ["http://localhost:3005", "http://127.0.0.1:3005"]
    
    class Config:
        env_file = ".env"


settings = Settings()
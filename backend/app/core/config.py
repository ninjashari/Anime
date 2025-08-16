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
    
    # Logging settings
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO" if not DEBUG else "DEBUG")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "structured")  # structured or simple
    LOG_FILE_ENABLED: bool = os.getenv("LOG_FILE_ENABLED", "True").lower() == "true"
    LOG_FILE_PATH: str = os.getenv("LOG_FILE_PATH", "logs/app.log")
    LOG_FILE_MAX_SIZE: int = int(os.getenv("LOG_FILE_MAX_SIZE", "10485760"))  # 10MB
    LOG_FILE_BACKUP_COUNT: int = int(os.getenv("LOG_FILE_BACKUP_COUNT", "5"))
    
    # Error handling settings
    SHOW_ERROR_DETAILS: bool = DEBUG  # Show detailed errors in debug mode
    ERROR_NOTIFICATION_ENABLED: bool = os.getenv("ERROR_NOTIFICATION_ENABLED", "False").lower() == "true"
    
    # Retry settings
    DEFAULT_RETRY_ATTEMPTS: int = int(os.getenv("DEFAULT_RETRY_ATTEMPTS", "3"))
    DEFAULT_RETRY_DELAY: float = float(os.getenv("DEFAULT_RETRY_DELAY", "1.0"))
    MAX_RETRY_DELAY: float = float(os.getenv("MAX_RETRY_DELAY", "60.0"))
    
    class Config:
        env_file = ".env"


settings = Settings()
"""
Main FastAPI application.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import httpx

from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.middleware import RequestLoggingMiddleware, UserContextMiddleware
from app.core.error_handlers import (
    base_app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    sqlalchemy_exception_handler,
    httpx_exception_handler,
    generic_exception_handler
)
from app.core.exceptions import BaseAppException
from app.api.auth import router as auth_router
from app.api.mal import router as mal_router
from app.api.dashboard import router as dashboard_router
from app.api.anime_list import router as anime_list_router
from app.api.search import router as search_router
from app.api.anidb_mapping import router as anidb_mapping_router
from app.api.jellyfin import router as jellyfin_router
from app.api.sync import router as sync_router

# Setup logging
setup_logging()
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Anime Management System API")
    yield
    # Shutdown
    logger.info("Shutting down Anime Management System API")

app = FastAPI(
    title="Anime Management System", 
    version="1.0.0",
    description="A comprehensive anime tracking system with MyAnimeList and Jellyfin integration",
    lifespan=lifespan
)

# Add custom middleware
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(UserContextMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handlers
app.add_exception_handler(BaseAppException, base_app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
app.add_exception_handler(httpx.HTTPError, httpx_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(mal_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(anime_list_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(anidb_mapping_router)
app.include_router(jellyfin_router)
app.include_router(sync_router)





@app.get("/")
def read_root():
    """Root endpoint."""
    logger.info("Root endpoint accessed")
    return {"message": "Anime Management System API"}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
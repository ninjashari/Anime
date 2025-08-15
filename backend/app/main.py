"""
Main FastAPI application.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.mal import router as mal_router
from app.api.dashboard import router as dashboard_router
from app.api.anime_list import router as anime_list_router
from app.api.search import router as search_router
from app.api.anidb_mapping import router as anidb_mapping_router

app = FastAPI(title="Anime Management System", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(mal_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(anime_list_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(anidb_mapping_router)


@app.get("/")
def read_root():
    return {"message": "Anime Management System API"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
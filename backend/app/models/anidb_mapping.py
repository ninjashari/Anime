"""
AniDB mapping model for mapping AniDB IDs to MyAnimeList IDs.
"""
from sqlalchemy import Column, String, Integer, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class AniDBMapping(BaseModel):
    """
    AniDB mapping model for storing mappings between AniDB IDs and MyAnimeList IDs.
    """
    __tablename__ = "anidb_mappings"
    
    anidb_id = Column(Integer, unique=True, nullable=False, index=True)
    mal_id = Column(Integer, ForeignKey("anime.mal_id"), nullable=True, index=True)
    title = Column(String(255), nullable=True)
    confidence_score = Column(Numeric(3, 2), nullable=True)  # Confidence in mapping accuracy (0.00-1.00)
    source = Column(String(50), nullable=False, default='manual')  # manual, auto, github_file
    
    # Relationships
    anime = relationship("Anime", back_populates="anidb_mappings")
    
    def __repr__(self) -> str:
        return f"<AniDBMapping(id={self.id}, anidb_id={self.anidb_id}, mal_id={self.mal_id}, source='{self.source}')>"
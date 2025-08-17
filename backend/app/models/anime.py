"""
Anime model for storing anime information from MyAnimeList.
"""
from sqlalchemy import Column, String, Text, Integer, Date, Numeric
from sqlalchemy.orm import relationship
from .base import BaseModel


class Anime(BaseModel):
    """
    Anime model for storing anime information cached from MyAnimeList API.
    """
    __tablename__ = "anime"
    
    mal_id = Column(Integer, unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    title_english = Column(String(255), nullable=True)
    synopsis = Column(Text, nullable=True)
    episodes = Column(Integer, nullable=True)
    status = Column(String(50), nullable=True)  # finished_airing, currently_airing, not_yet_aired
    aired_from = Column(Date, nullable=True)
    aired_to = Column(Date, nullable=True)
    start_season_year = Column(Integer, nullable=True)  # e.g., 2024
    start_season_season = Column(String(10), nullable=True)  # spring, summer, fall, winter
    score = Column(Numeric(3, 2), nullable=True)  # MyAnimeList average score
    rank = Column(Integer, nullable=True)
    popularity = Column(Integer, nullable=True)
    image_url = Column(Text, nullable=True)
    
    # Relationships
    user_lists = relationship("UserAnimeList", back_populates="anime", cascade="all, delete-orphan")
    anidb_mappings = relationship("AniDBMapping", back_populates="anime")
    
    def __repr__(self) -> str:
        return f"<Anime(id={self.id}, mal_id={self.mal_id}, title='{self.title}')>"
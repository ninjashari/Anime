"""
User anime list model for tracking user's anime watching status and progress.
"""
from sqlalchemy import Column, String, Integer, Date, Text, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import BaseModel


class UserAnimeList(BaseModel):
    """
    User anime list model for storing user's anime watching status and progress.
    """
    __tablename__ = "user_anime_lists"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    anime_id = Column(Integer, ForeignKey("anime.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Anime status: watching, completed, on_hold, dropped, plan_to_watch
    status = Column(String(20), nullable=False, index=True)
    score = Column(Integer, nullable=True)  # User's personal score (0-10)
    episodes_watched = Column(Integer, default=0, nullable=False)
    start_date = Column(Date, nullable=True)
    finish_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="anime_lists")
    anime = relationship("Anime", back_populates="user_lists")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'anime_id', name='unique_user_anime'),
        CheckConstraint('score >= 0 AND score <= 10', name='valid_score_range'),
        CheckConstraint('episodes_watched >= 0', name='non_negative_episodes'),
        CheckConstraint(
            "status IN ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')",
            name='valid_status'
        ),
    )
    
    def __repr__(self) -> str:
        return f"<UserAnimeList(id={self.id}, user_id={self.user_id}, anime_id={self.anime_id}, status='{self.status}')>"
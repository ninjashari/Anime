"""
Jellyfin activity model for tracking anime watching progress from Jellyfin webhooks.
"""
from sqlalchemy import Column, String, Integer, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel


class JellyfinActivity(BaseModel):
    """
    Jellyfin activity model for storing anime watching activity from Jellyfin webhooks.
    """
    __tablename__ = "jellyfin_activities"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    anidb_id = Column(Integer, nullable=True, index=True)
    mal_id = Column(Integer, nullable=True, index=True)
    episode_number = Column(Integer, nullable=True)
    watch_duration = Column(Integer, nullable=True)  # Duration watched in seconds
    total_duration = Column(Integer, nullable=True)  # Total episode duration in seconds
    completion_percentage = Column(Numeric(5, 2), nullable=True)  # Percentage of episode watched
    jellyfin_item_id = Column(String(255), nullable=True, index=True)
    processed = Column(Boolean, default=False, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", back_populates="jellyfin_activities")
    
    def __repr__(self) -> str:
        return f"<JellyfinActivity(id={self.id}, user_id={self.user_id}, anidb_id={self.anidb_id}, processed={self.processed})>"
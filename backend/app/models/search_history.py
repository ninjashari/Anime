"""
Search history model for tracking user search queries.
"""
from sqlalchemy import Column, String, Integer, ForeignKey, Index
from sqlalchemy.orm import relationship
from .base import BaseModel


class SearchHistory(BaseModel):
    """
    Search history model for storing user search queries and results.
    """
    __tablename__ = "search_history"
    
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    query = Column(String(255), nullable=False, index=True)
    result_count = Column(Integer, nullable=False, default=0)
    
    # Relationships
    user = relationship("User", back_populates="search_history")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_search_history_user_query', 'user_id', 'query'),
        Index('idx_search_history_user_created', 'user_id', 'created_at'),
    )
    
    def __repr__(self) -> str:
        return f"<SearchHistory(id={self.id}, user_id={self.user_id}, query='{self.query}')>"
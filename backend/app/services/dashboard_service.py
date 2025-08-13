"""
Dashboard service for calculating anime statistics.
"""
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from collections import defaultdict

from app.models.user_anime_list import UserAnimeList
from app.models.anime import Anime
from app.models.user import User


class DashboardService:
    """Service for calculating dashboard statistics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_statistics(self, user_id: int) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a user's anime lists.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Dictionary containing all statistics
        """
        return {
            "total_anime_count": self.get_total_anime_count(user_id),
            "total_episodes_watched": self.get_total_episodes_watched(user_id),
            "time_spent_watching": self.get_time_spent_watching(user_id),
            "time_to_complete_planned": self.get_time_to_complete_planned(user_id),
            "mean_score": self.get_mean_score(user_id),
            "score_distribution": self.get_score_distribution(user_id)
        }
    
    def get_total_anime_count(self, user_id: int) -> int:
        """
        Calculate total anime count across all lists for a user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Total count of anime in user's lists
        """
        count = self.db.query(UserAnimeList).filter(
            UserAnimeList.user_id == user_id
        ).count()
        
        return count
    
    def get_total_episodes_watched(self, user_id: int) -> int:
        """
        Calculate total episode count watched by a user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Total episodes watched across all anime
        """
        result = self.db.query(
            func.sum(UserAnimeList.episodes_watched)
        ).filter(
            UserAnimeList.user_id == user_id
        ).scalar()
        
        return result or 0
    
    def get_time_spent_watching(self, user_id: int) -> Dict[str, int]:
        """
        Calculate time spent watching based on episode data.
        Assumes average episode length of 24 minutes.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Dictionary with time in minutes, hours, and days
        """
        total_episodes = self.get_total_episodes_watched(user_id)
        
        # Assume 24 minutes per episode (standard anime episode length)
        minutes_per_episode = 24
        total_minutes = total_episodes * minutes_per_episode
        
        return {
            "minutes": total_minutes,
            "hours": total_minutes // 60,
            "days": total_minutes // (60 * 24)
        }
    
    def get_time_to_complete_planned(self, user_id: int) -> Dict[str, int]:
        """
        Calculate estimated time to complete planned anime.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Dictionary with estimated time in minutes, hours, and days
        """
        # Get planned anime with episode counts
        planned_anime = self.db.query(
            func.sum(
                case(
                    (Anime.episodes.is_(None), 12),  # Default to 12 episodes if unknown
                    else_=Anime.episodes
                )
            )
        ).join(
            UserAnimeList, UserAnimeList.anime_id == Anime.id
        ).filter(
            and_(
                UserAnimeList.user_id == user_id,
                UserAnimeList.status == 'plan_to_watch'
            )
        ).scalar()
        
        total_episodes = planned_anime or 0
        
        # Assume 24 minutes per episode
        minutes_per_episode = 24
        total_minutes = total_episodes * minutes_per_episode
        
        return {
            "minutes": total_minutes,
            "hours": total_minutes // 60,
            "days": total_minutes // (60 * 24)
        }
    
    def get_mean_score(self, user_id: int) -> Optional[float]:
        """
        Calculate mean score across all rated anime.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Mean score or None if no rated anime
        """
        result = self.db.query(
            func.avg(UserAnimeList.score)
        ).filter(
            and_(
                UserAnimeList.user_id == user_id,
                UserAnimeList.score.is_not(None),
                UserAnimeList.score > 0
            )
        ).scalar()
        
        return round(float(result), 2) if result else None
    
    def get_score_distribution(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get score distribution data for chart display.
        
        Args:
            user_id: The user's ID
            
        Returns:
            List of dictionaries with score and count data
        """
        # Query score distribution
        distribution = self.db.query(
            UserAnimeList.score,
            func.count(UserAnimeList.score).label('count')
        ).filter(
            and_(
                UserAnimeList.user_id == user_id,
                UserAnimeList.score.is_not(None),
                UserAnimeList.score > 0
            )
        ).group_by(UserAnimeList.score).all()
        
        # Create distribution data with all scores 1-10
        score_counts = defaultdict(int)
        for score, count in distribution:
            score_counts[score] = count
        
        # Return data for scores 1-10
        return [
            {"score": score, "count": score_counts[score]}
            for score in range(1, 11)
        ]
    
    def get_status_breakdown(self, user_id: int) -> Dict[str, int]:
        """
        Get breakdown of anime by status.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Dictionary with status counts
        """
        status_counts = self.db.query(
            UserAnimeList.status,
            func.count(UserAnimeList.status).label('count')
        ).filter(
            UserAnimeList.user_id == user_id
        ).group_by(UserAnimeList.status).all()
        
        # Initialize all statuses with 0
        statuses = {
            'watching': 0,
            'completed': 0,
            'on_hold': 0,
            'dropped': 0,
            'plan_to_watch': 0
        }
        
        # Update with actual counts
        for status, count in status_counts:
            statuses[status] = count
        
        return statuses
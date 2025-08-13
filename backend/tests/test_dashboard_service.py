"""
Tests for dashboard service functionality.
"""
import pytest
from datetime import date
from sqlalchemy.orm import Session

from app.services.dashboard_service import DashboardService
from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList


class TestDashboardService:
    """Test cases for DashboardService."""
    
    def test_get_total_anime_count_empty(self, db_session: Session, test_user: User):
        """Test total anime count with no anime in lists."""
        service = DashboardService(db_session)
        count = service.get_total_anime_count(test_user.id)
        assert count == 0
    
    def test_get_total_anime_count_with_anime(self, db_session: Session, test_user: User):
        """Test total anime count with anime in lists."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        db_session.add_all([anime1, anime2])
        db_session.flush()
        
        # Add to user's lists
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="watching",
            episodes_watched=5
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            episodes_watched=24,
            score=8
        )
        db_session.add_all([list1, list2])
        db_session.commit()
        
        service = DashboardService(db_session)
        count = service.get_total_anime_count(test_user.id)
        assert count == 2
    
    def test_get_total_episodes_watched_empty(self, db_session: Session, test_user: User):
        """Test total episodes watched with no anime."""
        service = DashboardService(db_session)
        episodes = service.get_total_episodes_watched(test_user.id)
        assert episodes == 0
    
    def test_get_total_episodes_watched_with_anime(self, db_session: Session, test_user: User):
        """Test total episodes watched with anime."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        db_session.add_all([anime1, anime2])
        db_session.flush()
        
        # Add to user's lists
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="watching",
            episodes_watched=5
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            episodes_watched=24
        )
        db_session.add_all([list1, list2])
        db_session.commit()
        
        service = DashboardService(db_session)
        episodes = service.get_total_episodes_watched(test_user.id)
        assert episodes == 29  # 5 + 24
    
    def test_get_time_spent_watching(self, db_session: Session, test_user: User):
        """Test time spent watching calculation."""
        # Create test anime
        anime = Anime(mal_id=1, title="Test Anime", episodes=12)
        db_session.add(anime)
        db_session.flush()
        
        # Add to user's list with 10 episodes watched
        user_list = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime.id,
            status="watching",
            episodes_watched=10
        )
        db_session.add(user_list)
        db_session.commit()
        
        service = DashboardService(db_session)
        time_data = service.get_time_spent_watching(test_user.id)
        
        # 10 episodes * 24 minutes = 240 minutes
        assert time_data["minutes"] == 240
        assert time_data["hours"] == 4  # 240 / 60
        assert time_data["days"] == 0   # 240 / (60 * 24)
    
    def test_get_time_to_complete_planned(self, db_session: Session, test_user: User):
        """Test time to complete planned anime calculation."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Planned Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Planned Anime 2", episodes=24)
        anime3 = Anime(mal_id=3, title="Planned Anime 3", episodes=None)  # Unknown episodes
        db_session.add_all([anime1, anime2, anime3])
        db_session.flush()
        
        # Add to user's planned list
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="plan_to_watch"
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="plan_to_watch"
        )
        list3 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime3.id,
            status="plan_to_watch"
        )
        db_session.add_all([list1, list2, list3])
        db_session.commit()
        
        service = DashboardService(db_session)
        time_data = service.get_time_to_complete_planned(test_user.id)
        
        # (12 + 24 + 12) episodes * 24 minutes = 1152 minutes
        assert time_data["minutes"] == 1152
        assert time_data["hours"] == 19   # 1152 / 60
        assert time_data["days"] == 0     # 1152 / (60 * 24)
    
    def test_get_mean_score_no_scores(self, db_session: Session, test_user: User):
        """Test mean score with no scored anime."""
        service = DashboardService(db_session)
        mean_score = service.get_mean_score(test_user.id)
        assert mean_score is None
    
    def test_get_mean_score_with_scores(self, db_session: Session, test_user: User):
        """Test mean score calculation with scored anime."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        anime3 = Anime(mal_id=3, title="Test Anime 3", episodes=12)
        db_session.add_all([anime1, anime2, anime3])
        db_session.flush()
        
        # Add to user's lists with scores
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="completed",
            score=8
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            score=6
        )
        list3 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime3.id,
            status="completed",
            score=None  # No score
        )
        db_session.add_all([list1, list2, list3])
        db_session.commit()
        
        service = DashboardService(db_session)
        mean_score = service.get_mean_score(test_user.id)
        
        # (8 + 6) / 2 = 7.0
        assert mean_score == 7.0
    
    def test_get_score_distribution_empty(self, db_session: Session, test_user: User):
        """Test score distribution with no scored anime."""
        service = DashboardService(db_session)
        distribution = service.get_score_distribution(test_user.id)
        
        # Should return all scores 1-10 with count 0
        assert len(distribution) == 10
        for item in distribution:
            assert item["count"] == 0
            assert 1 <= item["score"] <= 10
    
    def test_get_score_distribution_with_scores(self, db_session: Session, test_user: User):
        """Test score distribution with scored anime."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Test Anime 1", episodes=12)
        anime2 = Anime(mal_id=2, title="Test Anime 2", episodes=24)
        anime3 = Anime(mal_id=3, title="Test Anime 3", episodes=12)
        db_session.add_all([anime1, anime2, anime3])
        db_session.flush()
        
        # Add to user's lists with scores
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="completed",
            score=8
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            score=8  # Same score as anime1
        )
        list3 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime3.id,
            status="completed",
            score=6
        )
        db_session.add_all([list1, list2, list3])
        db_session.commit()
        
        service = DashboardService(db_session)
        distribution = service.get_score_distribution(test_user.id)
        
        # Should return all scores 1-10
        assert len(distribution) == 10
        
        # Check specific scores
        score_8_item = next(item for item in distribution if item["score"] == 8)
        assert score_8_item["count"] == 2
        
        score_6_item = next(item for item in distribution if item["score"] == 6)
        assert score_6_item["count"] == 1
        
        # Other scores should have count 0
        for item in distribution:
            if item["score"] not in [6, 8]:
                assert item["count"] == 0
    
    def test_get_status_breakdown_empty(self, db_session: Session, test_user: User):
        """Test status breakdown with no anime."""
        service = DashboardService(db_session)
        breakdown = service.get_status_breakdown(test_user.id)
        
        expected = {
            'watching': 0,
            'completed': 0,
            'on_hold': 0,
            'dropped': 0,
            'plan_to_watch': 0
        }
        assert breakdown == expected
    
    def test_get_status_breakdown_with_anime(self, db_session: Session, test_user: User):
        """Test status breakdown with anime in different statuses."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Watching Anime", episodes=12)
        anime2 = Anime(mal_id=2, title="Completed Anime 1", episodes=24)
        anime3 = Anime(mal_id=3, title="Completed Anime 2", episodes=12)
        anime4 = Anime(mal_id=4, title="Planned Anime", episodes=12)
        db_session.add_all([anime1, anime2, anime3, anime4])
        db_session.flush()
        
        # Add to user's lists with different statuses
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="watching"
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed"
        )
        list3 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime3.id,
            status="completed"
        )
        list4 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime4.id,
            status="plan_to_watch"
        )
        db_session.add_all([list1, list2, list3, list4])
        db_session.commit()
        
        service = DashboardService(db_session)
        breakdown = service.get_status_breakdown(test_user.id)
        
        expected = {
            'watching': 1,
            'completed': 2,
            'on_hold': 0,
            'dropped': 0,
            'plan_to_watch': 1
        }
        assert breakdown == expected
    
    def test_get_user_statistics_comprehensive(self, db_session: Session, test_user: User):
        """Test comprehensive user statistics."""
        # Create test anime
        anime1 = Anime(mal_id=1, title="Watching Anime", episodes=12)
        anime2 = Anime(mal_id=2, title="Completed Anime", episodes=24)
        db_session.add_all([anime1, anime2])
        db_session.flush()
        
        # Add to user's lists
        list1 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime1.id,
            status="watching",
            episodes_watched=5
        )
        list2 = UserAnimeList(
            user_id=test_user.id,
            anime_id=anime2.id,
            status="completed",
            episodes_watched=24,
            score=8
        )
        db_session.add_all([list1, list2])
        db_session.commit()
        
        service = DashboardService(db_session)
        stats = service.get_user_statistics(test_user.id)
        
        # Verify all statistics are present
        assert "total_anime_count" in stats
        assert "total_episodes_watched" in stats
        assert "time_spent_watching" in stats
        assert "time_to_complete_planned" in stats
        assert "mean_score" in stats
        assert "score_distribution" in stats
        
        # Verify specific values
        assert stats["total_anime_count"] == 2
        assert stats["total_episodes_watched"] == 29  # 5 + 24
        assert stats["mean_score"] == 8.0
        assert len(stats["score_distribution"]) == 10
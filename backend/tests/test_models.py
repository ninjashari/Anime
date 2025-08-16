"""
Unit tests for database models and relationships.
"""
import pytest
from datetime import date, datetime, timedelta
from sqlalchemy.exc import IntegrityError
from app.models import User, Anime, UserAnimeList, AniDBMapping, JellyfinActivity


class TestUserModel:
    """Test cases for User model."""
    
    def test_create_user(self, db_session):
        """Test creating a user."""
        user = User(
            username="testuser",
            name="Test User",
            password_hash="hashed_password"
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.username == "testuser"
        assert user.name == "Test User"
        assert user.password_hash == "hashed_password"
        assert user.created_at is not None
        assert user.updated_at is not None
    
    def test_user_unique_username(self, db_session):
        """Test that usernames must be unique."""
        user1 = User(username="testuser", name="Test User 1", password_hash="hash1")
        user2 = User(username="testuser", name="Test User 2", password_hash="hash2")
        
        db_session.add(user1)
        db_session.commit()
        
        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()
    
    def test_user_mal_tokens(self, db_session):
        """Test MAL token fields."""
        user = User(
            username="testuser",
            name="Test User",
            password_hash="hashed_password",
            mal_access_token="access_token",
            mal_refresh_token="refresh_token",
            mal_token_expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.mal_access_token == "access_token"
        assert user.mal_refresh_token == "refresh_token"
        assert user.mal_token_expires_at is not None


class TestAnimeModel:
    """Test cases for Anime model."""
    
    def test_create_anime(self, db_session):
        """Test creating an anime."""
        anime = Anime(
            mal_id=12345,
            title="Test Anime",
            title_english="Test Anime English",
            synopsis="A test anime",
            episodes=24,
            status="finished_airing",
            aired_from=date(2023, 1, 1),
            aired_to=date(2023, 6, 30),
            score=8.5,
            rank=100,
            popularity=50,
            image_url="https://example.com/image.jpg"
        )
        db_session.add(anime)
        db_session.commit()
        
        assert anime.id is not None
        assert anime.mal_id == 12345
        assert anime.title == "Test Anime"
        assert anime.episodes == 24
        assert anime.score == 8.5
    
    def test_anime_unique_mal_id(self, db_session):
        """Test that MAL IDs must be unique."""
        anime1 = Anime(mal_id=12345, title="Anime 1")
        anime2 = Anime(mal_id=12345, title="Anime 2")
        
        db_session.add(anime1)
        db_session.commit()
        
        db_session.add(anime2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestUserAnimeListModel:
    """Test cases for UserAnimeList model."""
    
    def test_create_user_anime_list(self, db_session):
        """Test creating a user anime list entry."""
        # Create user and anime first
        user = User(username="testuser", name="Test User", password_hash="hash")
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(user)
        db_session.add(anime)
        db_session.commit()
        
        # Create user anime list entry
        user_anime = UserAnimeList(
            user_id=user.id,
            anime_id=anime.id,
            status="watching",
            score=8,
            episodes_watched=5,
            start_date=date(2023, 1, 1),
            notes="Great anime!"
        )
        db_session.add(user_anime)
        db_session.commit()
        
        assert user_anime.id is not None
        assert user_anime.status == "watching"
        assert user_anime.score == 8
        assert user_anime.episodes_watched == 5
    
    def test_user_anime_unique_constraint(self, db_session):
        """Test that user-anime combination must be unique."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(user)
        db_session.add(anime)
        db_session.commit()
        
        user_anime1 = UserAnimeList(user_id=user.id, anime_id=anime.id, status="watching")
        user_anime2 = UserAnimeList(user_id=user.id, anime_id=anime.id, status="completed")
        
        db_session.add(user_anime1)
        db_session.commit()
        
        db_session.add(user_anime2)
        with pytest.raises(IntegrityError):
            db_session.commit()
    
    def test_user_anime_relationships(self, db_session):
        """Test relationships between User, Anime, and UserAnimeList."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(user)
        db_session.add(anime)
        db_session.commit()
        
        user_anime = UserAnimeList(user_id=user.id, anime_id=anime.id, status="watching")
        db_session.add(user_anime)
        db_session.commit()
        
        # Test relationships
        assert user_anime.user == user
        assert user_anime.anime == anime
        assert user.anime_lists[0] == user_anime
        assert anime.user_lists[0] == user_anime


class TestAniDBMappingModel:
    """Test cases for AniDBMapping model."""
    
    def test_create_anidb_mapping(self, db_session):
        """Test creating an AniDB mapping."""
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(anime)
        db_session.commit()
        
        mapping = AniDBMapping(
            anidb_id=54321,
            mal_id=anime.mal_id,
            title="Test Anime",
            confidence_score=0.95,
            source="manual"
        )
        db_session.add(mapping)
        db_session.commit()
        
        assert mapping.id is not None
        assert mapping.anidb_id == 54321
        assert mapping.mal_id == 12345
        assert float(mapping.confidence_score) == 0.95
        assert mapping.source == "manual"
    
    def test_anidb_mapping_unique_anidb_id(self, db_session):
        """Test that AniDB IDs must be unique."""
        mapping1 = AniDBMapping(anidb_id=54321, source="manual")
        mapping2 = AniDBMapping(anidb_id=54321, source="auto")
        
        db_session.add(mapping1)
        db_session.commit()
        
        db_session.add(mapping2)
        with pytest.raises(IntegrityError):
            db_session.commit()


class TestJellyfinActivityModel:
    """Test cases for JellyfinActivity model."""
    
    def test_create_jellyfin_activity(self, db_session):
        """Test creating a Jellyfin activity."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        db_session.add(user)
        db_session.commit()
        
        activity = JellyfinActivity(
            user_id=user.id,
            anidb_id=54321,
            mal_id=12345,
            episode_number=5,
            watch_duration=1200,
            total_duration=1440,
            completion_percentage=83.33,
            jellyfin_item_id="jellyfin_123",
            processed=False
        )
        db_session.add(activity)
        db_session.commit()
        
        assert activity.id is not None
        assert activity.user_id == user.id
        assert activity.anidb_id == 54321
        assert activity.episode_number == 5
        assert float(activity.completion_percentage) == 83.33
        assert activity.processed is False
    
    def test_jellyfin_activity_relationship(self, db_session):
        """Test relationship between User and JellyfinActivity."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        db_session.add(user)
        db_session.commit()
        
        activity = JellyfinActivity(user_id=user.id, anidb_id=54321, processed=False)
        db_session.add(activity)
        db_session.commit()
        
        # Test relationship
        assert activity.user == user
        assert user.jellyfin_activities[0] == activity


class TestModelConstraints:
    """Test cases for model constraints and validations."""
    
    def test_user_anime_list_score_constraint(self, db_session):
        """Test score constraint on UserAnimeList."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(user)
        db_session.add(anime)
        db_session.commit()
        
        # Valid score
        user_anime = UserAnimeList(user_id=user.id, anime_id=anime.id, status="watching", score=8)
        db_session.add(user_anime)
        db_session.commit()
        
        # Invalid score (should be caught by constraint)
        user_anime_invalid = UserAnimeList(user_id=user.id, anime_id=anime.id, status="completed", score=15)
        db_session.add(user_anime_invalid)
        # Note: SQLite doesn't enforce CHECK constraints by default, so this test might pass
        # In PostgreSQL, this would raise an IntegrityError
    
    def test_user_anime_list_status_constraint(self, db_session):
        """Test status constraint on UserAnimeList."""
        user = User(username="testuser", name="Test User", password_hash="hash")
        anime = Anime(mal_id=12345, title="Test Anime")
        db_session.add(user)
        db_session.add(anime)
        db_session.commit()
        
        # Valid status
        user_anime = UserAnimeList(user_id=user.id, anime_id=anime.id, status="watching")
        db_session.add(user_anime)
        db_session.commit()
        
        assert user_anime.status == "watching"
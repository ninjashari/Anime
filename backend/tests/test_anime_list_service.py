"""
Tests for anime list service.
"""
import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.anime import Anime
from app.models.user_anime_list import UserAnimeList
from app.schemas.anime_list import AnimeListItemUpdate, EpisodeProgressUpdate, BatchUpdateItem
from app.services.anime_list_service import AnimeListService


@pytest.fixture
def anime_list_service():
    """Create anime list service instance."""
    service = AnimeListService()
    # Mock the MAL service to avoid initialization issues
    service.mal_service = MagicMock()
    return service


@pytest.fixture
def sample_user(db_session: Session):
    """Create a sample user."""
    user = User(
        username="testuser",
        name="Test User",
        password_hash="hashed_password",
        mal_access_token="test_token",
        mal_refresh_token="refresh_token",
        mal_token_expires_at=datetime.utcnow()
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_anime(db_session: Session):
    """Create a sample anime."""
    anime = Anime(
        mal_id=12345,
        title="Test Anime",
        title_english="Test Anime English",
        synopsis="Test synopsis",
        episodes=24,
        status="finished_airing",
        score=8.5,
        rank=100,
        popularity=50,
        image_url="https://example.com/image.jpg"
    )
    db_session.add(anime)
    db_session.commit()
    db_session.refresh(anime)
    return anime


@pytest.fixture
def sample_anime_list_item(db_session: Session, sample_user: User, sample_anime: Anime):
    """Create a sample anime list item."""
    item = UserAnimeList(
        user_id=sample_user.id,
        anime_id=sample_anime.id,
        status="watching",
        score=8,
        episodes_watched=12,
        start_date=date(2024, 1, 1),
        notes="Great anime!"
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


class TestAnimeListService:
    """Test cases for AnimeListService."""
    
    def test_get_anime_lists_by_status_all(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test getting all anime lists without status filter."""
        items, total = anime_list_service.get_anime_lists_by_status(db_session, sample_user)
        
        assert total == 1
        assert len(items) == 1
        assert items[0].id == sample_anime_list_item.id
        assert items[0].status == "watching"
    
    def test_get_anime_lists_by_status_filtered(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test getting anime lists filtered by status."""
        # Test with matching status
        items, total = anime_list_service.get_anime_lists_by_status(
            db_session, sample_user, status="watching"
        )
        assert total == 1
        assert len(items) == 1
        
        # Test with non-matching status
        items, total = anime_list_service.get_anime_lists_by_status(
            db_session, sample_user, status="completed"
        )
        assert total == 0
        assert len(items) == 0
    
    def test_get_anime_lists_pagination(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime: Anime
    ):
        """Test pagination in anime lists."""
        # Create multiple anime list items
        for i in range(5):
            anime = Anime(
                mal_id=54321 + i,  # Use different base ID to avoid conflicts
                title=f"Test Anime {i}",
                episodes=24
            )
            db_session.add(anime)
            db_session.commit()
            
            item = UserAnimeList(
                user_id=sample_user.id,
                anime_id=anime.id,
                status="watching",
                episodes_watched=i
            )
            db_session.add(item)
        
        db_session.commit()
        
        # Test first page
        items, total = anime_list_service.get_anime_lists_by_status(
            db_session, sample_user, page=1, per_page=3
        )
        assert total == 5
        assert len(items) == 3
        
        # Test second page
        items, total = anime_list_service.get_anime_lists_by_status(
            db_session, sample_user, page=2, per_page=3
        )
        assert total == 5
        assert len(items) == 2
    
    def test_get_anime_list_item(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test getting a specific anime list item."""
        item = anime_list_service.get_anime_list_item(
            db_session, sample_user, sample_anime_list_item.anime_id
        )
        
        assert item is not None
        assert item.id == sample_anime_list_item.id
        assert item.status == "watching"
        assert item.episodes_watched == 12
    
    def test_get_anime_list_item_not_found(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User
    ):
        """Test getting a non-existent anime list item."""
        item = anime_list_service.get_anime_list_item(db_session, sample_user, 99999)
        assert item is None
    
    @pytest.mark.asyncio
    async def test_update_anime_status_success(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test successful anime status update."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        anime_list_service.mal_service = mock_mal_service
        
        update_data = AnimeListItemUpdate(
            status="completed",
            score=9,
            episodes_watched=24
        )
        
        updated_item = await anime_list_service.update_anime_status(
            db_session, sample_user, sample_anime_list_item.anime_id, update_data
        )
        
        assert updated_item.status == "completed"
        assert updated_item.score == 9
        assert updated_item.episodes_watched == 24
        
        # Verify MAL service was called
        anime_list_service.mal_service.ensure_valid_token.assert_called_once_with(db_session, sample_user)
        anime_list_service.mal_service.update_anime_list_status.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_update_anime_status_not_found(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User
    ):
        """Test updating non-existent anime status."""
        update_data = AnimeListItemUpdate(status="completed")
        
        with pytest.raises(ValueError, match="Anime not found in user's list"):
            await anime_list_service.update_anime_status(
                db_session, sample_user, 99999, update_data
            )
    
    @pytest.mark.asyncio
    async def test_update_episode_progress(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test updating episode progress."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        anime_list_service.mal_service = mock_mal_service
        
        progress_data = EpisodeProgressUpdate(episodes_watched=20)
        
        updated_item = await anime_list_service.update_episode_progress(
            db_session, sample_user, sample_anime_list_item.anime_id, progress_data
        )
        
        assert updated_item.episodes_watched == 20
    
    @pytest.mark.asyncio
    async def test_remove_anime_from_list_success(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime_list_item: UserAnimeList
    ):
        """Test successful anime removal from list."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.delete_anime_from_list.return_value = None
        anime_list_service.mal_service = mock_mal_service
        
        anime_id = sample_anime_list_item.anime_id
        
        success = await anime_list_service.remove_anime_from_list(
            db_session, sample_user, anime_id
        )
        
        assert success is True
        
        # Verify item was removed from database
        item = anime_list_service.get_anime_list_item(db_session, sample_user, anime_id)
        assert item is None
        
        # Verify MAL service was called
        anime_list_service.mal_service.ensure_valid_token.assert_called_once_with(db_session, sample_user)
        anime_list_service.mal_service.delete_anime_from_list.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_remove_anime_from_list_not_found(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User
    ):
        """Test removing non-existent anime from list."""
        success = await anime_list_service.remove_anime_from_list(
            db_session, sample_user, 99999
        )
        assert success is False
    
    @pytest.mark.asyncio
    async def test_batch_update_anime_list(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime: Anime
    ):
        """Test batch update of anime list items."""
        # Mock MAL service
        mock_mal_service = AsyncMock()
        mock_mal_service.ensure_valid_token.return_value = "valid_token"
        mock_mal_service.update_anime_list_status.return_value = {}
        anime_list_service.mal_service = mock_mal_service
        
        # Create multiple anime list items
        items = []
        for i in range(3):
            anime = Anime(
                mal_id=67890 + i,  # Use different base ID to avoid conflicts
                title=f"Test Anime {i}",
                episodes=24
            )
            db_session.add(anime)
            db_session.commit()
            
            item = UserAnimeList(
                user_id=sample_user.id,
                anime_id=anime.id,
                status="watching",
                episodes_watched=i
            )
            db_session.add(item)
            items.append(item)
        
        db_session.commit()
        
        # Prepare batch updates
        updates = [
            BatchUpdateItem(anime_id=items[0].anime_id, status="completed", score=8),
            BatchUpdateItem(anime_id=items[1].anime_id, episodes_watched=15),
            BatchUpdateItem(anime_id=items[2].anime_id, status="on_hold")
        ]
        
        result = await anime_list_service.batch_update_anime_list(
            db_session, sample_user, updates
        )
        
        assert result["success_count"] == 3
        assert result["error_count"] == 0
        assert len(result["errors"]) == 0
        
        # Verify updates were applied
        updated_item_0 = anime_list_service.get_anime_list_item(
            db_session, sample_user, items[0].anime_id
        )
        assert updated_item_0.status == "completed"
        assert updated_item_0.score == 8
        
        updated_item_1 = anime_list_service.get_anime_list_item(
            db_session, sample_user, items[1].anime_id
        )
        assert updated_item_1.episodes_watched == 15
        
        updated_item_2 = anime_list_service.get_anime_list_item(
            db_session, sample_user, items[2].anime_id
        )
        assert updated_item_2.status == "on_hold"
    
    def test_get_anime_list_stats(
        self, 
        anime_list_service: AnimeListService, 
        db_session: Session, 
        sample_user: User,
        sample_anime: Anime
    ):
        """Test getting anime list statistics."""
        # Create multiple anime list items with different statuses
        statuses = ["watching", "completed", "on_hold", "watching", "completed"]
        episodes_watched = [5, 24, 10, 8, 12]
        scores = [None, 9, 7, None, 8]
        
        for i, (status, episodes, score) in enumerate(zip(statuses, episodes_watched, scores)):
            anime = Anime(
                mal_id=98765 + i,  # Use different base ID to avoid conflicts
                title=f"Test Anime {i}",
                episodes=24
            )
            db_session.add(anime)
            db_session.commit()
            
            item = UserAnimeList(
                user_id=sample_user.id,
                anime_id=anime.id,
                status=status,
                episodes_watched=episodes,
                score=score
            )
            db_session.add(item)
        
        db_session.commit()
        
        stats = anime_list_service.get_anime_list_stats(db_session, sample_user)
        
        assert stats["total_anime"] == 5
        assert stats["by_status"]["watching"] == 2
        assert stats["by_status"]["completed"] == 2
        assert stats["by_status"]["on_hold"] == 1
        assert stats["total_episodes_watched"] == sum(episodes_watched)
        assert stats["average_score"] == 8.0  # (9 + 7 + 8) / 3
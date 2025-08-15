"""
Test configuration and fixtures.
"""
import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Override database URL for testing BEFORE importing app modules
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from app.models.base import Base
from app.core.database import get_db
from fastapi.testclient import TestClient

# Create test database engine
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Create session
    session = TestingSessionLocal()
    
    try:
        yield session
    finally:
        session.close()
        # Drop tables after test
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    # Import here to avoid circular imports
    from app.main import app
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def test_user(db_session):
    """Create a test user for testing."""
    from app.services.auth_service import auth_service
    
    user = auth_service.create_user(
        db_session,
        username="testuser",
        name="Test User",
        password="password123"
    )
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Create authentication headers for testing."""
    from app.services.auth_service import auth_service
    
    access_token = auth_service.create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {access_token}"}


def create_test_user(db_session, username="testuser", name="Test User", password="testpass123"):
    """Create a test user."""
    from app.services.auth_service import auth_service
    
    user = auth_service.create_user(
        db_session,
        username=username,
        name=name,
        password=password
    )
    return user


def create_test_anime(db_session, mal_id=1, title="Test Anime", episodes=12):
    """Create a test anime."""
    from app.models.anime import Anime
    
    anime = Anime(
        mal_id=mal_id,
        title=title,
        episodes=episodes,
        status="finished_airing"
    )
    db_session.add(anime)
    db_session.commit()
    db_session.refresh(anime)
    return anime
"""
Unit tests for authentication service.
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.services.auth_service import auth_service
from app.models.user import User


class TestAuthService:
    """Test cases for AuthService class."""
    
    def test_password_hashing(self):
        """Test password hashing and verification."""
        password = "test_password_123"
        
        # Test password hashing
        hashed = auth_service.get_password_hash(password)
        assert hashed != password
        assert len(hashed) > 0
        
        # Test password verification
        assert auth_service.verify_password(password, hashed) is True
        assert auth_service.verify_password("wrong_password", hashed) is False
    
    def test_create_access_token(self):
        """Test access token creation."""
        data = {"sub": "123"}
        token = auth_service.create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token
        payload = auth_service.verify_token(token, "access")
        assert payload is not None
        assert payload["sub"] == "123"
        assert payload["type"] == "access"
    
    def test_create_refresh_token(self):
        """Test refresh token creation."""
        data = {"sub": "123"}
        token = auth_service.create_refresh_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Verify token
        payload = auth_service.verify_token(token, "refresh")
        assert payload is not None
        assert payload["sub"] == "123"
        assert payload["type"] == "refresh"
    
    def test_create_access_token_with_custom_expiry(self):
        """Test access token creation with custom expiry."""
        data = {"sub": "123"}
        expires_delta = timedelta(minutes=60)
        token = auth_service.create_access_token(data, expires_delta)
        
        payload = auth_service.verify_token(token, "access")
        assert payload is not None
        assert payload["sub"] == "123"
        assert payload["type"] == "access"
        
        # Check that expiry timestamp exists and is in the future
        exp_timestamp = payload["exp"]
        assert exp_timestamp > datetime.utcnow().timestamp()
    
    def test_verify_token_invalid(self):
        """Test token verification with invalid tokens."""
        # Test invalid token
        assert auth_service.verify_token("invalid_token", "access") is None
        
        # Test wrong token type
        refresh_token = auth_service.create_refresh_token({"sub": "123"})
        assert auth_service.verify_token(refresh_token, "access") is None
        
        access_token = auth_service.create_access_token({"sub": "123"})
        assert auth_service.verify_token(access_token, "refresh") is None
    
    def test_create_user_success(self, db_session: Session):
        """Test successful user creation."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        user = auth_service.create_user(db_session, username, name, password)
        
        assert user.id is not None
        assert user.username == username
        assert user.name == name
        assert user.password_hash != password
        assert auth_service.verify_password(password, user.password_hash)
        assert user.created_at is not None
        assert user.updated_at is not None
    
    def test_create_user_duplicate_username(self, db_session: Session):
        """Test user creation with duplicate username."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create first user
        auth_service.create_user(db_session, username, name, password)
        
        # Try to create second user with same username
        with pytest.raises(HTTPException) as exc_info:
            auth_service.create_user(db_session, username, "Another User", "password456")
        
        assert exc_info.value.status_code == 400
        assert "Username already registered" in str(exc_info.value.detail)
    
    def test_authenticate_user_success(self, db_session: Session):
        """Test successful user authentication."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create user
        created_user = auth_service.create_user(db_session, username, name, password)
        
        # Authenticate user
        authenticated_user = auth_service.authenticate_user(db_session, username, password)
        
        assert authenticated_user is not None
        assert authenticated_user.id == created_user.id
        assert authenticated_user.username == username
    
    def test_authenticate_user_wrong_username(self, db_session: Session):
        """Test authentication with wrong username."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create user
        auth_service.create_user(db_session, username, name, password)
        
        # Try to authenticate with wrong username
        authenticated_user = auth_service.authenticate_user(db_session, "wronguser", password)
        assert authenticated_user is None
    
    def test_authenticate_user_wrong_password(self, db_session: Session):
        """Test authentication with wrong password."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create user
        auth_service.create_user(db_session, username, name, password)
        
        # Try to authenticate with wrong password
        authenticated_user = auth_service.authenticate_user(db_session, username, "wrongpassword")
        assert authenticated_user is None
    
    def test_get_user_by_id(self, db_session: Session):
        """Test getting user by ID."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create user
        created_user = auth_service.create_user(db_session, username, name, password)
        
        # Get user by ID
        retrieved_user = auth_service.get_user_by_id(db_session, created_user.id)
        
        assert retrieved_user is not None
        assert retrieved_user.id == created_user.id
        assert retrieved_user.username == username
    
    def test_get_user_by_id_not_found(self, db_session: Session):
        """Test getting user by non-existent ID."""
        retrieved_user = auth_service.get_user_by_id(db_session, 999)
        assert retrieved_user is None
    
    def test_get_user_by_username(self, db_session: Session):
        """Test getting user by username."""
        username = "testuser"
        name = "Test User"
        password = "password123"
        
        # Create user
        created_user = auth_service.create_user(db_session, username, name, password)
        
        # Get user by username
        retrieved_user = auth_service.get_user_by_username(db_session, username)
        
        assert retrieved_user is not None
        assert retrieved_user.id == created_user.id
        assert retrieved_user.username == username
    
    def test_get_user_by_username_not_found(self, db_session: Session):
        """Test getting user by non-existent username."""
        retrieved_user = auth_service.get_user_by_username(db_session, "nonexistent")
        assert retrieved_user is None
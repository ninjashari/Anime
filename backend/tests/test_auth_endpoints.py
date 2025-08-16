"""
Integration tests for authentication API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.auth_service import auth_service
from app.models.user import User


class TestAuthEndpoints:
    """Test cases for authentication API endpoints."""
    
    def test_register_user_success(self, client: TestClient, db_session: Session):
        """Test successful user registration."""
        user_data = {
            "username": "testuser",
            "name": "Test User",
            "password": "password123"
        }
        
        response = client.post("/api/auth/register", json=user_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Check response structure
        assert "user" in data
        assert "tokens" in data
        
        # Check user data
        user = data["user"]
        assert user["username"] == user_data["username"]
        assert user["name"] == user_data["name"]
        assert "id" in user
        
        # Check tokens
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
        
        # Verify user was created in database
        db_user = db_session.query(User).filter(User.username == user_data["username"]).first()
        assert db_user is not None
        assert db_user.username == user_data["username"]
        assert db_user.name == user_data["name"]
    
    def test_register_user_duplicate_username(self, client: TestClient, db_session: Session):
        """Test user registration with duplicate username."""
        user_data = {
            "username": "testuser",
            "name": "Test User",
            "password": "password123"
        }
        
        # Register first user
        response1 = client.post("/api/auth/register", json=user_data)
        assert response1.status_code == 201
        
        # Try to register second user with same username
        user_data2 = {
            "username": "testuser",
            "name": "Another User",
            "password": "password456"
        }
        
        response2 = client.post("/api/auth/register", json=user_data2)
        assert response2.status_code == 400
        assert "Username already registered" in response2.json()["detail"]
    
    def test_register_user_invalid_data(self, client: TestClient):
        """Test user registration with invalid data."""
        # Test missing fields
        response = client.post("/api/auth/register", json={})
        assert response.status_code == 422
        
        # Test short username
        user_data = {
            "username": "ab",  # Too short
            "name": "Test User",
            "password": "password123"
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 422
        
        # Test short password
        user_data = {
            "username": "testuser",
            "name": "Test User",
            "password": "12345"  # Too short
        }
        response = client.post("/api/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_login_user_success(self, client: TestClient, db_session: Session):
        """Test successful user login."""
        # Create user first
        username = "testuser"
        password = "password123"
        auth_service.create_user(db_session, username, "Test User", password)
        
        # Login
        login_data = {
            "username": username,
            "password": password
        }
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "user" in data
        assert "tokens" in data
        
        # Check user data
        user = data["user"]
        assert user["username"] == username
        
        # Check tokens
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
    
    def test_login_user_wrong_username(self, client: TestClient, db_session: Session):
        """Test login with wrong username."""
        # Create user first
        auth_service.create_user(db_session, "testuser", "Test User", "password123")
        
        # Try to login with wrong username
        login_data = {
            "username": "wronguser",
            "password": "password123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_login_user_wrong_password(self, client: TestClient, db_session: Session):
        """Test login with wrong password."""
        # Create user first
        auth_service.create_user(db_session, "testuser", "Test User", "password123")
        
        # Try to login with wrong password
        login_data = {
            "username": "testuser",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Incorrect username or password" in response.json()["detail"]
    
    def test_refresh_token_success(self, client: TestClient, db_session: Session):
        """Test successful token refresh."""
        # Create user and get tokens
        user = auth_service.create_user(db_session, "testuser", "Test User", "password123")
        refresh_token = auth_service.create_refresh_token({"sub": str(user.id)})
        
        # Refresh token
        refresh_data = {
            "refresh_token": refresh_token
        }
        
        response = client.post("/api/auth/refresh", json=refresh_data)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check tokens
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        
        # Verify new tokens are valid (they might be the same if generated at same time)
        new_refresh_token = data["refresh_token"]
        payload = auth_service.verify_token(new_refresh_token, "refresh")
        assert payload is not None
        assert payload["sub"] == str(user.id)
    
    def test_refresh_token_invalid(self, client: TestClient):
        """Test token refresh with invalid token."""
        refresh_data = {
            "refresh_token": "invalid_token"
        }
        
        response = client.post("/api/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]
    
    def test_refresh_token_wrong_type(self, client: TestClient, db_session: Session):
        """Test token refresh with access token instead of refresh token."""
        # Create user and get access token
        user = auth_service.create_user(db_session, "testuser", "Test User", "password123")
        access_token = auth_service.create_access_token({"sub": str(user.id)})
        
        # Try to refresh with access token
        refresh_data = {
            "refresh_token": access_token
        }
        
        response = client.post("/api/auth/refresh", json=refresh_data)
        
        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]
    
    def test_get_current_user_profile_success(self, client: TestClient, db_session: Session):
        """Test getting current user profile with valid token."""
        # Create user and get access token
        user = auth_service.create_user(db_session, "testuser", "Test User", "password123")
        access_token = auth_service.create_access_token({"sub": str(user.id)})
        
        # Get user profile
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == user.id
        assert data["username"] == user.username
        assert data["name"] == user.name
        assert data["mal_token_expires_at"] is None
    
    def test_get_current_user_profile_no_token(self, client: TestClient):
        """Test getting current user profile without token."""
        response = client.get("/api/auth/me")
        
        assert response.status_code == 403  # No Authorization header
    
    def test_get_current_user_profile_invalid_token(self, client: TestClient):
        """Test getting current user profile with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]
    
    def test_get_current_user_profile_expired_token(self, client: TestClient, db_session: Session):
        """Test getting current user profile with expired token."""
        # Create user
        user = auth_service.create_user(db_session, "testuser", "Test User", "password123")
        
        # Create expired token (manually create with past expiry)
        from datetime import datetime, timedelta
        from jose import jwt
        from app.core.config import settings
        
        expired_payload = {
            "sub": str(user.id),
            "exp": datetime.utcnow() - timedelta(minutes=1),  # Expired 1 minute ago
            "type": "access"
        }
        expired_token = jwt.encode(expired_payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        # Try to get profile with expired token
        headers = {"Authorization": f"Bearer {expired_token}"}
        response = client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]
    
    def test_logout_user_success(self, client: TestClient, db_session: Session):
        """Test user logout."""
        # Create user and get access token
        user = auth_service.create_user(db_session, "testuser", "Test User", "password123")
        access_token = auth_service.create_access_token({"sub": str(user.id)})
        
        # Logout
        headers = {"Authorization": f"Bearer {access_token}"}
        response = client.post("/api/auth/logout", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "Successfully logged out" in data["message"]
    
    def test_logout_user_no_token(self, client: TestClient):
        """Test logout without token."""
        response = client.post("/api/auth/logout")
        
        assert response.status_code == 403  # No Authorization header
    
    def test_complete_auth_flow(self, client: TestClient, db_session: Session):
        """Test complete authentication flow: register -> login -> refresh -> profile -> logout."""
        # 1. Register
        user_data = {
            "username": "testuser",
            "name": "Test User",
            "password": "password123"
        }
        
        register_response = client.post("/api/auth/register", json=user_data)
        assert register_response.status_code == 201
        register_data = register_response.json()
        
        # 2. Login
        login_data = {
            "username": user_data["username"],
            "password": user_data["password"]
        }
        
        login_response = client.post("/api/auth/login", json=login_data)
        assert login_response.status_code == 200
        login_data = login_response.json()
        
        # 3. Refresh token
        refresh_data = {
            "refresh_token": login_data["tokens"]["refresh_token"]
        }
        
        refresh_response = client.post("/api/auth/refresh", json=refresh_data)
        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        
        # 4. Get profile
        headers = {"Authorization": f"Bearer {refresh_data['access_token']}"}
        profile_response = client.get("/api/auth/me", headers=headers)
        assert profile_response.status_code == 200
        profile_data = profile_response.json()
        assert profile_data["username"] == user_data["username"]
        
        # 5. Logout
        logout_response = client.post("/api/auth/logout", headers=headers)
        assert logout_response.status_code == 200
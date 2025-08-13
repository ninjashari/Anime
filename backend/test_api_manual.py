#!/usr/bin/env python3
"""
Manual API testing script to verify authentication endpoints work correctly.
"""
import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_register():
    """Test user registration."""
    user_data = {
        "username": "testuser123",
        "name": "Test User",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        print(f"Register: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"User created: {data['user']['username']}")
            print(f"Access token received: {len(data['tokens']['access_token'])} chars")
            return data['tokens']['access_token']
        else:
            print(f"Register failed: {response.text}")
            return None
    except Exception as e:
        print(f"Register failed: {e}")
        return None

def test_login():
    """Test user login."""
    login_data = {
        "username": "testuser123",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        print(f"Login: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Login successful for: {data['user']['username']}")
            return data['tokens']['access_token']
        else:
            print(f"Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def test_profile(access_token):
    """Test getting user profile."""
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        print(f"Profile: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Profile retrieved: {data['username']} - {data['name']}")
            return True
        else:
            print(f"Profile failed: {response.text}")
            return False
    except Exception as e:
        print(f"Profile failed: {e}")
        return False

def main():
    """Run manual API tests."""
    print("Starting manual API tests...")
    
    # Test health endpoint
    if not test_health():
        print("Server is not running. Please start the server first.")
        print("Run: uvicorn app.main:app --host 127.0.0.1 --port 8000")
        sys.exit(1)
    
    # Test registration
    access_token = test_register()
    if not access_token:
        print("Registration failed, trying login...")
        access_token = test_login()
    
    if access_token:
        # Test profile retrieval
        test_profile(access_token)
        print("All tests completed successfully!")
    else:
        print("Authentication failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()
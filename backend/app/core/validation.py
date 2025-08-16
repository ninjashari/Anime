"""
Input validation utilities and decorators.
"""
import re
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, validator
from fastapi import HTTPException, status

from app.core.exceptions import ValidationError


class ValidationUtils:
    """Utility class for common validation functions."""
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Validate username format."""
        if not username:
            raise ValidationError("Username is required")
        
        if len(username) < 3:
            raise ValidationError("Username must be at least 3 characters long")
        
        if len(username) > 50:
            raise ValidationError("Username must be no more than 50 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            raise ValidationError("Username can only contain letters, numbers, underscores, and hyphens")
        
        return username.lower()
    
    @staticmethod
    def validate_password(password: str) -> str:
        """Validate password strength."""
        if not password:
            raise ValidationError("Password is required")
        
        if len(password) < 8:
            raise ValidationError("Password must be at least 8 characters long")
        
        if len(password) > 128:
            raise ValidationError("Password must be no more than 128 characters long")
        
        # Check for at least one letter and one number
        if not re.search(r'[a-zA-Z]', password):
            raise ValidationError("Password must contain at least one letter")
        
        if not re.search(r'\d', password):
            raise ValidationError("Password must contain at least one number")
        
        return password
    
    @staticmethod
    def validate_email(email: str) -> str:
        """Validate email format."""
        if not email:
            raise ValidationError("Email is required")
        
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            raise ValidationError("Invalid email format")
        
        return email.lower()
    
    @staticmethod
    def validate_anime_score(score: Optional[int]) -> Optional[int]:
        """Validate anime score (0-10)."""
        if score is None:
            return None
        
        if not isinstance(score, int):
            raise ValidationError("Score must be an integer")
        
        if score < 0 or score > 10:
            raise ValidationError("Score must be between 0 and 10")
        
        return score
    
    @staticmethod
    def validate_episode_count(episodes: Optional[int]) -> Optional[int]:
        """Validate episode count."""
        if episodes is None:
            return None
        
        if not isinstance(episodes, int):
            raise ValidationError("Episode count must be an integer")
        
        if episodes < 0:
            raise ValidationError("Episode count cannot be negative")
        
        if episodes > 10000:  # Reasonable upper limit
            raise ValidationError("Episode count seems unreasonably high")
        
        return episodes
    
    @staticmethod
    def validate_anime_status(status: str) -> str:
        """Validate anime status."""
        valid_statuses = [
            "watching", 
            "completed", 
            "on_hold", 
            "dropped", 
            "plan_to_watch"
        ]
        
        if status not in valid_statuses:
            raise ValidationError(f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
        
        return status
    
    @staticmethod
    def validate_mal_id(mal_id: int) -> int:
        """Validate MyAnimeList ID."""
        if not isinstance(mal_id, int):
            raise ValidationError("MyAnimeList ID must be an integer")
        
        if mal_id <= 0:
            raise ValidationError("MyAnimeList ID must be positive")
        
        return mal_id
    
    @staticmethod
    def validate_anidb_id(anidb_id: int) -> int:
        """Validate AniDB ID."""
        if not isinstance(anidb_id, int):
            raise ValidationError("AniDB ID must be an integer")
        
        if anidb_id <= 0:
            raise ValidationError("AniDB ID must be positive")
        
        return anidb_id
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = None) -> str:
        """Sanitize string input."""
        if not isinstance(value, str):
            raise ValidationError("Value must be a string")
        
        # Strip whitespace
        value = value.strip()
        
        if not value:
            raise ValidationError("Value cannot be empty")
        
        if max_length and len(value) > max_length:
            raise ValidationError(f"Value must be no more than {max_length} characters long")
        
        return value
    
    @staticmethod
    def validate_search_query(query: str) -> str:
        """Validate search query."""
        if not query:
            raise ValidationError("Search query is required")
        
        query = query.strip()
        
        if len(query) < 2:
            raise ValidationError("Search query must be at least 2 characters long")
        
        if len(query) > 100:
            raise ValidationError("Search query must be no more than 100 characters long")
        
        return query
    
    @staticmethod
    def validate_pagination(offset: int = 0, limit: int = 20) -> tuple[int, int]:
        """Validate pagination parameters."""
        if not isinstance(offset, int) or offset < 0:
            raise ValidationError("Offset must be a non-negative integer")
        
        if not isinstance(limit, int) or limit <= 0:
            raise ValidationError("Limit must be a positive integer")
        
        if limit > 100:
            raise ValidationError("Limit cannot exceed 100")
        
        return offset, limit


def validate_request_data(data: Dict[str, Any], required_fields: List[str]) -> Dict[str, Any]:
    """Validate that required fields are present in request data."""
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None:
            missing_fields.append(field)
    
    if missing_fields:
        raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
    
    return data


def validate_json_schema(data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
    """Validate data against a JSON schema."""
    # This is a simplified schema validation
    # In a production environment, you might want to use jsonschema library
    
    for field, field_schema in schema.items():
        if field_schema.get("required", False) and field not in data:
            raise ValidationError(f"Required field '{field}' is missing")
        
        if field in data:
            value = data[field]
            field_type = field_schema.get("type")
            
            if field_type == "string" and not isinstance(value, str):
                raise ValidationError(f"Field '{field}' must be a string")
            elif field_type == "integer" and not isinstance(value, int):
                raise ValidationError(f"Field '{field}' must be an integer")
            elif field_type == "boolean" and not isinstance(value, bool):
                raise ValidationError(f"Field '{field}' must be a boolean")
            elif field_type == "array" and not isinstance(value, list):
                raise ValidationError(f"Field '{field}' must be an array")
            elif field_type == "object" and not isinstance(value, dict):
                raise ValidationError(f"Field '{field}' must be an object")
            
            # Check string length constraints
            if field_type == "string" and isinstance(value, str):
                min_length = field_schema.get("minLength")
                max_length = field_schema.get("maxLength")
                
                if min_length and len(value) < min_length:
                    raise ValidationError(f"Field '{field}' must be at least {min_length} characters long")
                
                if max_length and len(value) > max_length:
                    raise ValidationError(f"Field '{field}' must be no more than {max_length} characters long")
            
            # Check numeric constraints
            if field_type in ["integer", "number"] and isinstance(value, (int, float)):
                minimum = field_schema.get("minimum")
                maximum = field_schema.get("maximum")
                
                if minimum is not None and value < minimum:
                    raise ValidationError(f"Field '{field}' must be at least {minimum}")
                
                if maximum is not None and value > maximum:
                    raise ValidationError(f"Field '{field}' must be no more than {maximum}")
    
    return data


class BaseValidatedModel(BaseModel):
    """Base model with common validation methods."""
    
    class Config:
        validate_assignment = True
        str_strip_whitespace = True
        
    def validate_and_sanitize(self) -> 'BaseValidatedModel':
        """Validate and sanitize the model data."""
        # This method can be overridden in subclasses for custom validation
        return self
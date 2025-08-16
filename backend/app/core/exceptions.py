"""
Custom exception classes for the application.
"""
from typing import Any, Dict, Optional


class BaseAppException(Exception):
    """Base exception class for application-specific errors."""
    
    def __init__(
        self, 
        message: str, 
        error_code: str = None, 
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(BaseAppException):
    """Raised when input validation fails."""
    pass


class AuthenticationError(BaseAppException):
    """Raised when authentication fails."""
    pass


class AuthorizationError(BaseAppException):
    """Raised when authorization fails."""
    pass


class NotFoundError(BaseAppException):
    """Raised when a requested resource is not found."""
    pass


class ConflictError(BaseAppException):
    """Raised when a resource conflict occurs."""
    pass


class ExternalAPIError(BaseAppException):
    """Raised when external API calls fail."""
    
    def __init__(
        self, 
        message: str, 
        service: str, 
        status_code: Optional[int] = None,
        response_data: Optional[Dict[str, Any]] = None,
        error_code: str = None
    ):
        self.service = service
        self.status_code = status_code
        self.response_data = response_data or {}
        details = {
            "service": service,
            "status_code": status_code,
            "response_data": response_data
        }
        super().__init__(message, error_code, details)


class DatabaseError(BaseAppException):
    """Raised when database operations fail."""
    pass


class RateLimitError(BaseAppException):
    """Raised when rate limits are exceeded."""
    
    def __init__(
        self, 
        message: str, 
        retry_after: Optional[int] = None,
        error_code: str = None
    ):
        self.retry_after = retry_after
        details = {"retry_after": retry_after}
        super().__init__(message, error_code, details)


class ConfigurationError(BaseAppException):
    """Raised when configuration is invalid or missing."""
    pass


class BusinessLogicError(BaseAppException):
    """Raised when business logic validation fails."""
    pass
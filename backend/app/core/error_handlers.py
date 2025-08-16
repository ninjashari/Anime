"""
Global error handling middleware and exception handlers.
"""
import uuid
from typing import Dict, Any
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import httpx

from app.core.exceptions import (
    BaseAppException,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    ExternalAPIError,
    DatabaseError,
    RateLimitError,
    ConfigurationError,
    BusinessLogicError
)
from app.core.logging import get_error_logger, get_request_logger


error_logger = get_error_logger()


def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Dict[str, Any] = None,
    request_id: str = None
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "error": {
            "code": error_code,
            "message": message,
            "request_id": request_id
        }
    }
    
    if details:
        content["error"]["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=content
    )


async def base_app_exception_handler(request: Request, exc: BaseAppException) -> JSONResponse:
    """Handle custom application exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    # Map exception types to HTTP status codes
    status_code_map = {
        ValidationError: status.HTTP_400_BAD_REQUEST,
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        AuthorizationError: status.HTTP_403_FORBIDDEN,
        NotFoundError: status.HTTP_404_NOT_FOUND,
        ConflictError: status.HTTP_409_CONFLICT,
        BusinessLogicError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        RateLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
        ExternalAPIError: status.HTTP_502_BAD_GATEWAY,
        DatabaseError: status.HTTP_500_INTERNAL_SERVER_ERROR,
        ConfigurationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    
    status_code = status_code_map.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Log the error
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    logger.error(
        f"Application exception: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "status_code": status_code,
            "exception_type": type(exc).__name__,
            "details": exc.details
        },
        exc_info=True
    )
    
    # Add retry-after header for rate limit errors
    headers = {}
    if isinstance(exc, RateLimitError) and exc.retry_after:
        headers["Retry-After"] = str(exc.retry_after)
    
    response = create_error_response(
        status_code=status_code,
        error_code=exc.error_code,
        message=exc.message,
        details=exc.details if status_code < 500 else None,  # Don't expose internal details
        request_id=request_id
    )
    
    # Add headers if any
    for key, value in headers.items():
        response.headers[key] = value
    
    return response


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle FastAPI HTTP exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    logger.warning(
        f"HTTP exception: {exc.detail}",
        extra={
            "status_code": exc.status_code,
            "headers": exc.headers
        }
    )
    
    return create_error_response(
        status_code=exc.status_code,
        error_code="HTTP_ERROR",
        message=exc.detail,
        request_id=request_id
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    # Format validation errors
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        "Request validation failed",
        extra={
            "validation_errors": validation_errors,
            "status_code": status.HTTP_422_UNPROCESSABLE_ENTITY
        }
    )
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details={"validation_errors": validation_errors},
        request_id=request_id
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    # Determine error type and message
    if isinstance(exc, IntegrityError):
        status_code = status.HTTP_409_CONFLICT
        error_code = "INTEGRITY_ERROR"
        message = "Data integrity constraint violation"
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "DATABASE_ERROR"
        message = "Database operation failed"
    
    logger.error(
        f"Database error: {str(exc)}",
        extra={
            "error_code": error_code,
            "status_code": status_code,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return create_error_response(
        status_code=status_code,
        error_code=error_code,
        message=message,
        request_id=request_id
    )


async def httpx_exception_handler(request: Request, exc: httpx.HTTPError) -> JSONResponse:
    """Handle HTTPX client errors."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    logger.error(
        f"HTTP client error: {str(exc)}",
        extra={
            "error_code": "HTTP_CLIENT_ERROR",
            "status_code": status.HTTP_502_BAD_GATEWAY,
            "exception_type": type(exc).__name__
        },
        exc_info=True
    )
    
    return create_error_response(
        status_code=status.HTTP_502_BAD_GATEWAY,
        error_code="HTTP_CLIENT_ERROR",
        message="External service communication failed",
        request_id=request_id
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    
    logger = get_request_logger(
        request_id=request_id,
        endpoint=str(request.url.path),
        method=request.method
    )
    
    error_logger.error(
        f"Unexpected error: {str(exc)}",
        extra={
            "error_code": "INTERNAL_ERROR",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "exception_type": type(exc).__name__,
            "request_id": request_id,
            "endpoint": str(request.url.path),
            "method": request.method
        },
        exc_info=True
    )
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred",
        request_id=request_id
    )
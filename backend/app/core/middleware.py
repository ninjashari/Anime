"""
Custom middleware for request logging and tracking.
"""
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging import get_request_logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and log details."""
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Get user ID if available (from auth context)
        user_id = None
        if hasattr(request.state, "user") and request.state.user:
            user_id = str(request.state.user.id)
        
        # Create request logger
        logger = get_request_logger(
            request_id=request_id,
            user_id=user_id,
            endpoint=request.url.path,
            method=request.method
        )
        
        # Log request start
        start_time = time.time()
        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "query_params": dict(request.query_params),
                "headers": dict(request.headers),
                "client_ip": request.client.host if request.client else None
            }
        )
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Log successful response
            logger.info(
                f"Request completed: {request.method} {request.url.path}",
                extra={
                    "status_code": response.status_code,
                    "duration": round(duration, 3)
                }
            )
            
            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as exc:
            # Calculate duration
            duration = time.time() - start_time
            
            # Log error
            logger.error(
                f"Request failed: {request.method} {request.url.path}",
                extra={
                    "duration": round(duration, 3),
                    "exception_type": type(exc).__name__
                },
                exc_info=True
            )
            
            # Re-raise the exception to be handled by error handlers
            raise


class UserContextMiddleware(BaseHTTPMiddleware):
    """Middleware for adding user context to requests."""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add user context to request state."""
        # Initialize user context
        request.state.user = None
        
        # Extract user from authorization header if present
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # This will be populated by the auth dependency
                # We're just initializing the state here
                pass
            except Exception:
                # Don't fail the request if user extraction fails
                # Let the auth dependency handle it
                pass
        
        response = await call_next(request)
        return response
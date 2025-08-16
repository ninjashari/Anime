"""
Retry mechanisms for external API calls and other operations.
"""
import asyncio
import random
import time
from typing import Any, Callable, Optional, Type, Union, List
from functools import wraps
import httpx

from app.core.exceptions import ExternalAPIError, RateLimitError
from app.core.logging import get_logger


logger = get_logger("retry")


class RetryConfig:
    """Configuration for retry behavior."""
    
    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Optional[List[Type[Exception]]] = None,
        retryable_status_codes: Optional[List[int]] = None
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions or [
            httpx.TimeoutException,
            httpx.ConnectError,
            httpx.ReadError,
            ExternalAPIError
        ]
        self.retryable_status_codes = retryable_status_codes or [
            429,  # Too Many Requests
            500,  # Internal Server Error
            502,  # Bad Gateway
            503,  # Service Unavailable
            504   # Gateway Timeout
        ]


def calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for the given attempt."""
    delay = config.base_delay * (config.exponential_base ** (attempt - 1))
    delay = min(delay, config.max_delay)
    
    if config.jitter:
        # Add jitter to prevent thundering herd
        delay = delay * (0.5 + random.random() * 0.5)
    
    return delay


def should_retry(
    exception: Exception, 
    attempt: int, 
    config: RetryConfig
) -> bool:
    """Determine if an operation should be retried."""
    if attempt >= config.max_attempts:
        return False
    
    # Check if exception type is retryable
    if any(isinstance(exception, exc_type) for exc_type in config.retryable_exceptions):
        return True
    
    # Check for HTTP status codes
    if isinstance(exception, httpx.HTTPStatusError):
        return exception.response.status_code in config.retryable_status_codes
    
    # Check for rate limit errors
    if isinstance(exception, RateLimitError):
        return True
    
    return False


def retry_sync(config: RetryConfig = None):
    """Decorator for synchronous functions with retry logic."""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    last_exception = exc
                    
                    if not should_retry(exc, attempt, config):
                        logger.error(
                            f"Function {func.__name__} failed after {attempt} attempts",
                            extra={
                                "function": func.__name__,
                                "attempt": attempt,
                                "max_attempts": config.max_attempts,
                                "exception_type": type(exc).__name__
                            },
                            exc_info=True
                        )
                        raise
                    
                    if attempt < config.max_attempts:
                        delay = calculate_delay(attempt, config)
                        logger.warning(
                            f"Function {func.__name__} failed on attempt {attempt}, retrying in {delay:.2f}s",
                            extra={
                                "function": func.__name__,
                                "attempt": attempt,
                                "delay": delay,
                                "exception_type": type(exc).__name__
                            }
                        )
                        time.sleep(delay)
            
            # If we get here, all attempts failed
            raise last_exception
        
        return wrapper
    return decorator


def retry_async(config: RetryConfig = None):
    """Decorator for asynchronous functions with retry logic."""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    last_exception = exc
                    
                    if not should_retry(exc, attempt, config):
                        logger.error(
                            f"Async function {func.__name__} failed after {attempt} attempts",
                            extra={
                                "function": func.__name__,
                                "attempt": attempt,
                                "max_attempts": config.max_attempts,
                                "exception_type": type(exc).__name__
                            },
                            exc_info=True
                        )
                        raise
                    
                    if attempt < config.max_attempts:
                        delay = calculate_delay(attempt, config)
                        logger.warning(
                            f"Async function {func.__name__} failed on attempt {attempt}, retrying in {delay:.2f}s",
                            extra={
                                "function": func.__name__,
                                "attempt": attempt,
                                "delay": delay,
                                "exception_type": type(exc).__name__
                            }
                        )
                        await asyncio.sleep(delay)
            
            # If we get here, all attempts failed
            raise last_exception
        
        return wrapper
    return decorator


class RetryableHTTPClient:
    """HTTP client with built-in retry logic."""
    
    def __init__(self, config: RetryConfig = None, **httpx_kwargs):
        self.config = config or RetryConfig()
        self.client = httpx.AsyncClient(**httpx_kwargs)
    
    async def request(
        self, 
        method: str, 
        url: str, 
        **kwargs
    ) -> httpx.Response:
        """Make an HTTP request with retry logic."""
        last_exception = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                response = await self.client.request(method, url, **kwargs)
                
                # Check if status code indicates we should retry
                if response.status_code in self.config.retryable_status_codes:
                    raise httpx.HTTPStatusError(
                        f"HTTP {response.status_code}",
                        request=response.request,
                        response=response
                    )
                
                return response
                
            except Exception as exc:
                last_exception = exc
                
                if not should_retry(exc, attempt, self.config):
                    logger.error(
                        f"HTTP request failed after {attempt} attempts",
                        extra={
                            "method": method,
                            "url": url,
                            "attempt": attempt,
                            "max_attempts": self.config.max_attempts,
                            "exception_type": type(exc).__name__
                        },
                        exc_info=True
                    )
                    raise
                
                if attempt < self.config.max_attempts:
                    delay = calculate_delay(attempt, self.config)
                    
                    # Handle rate limiting with Retry-After header
                    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
                        retry_after = exc.response.headers.get("Retry-After")
                        if retry_after:
                            try:
                                delay = max(delay, float(retry_after))
                            except ValueError:
                                pass
                    
                    logger.warning(
                        f"HTTP request failed on attempt {attempt}, retrying in {delay:.2f}s",
                        extra={
                            "method": method,
                            "url": url,
                            "attempt": attempt,
                            "delay": delay,
                            "exception_type": type(exc).__name__
                        }
                    )
                    await asyncio.sleep(delay)
        
        # If we get here, all attempts failed
        raise last_exception
    
    async def get(self, url: str, **kwargs) -> httpx.Response:
        """Make a GET request with retry logic."""
        return await self.request("GET", url, **kwargs)
    
    async def post(self, url: str, **kwargs) -> httpx.Response:
        """Make a POST request with retry logic."""
        return await self.request("POST", url, **kwargs)
    
    async def put(self, url: str, **kwargs) -> httpx.Response:
        """Make a PUT request with retry logic."""
        return await self.request("PUT", url, **kwargs)
    
    async def delete(self, url: str, **kwargs) -> httpx.Response:
        """Make a DELETE request with retry logic."""
        return await self.request("DELETE", url, **kwargs)
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()


# Pre-configured retry configs for common scenarios
MAL_API_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    base_delay=1.0,
    max_delay=30.0,
    retryable_status_codes=[429, 500, 502, 503, 504]
)

JELLYFIN_RETRY_CONFIG = RetryConfig(
    max_attempts=2,
    base_delay=0.5,
    max_delay=5.0
)

DATABASE_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    base_delay=0.1,
    max_delay=1.0,
    retryable_exceptions=[Exception]  # Retry most database errors
)
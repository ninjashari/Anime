"""
Structured logging configuration for the application.
"""
import logging
import logging.config
import sys
from typing import Any, Dict
import json
from datetime import datetime
import traceback

from app.core.config import settings


class StructuredFormatter(logging.Formatter):
    """Custom formatter that outputs structured JSON logs."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        log_entry = {
            "timestamp": datetime.now().astimezone().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add extra fields if present
        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id
        
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
            
        if hasattr(record, "endpoint"):
            log_entry["endpoint"] = record.endpoint
            
        if hasattr(record, "method"):
            log_entry["method"] = record.method
            
        if hasattr(record, "status_code"):
            log_entry["status_code"] = record.status_code
            
        if hasattr(record, "duration"):
            log_entry["duration"] = record.duration
            
        if hasattr(record, "error_code"):
            log_entry["error_code"] = record.error_code
            
        if hasattr(record, "external_service"):
            log_entry["external_service"] = record.external_service
        
        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging():
    """Configure application logging."""
    
    # Determine log level based on debug setting
    log_level = "DEBUG" if settings.DEBUG else "INFO"
    
    # Configure logging
    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
            },
            "simple": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "structured" if not settings.DEBUG else "simple",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "INFO",
                "formatter": "structured",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8"
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "structured",
                "filename": "logs/error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8"
            }
        },
        "loggers": {
            "app": {
                "level": log_level,
                "handlers": ["console", "file"],
                "propagate": False
            },
            "app.error": {
                "level": "ERROR",
                "handlers": ["console", "error_file"],
                "propagate": False
            },
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            }
        },
        "root": {
            "level": log_level,
            "handlers": ["console"]
        }
    }
    
    # Create logs directory if it doesn't exist
    import os
    os.makedirs("logs", exist_ok=True)
    
    logging.config.dictConfig(logging_config)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance with the specified name."""
    return logging.getLogger(f"app.{name}")


def get_error_logger() -> logging.Logger:
    """Get the error logger instance."""
    return logging.getLogger("app.error")


class LoggerAdapter(logging.LoggerAdapter):
    """Logger adapter that adds context information to log records."""
    
    def __init__(self, logger: logging.Logger, extra: Dict[str, Any] = None):
        super().__init__(logger, extra or {})
    
    def process(self, msg: str, kwargs: Dict[str, Any]) -> tuple:
        """Process the logging call to add extra context."""
        if "extra" not in kwargs:
            kwargs["extra"] = {}
        kwargs["extra"].update(self.extra)
        return msg, kwargs


def get_request_logger(
    request_id: str = None, 
    user_id: str = None, 
    endpoint: str = None,
    method: str = None
) -> LoggerAdapter:
    """Get a logger adapter with request context."""
    logger = get_logger("request")
    extra = {}
    
    if request_id:
        extra["request_id"] = request_id
    if user_id:
        extra["user_id"] = user_id
    if endpoint:
        extra["endpoint"] = endpoint
    if method:
        extra["method"] = method
        
    return LoggerAdapter(logger, extra)
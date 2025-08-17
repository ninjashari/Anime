# MyAnimeList Synchronization Guide

## Overview

This guide covers the complete process for synchronizing user anime list data between MyAnimeList (MAL) and the local database. The system provides both manual and automatic synchronization with comprehensive error handling and conflict resolution.

## Authentication Flow

### 1. MAL API Setup
Before users can sync their data, configure the MyAnimeList API integration:

```bash
# Environment variables required
MAL_CLIENT_ID=your_mal_client_id
MAL_REDIRECT_URI=http://localhost:3005/auth/callback
```

### 2. User Authentication Process

#### Step 1: Generate Authorization URL
```http
GET /api/mal/auth-url
```

**Response:**
```json
{
  "auth_url": "https://myanimelist.net/v1/oauth2/authorize?...",
  "state": "csrf_token_string"
}
```

#### Step 2: User Authorization
- User visits the `auth_url` and grants permissions to the application
- MAL redirects back to your application with an authorization code

#### Step 3: Exchange Code for Tokens
```http
POST /api/mal/callback
Content-Type: application/json

{
  "code": "authorization_code_from_mal",
  "state": "csrf_token_string"
}
```

**Response:**
```json
{
  "access_token": "access_token_string",
  "refresh_token": "refresh_token_string",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Step 4: Token Storage
Tokens are automatically stored in the user's database record:
- `mal_access_token`: For API requests
- `mal_refresh_token`: For token renewal
- `mal_token_expires_at`: Token expiration timestamp

### 3. Token Management

#### Check Token Status
```http
GET /api/mal/token-status
```

**Response:**
```json
{
  "has_tokens": true,
  "is_expired": false,
  "expires_at": "2024-01-01T12:00:00Z"
}
```

#### Refresh Expired Tokens
```http
POST /api/mal/refresh-token
```

The system automatically refreshes tokens when needed during sync operations.

## Synchronization Process

### 1. Manual Sync Trigger

#### Sync Current User's Data
```http
POST /api/sync/user?force_full_sync=false
```

**Parameters:**
- `force_full_sync` (optional): Skip time-based sync checks

**Response:**
```json
{
  "message": "Anime data synchronization started",
  "task_id": "celery_task_id",
  "user_id": 123,
  "force_full_sync": false,
  "started_at": "2024-01-01T12:00:00Z"
}
```

#### Sync Specific User (Admin)
```http
POST /api/sync/user/123?force_full_sync=false
```

### 2. Background Sync Process

The synchronization runs as a Celery background task with the following phases:

#### Phase A: Data Fetching
1. **Token Validation**: Ensures valid MAL access token
   - Automatically refreshes if expired
   - Raises error if refresh fails

2. **Complete List Retrieval**: Fetches entire user anime list
   - Uses MAL API endpoint: `/v2/users/@me/animelist`
   - Paginates with 100 items per request
   - Rate limited to 1 request per second
   - Continues until all pages retrieved

#### Phase B: Data Processing
Processes data in batches of 100 items:

1. **Anime Information Sync**:
   ```python
   # For each anime from MAL
   anime = Anime.query.filter_by(mal_id=mal_anime_id).first()
   if not anime:
       anime = Anime(mal_id=mal_anime_id)
       db.add(anime)
       db.flush()  # Critical: Get anime.id before creating user list
   
   # Update anime metadata
   anime.title = mal_data.get("title")
   anime.synopsis = mal_data.get("synopsis")
   # ... other fields
   ```

2. **User List Entry Sync**:
   ```python
   user_list = UserAnimeList.query.filter_by(
       user_id=user.id, 
       anime_id=anime.id
   ).first()
   
   if not user_list:
       user_list = UserAnimeList(user_id=user.id, anime_id=anime.id)
       db.add(user_list)
   
   # Apply conflict resolution rules
   user_list.status = mal_status  # MAL is source of truth
   user_list.score = mal_score if mal_score > 0 else user_list.score
   # ... other fields
   ```

#### Phase C: Database Operations
1. **Batch Commits**: Each batch is committed separately
2. **Error Handling**: Rollback on errors, continue with next batch
3. **Sync Timestamp**: Update `user.last_mal_sync` on completion

### 3. Sync Status Tracking

#### Check Task Status
```http
GET /api/sync/status/{task_id}
```

**Response:**
```json
{
  "task_id": "task_id",
  "status": "SUCCESS",
  "result": {
    "user_id": 123,
    "anime_fetched": 250,
    "anime_created": 50,
    "anime_updated": 200,
    "user_lists_created": 45,
    "user_lists_updated": 205,
    "conflicts_resolved": 15,
    "duration": 45.2,
    "errors": []
  },
  "ready": true,
  "successful": true,
  "failed": false
}
```

#### Check Last Sync Info
```http
GET /api/sync/user/last-sync
```

**Response:**
```json
{
  "user_id": 123,
  "last_mal_sync": "2024-01-01T11:30:00Z",
  "has_mal_token": true,
  "token_expires_at": "2024-01-01T15:30:00Z"
}
```

## Database Schema

### Tables Involved

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mal_access_token TEXT,
    mal_refresh_token TEXT,
    mal_token_expires_at TIMESTAMP,
    last_mal_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### anime
```sql
CREATE TABLE anime (
    id SERIAL PRIMARY KEY,
    mal_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    synopsis TEXT,
    episodes INTEGER,
    status VARCHAR(20),
    score DECIMAL(3,2),
    rank INTEGER,
    popularity INTEGER,
    aired_from DATE,
    aired_to DATE,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### user_anime_lists
```sql
CREATE TABLE user_anime_lists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    anime_id INTEGER NOT NULL REFERENCES anime(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch')),
    score INTEGER CHECK (score >= 0 AND score <= 10),
    episodes_watched INTEGER DEFAULT 0 CHECK (episodes_watched >= 0),
    start_date DATE,
    finish_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, anime_id)
);
```

### Relationships
- `users` 1:N `user_anime_lists` (user can have multiple anime entries)
- `anime` 1:N `user_anime_lists` (anime can be in multiple users' lists)
- `user_anime_lists` N:1 `users` (each list entry belongs to one user)
- `user_anime_lists` N:1 `anime` (each list entry references one anime)

## Configuration Requirements

### Environment Variables
```bash
# Required
MAL_CLIENT_ID=your_mal_client_id_here
MAL_REDIRECT_URI=http://localhost:3005/auth/callback

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/anime_management

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Optional
MAL_API_RATE_LIMIT=1  # requests per second
SYNC_BATCH_SIZE=100   # items per batch
SYNC_MAX_RETRIES=3    # retry attempts
```

### Service Dependencies
1. **PostgreSQL**: For data storage
2. **Redis**: For Celery task queue
3. **Celery Worker**: For background sync processing

### Starting Services
```bash
# Start Celery worker
celery -A app.core.celery_app worker --loglevel=info

# Start FastAPI application
uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload
```

## Rate Limiting & Performance

### MAL API Limits
- **Rate Limit**: 1 request per second (enforced by built-in rate limiter)
- **Pagination**: 100 items per request maximum
- **Request Headers**: Include proper User-Agent and authorization

### Performance Considerations
- **Batch Processing**: 100 anime items processed per batch
- **Database Flushing**: New anime records flushed immediately to get IDs
- **Memory Usage**: Batching prevents memory issues with large lists
- **Concurrent Users**: Each user sync runs in separate Celery task

### Estimated Sync Times
- **100 anime**: ~2-3 minutes
- **500 anime**: ~8-10 minutes  
- **1000 anime**: ~15-18 minutes

## Conflict Resolution Rules

When local and MAL data differ, the system applies these rules:

### Status Conflicts
- **Rule**: MAL status always takes precedence
- **Rationale**: MAL is considered the authoritative source

### Score Conflicts
- **Rule**: Use MAL score if set (> 0), otherwise keep local score
- **Rationale**: Preserve user's local ratings when MAL has no score

### Episodes Watched
- **Rule**: Use the higher value between local and MAL
- **Rationale**: Progress should never go backwards

### Dates (Start/Finish)
- **Rule**: MAL dates take precedence when available
- **Rationale**: MAL likely has more accurate historical data

### Notes/Comments
- **Rule**: Keep local notes if they exist, add MAL comments if local is empty
- **Rationale**: Preserve user's detailed local notes

## Error Handling

### Common Error Types

#### Authentication Errors
```json
{
  "status_code": 401,
  "detail": "User has no MyAnimeList access token"
}
```

**Solution**: Re-authenticate user through OAuth flow

#### Rate Limit Errors
```json
{
  "status_code": 429,
  "detail": "Rate limit exceeded"
}
```

**Solution**: Automatic retry with exponential backoff

#### Database Constraint Violations
```json
{
  "status_code": 500,
  "detail": "duplicate key value violates unique constraint"
}
```

**Solution**: Handle gracefully, skip duplicate entries

#### MAL API Errors
```json
{
  "status_code": 503,
  "detail": "MyAnimeList API temporarily unavailable"
}
```

**Solution**: Retry with exponential backoff, max 3 attempts

### Retry Strategy
```python
# Exponential backoff configuration
retry_delays = [1, 2, 4, 8, 16]  # seconds
max_retries = 5
```

## Troubleshooting

### Issue: anime_id is None Error
**Symptoms**: SQL error with `anime_id` being NULL in user_anime_lists insert

**Cause**: New anime records not flushed before creating user list entries

**Solution**: Ensure `db.flush()` is called after creating new anime records

```python
if anime_created:
    db.flush()  # This generates the anime.id
```

### Issue: Token Expired During Sync
**Symptoms**: 401 Unauthorized errors mid-sync

**Cause**: Access token expired during long sync process

**Solution**: Token refresh is automatic, but check token validity more frequently

### Issue: Duplicate Key Violations
**Symptoms**: Unique constraint errors on user_anime_lists

**Cause**: Concurrent sync operations or interrupted syncs

**Solution**: Use `ON CONFLICT` handling or check existence before insert

### Issue: Sync Takes Too Long
**Symptoms**: Sync appears to hang or timeout

**Cause**: Large anime lists or API rate limiting

**Solution**: 
- Monitor Celery logs for progress
- Adjust batch size if needed
- Check network connectivity to MAL

### Issue: Missing Anime Data
**Symptoms**: Some anime missing after sync

**Cause**: MAL API pagination issues or temporary API errors

**Solution**: Run sync again with `force_full_sync=true`

## Monitoring & Logging

### Key Log Messages
```
INFO - Starting anime data sync for user 123
DEBUG - Fetched 250 anime entries from MAL  
INFO - Processing batch 1 of 3
DEBUG - Created anime record for MAL ID 12345
INFO - Completed anime data sync for user 123
ERROR - Failed to sync user 123: Token expired
```

### Metrics to Monitor
- Sync completion rates
- Average sync duration
- API error rates
- Database constraint violations
- Token refresh frequency

### Health Checks
```http
# Check if user needs sync
GET /api/sync/user/last-sync

# Verify MAL connectivity
GET /api/mal/user-info

# Check Celery worker status
celery -A app.core.celery_app inspect active
```

This comprehensive guide covers all aspects of MyAnimeList synchronization. For additional support, refer to the API documentation and check the application logs for detailed error information.
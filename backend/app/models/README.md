# Database Models

This directory contains the SQLAlchemy models for the Anime Management System.

## Models

### User (`user.py`)
- Stores user account information and MyAnimeList API tokens
- Fields: username, name, password_hash, MAL tokens
- Relationships: anime_lists, jellyfin_activities

### Anime (`anime.py`)
- Stores anime information cached from MyAnimeList API
- Fields: mal_id, title, synopsis, episodes, status, scores, etc.
- Relationships: user_lists, anidb_mappings

### UserAnimeList (`user_anime_list.py`)
- Tracks user's anime watching status and progress
- Fields: user_id, anime_id, status, score, episodes_watched, dates
- Constraints: unique user-anime combination, valid status values, score range

### AniDBMapping (`anidb_mapping.py`)
- Maps AniDB IDs to MyAnimeList IDs for Jellyfin integration
- Fields: anidb_id, mal_id, title, confidence_score, source
- Used for automatic progress updates from Jellyfin

### JellyfinActivity (`jellyfin_activity.py`)
- Stores anime watching activity from Jellyfin webhooks
- Fields: user_id, anidb_id, mal_id, episode_number, durations, processed
- Used for automatic progress tracking

## Database Initialization

Use `app.core.init_db.init_database()` to create tables, indexes, and constraints.

## Testing

Run `pytest tests/test_models.py` to test model functionality and relationships.
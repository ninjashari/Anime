# Anime Management System

A comprehensive web application that integrates with MyAnimeList API and Jellyfin media server to provide users with a centralized platform for tracking their anime consumption.

## Features

- User authentication and registration
- MyAnimeList API integration with OAuth 2.0
- Anime list management (watching, completed, on hold, dropped, plan to watch)
- Dashboard with viewing statistics and score distribution
- Anime search and discovery
- Jellyfin integration for automatic progress tracking
- AniDB to MyAnimeList mapping management
- Responsive Material-UI interface

## Technology Stack

### Frontend
- React.js 18+ with TypeScript
- Material-UI (MUI) v5
- React Router for navigation
- React Query for data fetching
- Chart.js for visualizations

### Backend
- Python 3.11+ with FastAPI
- SQLAlchemy ORM with PostgreSQL
- Celery for background tasks
- Redis for caching and task queue
- JWT authentication

## Quick Start with Docker

1. Clone the repository
2. Copy environment files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. Update the environment variables in the `.env` files
4. Start the services:
   ```bash
   docker-compose up -d
   ```
5. Access the application at http://localhost:3005

## Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Configuration

### MyAnimeList API Setup
1. Register your application at https://myanimelist.net/apiconfig
2. Add your client ID and secret to the environment variables
3. Set the redirect URI to `http://localhost:3005/auth/callback`

### Jellyfin Integration
1. Configure webhook in Jellyfin to point to `http://your-domain:8005/api/jellyfin/webhook`
2. Set the webhook secret in your environment variables

## Project Structure

```
anime-management-system/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript definitions
│   ├── package.json
│   └── Dockerfile
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configuration
│   │   ├── models/         # Database models
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml      # Docker development setup
└── README.md
```

## API Documentation

Once the backend is running, visit http://localhost:8005/docs for interactive API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This project is licensed under the MIT License.
#!/bin/bash

# Development setup script for Anime Management System

echo "🚀 Setting up Anime Management System for development..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files if they don't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend environment file..."
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env - please update with your configuration"
fi

if [ ! -f frontend/.env ]; then
    echo "📝 Creating frontend environment file..."
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env - please update with your configuration"
fi

# Start the services
echo "🐳 Starting Docker services..."
docker-compose up -d postgres redis

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🔧 Running database migrations..."
docker-compose run --rm backend alembic upgrade head

echo "🚀 Starting all services..."
docker-compose up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "🌐 Frontend: http://localhost:3005"
echo "🔧 Backend API: http://localhost:8005"
echo "📚 API Documentation: http://localhost:8005/docs"
echo ""
echo "To stop the services, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"
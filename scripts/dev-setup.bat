@echo off
REM Development setup script for Anime Management System (Windows)

echo 🚀 Setting up Anime Management System for development...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create environment files if they don't exist
if not exist backend\.env (
    echo 📝 Creating backend environment file...
    copy backend\.env.example backend\.env
    echo ✅ Created backend\.env - please update with your configuration
)

if not exist frontend\.env (
    echo 📝 Creating frontend environment file...
    copy frontend\.env.example frontend\.env
    echo ✅ Created frontend\.env - please update with your configuration
)

REM Start the services
echo 🐳 Starting Docker services...
docker-compose up -d postgres redis

echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo 🔧 Running database migrations...
docker-compose run --rm backend alembic upgrade head

echo 🚀 Starting all services...
docker-compose up -d

echo.
echo ✅ Setup complete!
echo.
echo 🌐 Frontend: http://localhost:3005
echo 🔧 Backend API: http://localhost:8005
echo 📚 API Documentation: http://localhost:8005/docs
echo.
echo To stop the services, run: docker-compose down
echo To view logs, run: docker-compose logs -f
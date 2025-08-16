-- Database initialization script for PostgreSQL
-- This script is run when the PostgreSQL container starts for the first time

-- Create database if it doesn't exist (handled by POSTGRES_DB environment variable)
-- CREATE DATABASE IF NOT EXISTS anime_management;

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance (will be created by Alembic migrations)
-- These are just placeholders for future use
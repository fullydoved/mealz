#!/bin/sh
set -e

mkdir -p /data

echo "Running database migrations..."
alembic upgrade head

echo "Starting Mealz on port 8851..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8851

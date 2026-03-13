#!/bin/bash
# Move up to project root where alembic.ini lives
cd "$(dirname "$0")/.."
alembic upgrade head
cd backend
uvicorn api_service.main:app --host 0.0.0.0 --port $PORT

# Trading Bible - Financial Microservices Platform

A complete microservices-based web application for tracking and visualizing stock momentum, value, and quality.

## Features
- **Frontend (React + TypeScript)**: Premium UI with bull background, category filters, and interactive TradingView charts.
- **Backend (Python FastAPI)**: High-performance API services with Redis caching.
- **Data Fetching**: Automated fetching from Google Sheets and Yahoo Finance (generic historical data source).
- **Containerized**: Fully orchestrated with Docker and Docker Compose.

## Directory Structure
- `/frontend`: React application (Vite).
- `/backend`: FastAPI services (API, Fetcher, Shared).
- `/docker-compose.yml`: Service orchestration.

## Prerequisites
- Docker and Docker Compose
- Node.js (for local frontend development)
- Python 3.11 (for local backend development)

## Quick Start (with Docker)
1. Clone the repository.
2. Create a `.env` file in the root directory (optional, for Google Sheet ID):
   ```
   GOOGLE_SHEET_ID=your_sheet_id_here
   ```
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   - Frontend: [http://localhost](http://localhost)
   - Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)

## Local Development
### Backend
1. `cd backend`
2. `pip install -r requirements.txt`
3. `uvicorn api_service.main:app --reload`

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## Infrastructure
The system is designed to be stateless and cloud-ready. Redis is used for caching stock lists and historical data to minimize external API calls.

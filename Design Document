# Trading Bible - Design Document

This document provides a detailed technical overview of the Trading Bible microservices platform, including High-Level Design (HLD), Low-Level Design (LLD), system architecture, and interaction sequence flows.

---

## 1. High-Level Design (HLD)

### 1.1 Goal
To provide a scalable, high-performance financial dashboard for visualizing stock momentum, value, and quality metrics with real-time charting capabilities.

### 1.2 System Overview
The system follows a microservices architecture, separating data ingestion, API serving, and frontend representation.

### 1.3 Key Components
- **Frontend (React + TS)**: Single Page Application (SPA) for user interaction.
- **API Service (FastAPI)**: RESTful gateway for the frontend.
- **Fetch Service (Python)**: Handles data ingestion from Google Sheets and Yahoo Finance.
- **Cache (Redis)**: Accelerates data access and reduces external API load.
- **Containerization (Docker)**: Ensures environment consistency and easy scaling.

---

## 2. System Architecture

The following diagram illustrates the component relationships and data flow:

```mermaid
graph TD
    User((User)) -->|HTTPS| Frontend[Frontend - React]
    Frontend -->|REST API| APIService[API Service - FastAPI]
    APIService -->|Read/Write| Cache[(Redis Cache)]
    APIService -.->|Fallback| FetchService[Fetch Service]
    FetchService -->|Fetch| GoogleSheets[Google Sheets API]
    FetchService -->|Fetch| YahooFinance[Yahoo Finance API]
    
    subgraph "Infrastructure (Docker Compose)"
        Frontend
        APIService
        Cache
        FetchService
    end
```

---

## 3. Low-Level Design (LLD)

### 3.1 Frontend Architecture
- **State Management**: React `useState` and `useEffect` for local component state.
- **API Client**: Axios for asynchronous HTTP requests.
- **UI Components**: Modular components (Header, Table, Nav, Chart) for reusability.
- **Style System**: Vanilla CSS with CSS Variables for consistent theming.

### 3.2 Backend Service Implementation
- **FastAPI**: Asynchronous endpoints for non-blocking I/O.
- **Pydantic**: Data validation and serialization (Shared Models).
- **Generic Data Fetcher**: Interface-based design to swap data sources (e.g., Yahoo Finance, Alphavantage).

### 3.3 Data Models
```python
class StockData(BaseModel):
    rank: int
    symbol: str
    sector: str
    score: int
    return_3m: float
    return_6m: float
```

---

## 4. Sequence Flows

### 4.1 Initial Load & Category Switching
This sequence describes the flow when a user opens the app or switches between categories (Momentum, Value, etc.).

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Service
    participant C as Redis Cache
    participant G as Google Sheets

    U->>F: Select Category (e.g., Momentum)
    F->>A: GET /stocks/{category}
    A->>C: Check Cache for 'stocks:{category}'
    alt Cache Hit
        C-->>A: Return Cached List
    else Cache Miss
        A->>G: Fetch Daily Stock List
        G-->>A: Return Raw Data
        A->>A: Process & Format Data
        A->>C: Set Cache (24h Expiry)
    end
    A-->>F: Return StockListResponse
    F->>U: Render Stock Table
```

### 4.2 Stock Detail & Chart View
This sequence describes the flow when a user clicks on a stock row to view historical data and charts.

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Service
    participant C as Redis Cache
    participant Y as Yahoo Finance
    participant TV as TradingView Widget

    U->>F: Click Stock Row (e.g., SBIN)
    F->>F: Navigate to Detail View
    
    par Async Fetch History
        F->>A: GET /stocks/history/SBIN
        A->>C: Check Cache for 'history:SBIN'
        alt Cache Hit
            C-->>A: Return Cached History
        else Cache Miss
            A->>Y: Fetch Ticker History (1y)
            Y-->>A: Return Pandas Frame
            A->>A: Convert to JSON
            A->>C: Set Cache (1h Expiry)
        end
        A-->>F: Return HistoricalData[]
    and Load TradingView
        F->>TV: Load Script & Initialize Widget
        TV-->>F: Render Interactive Chart
    end
    
    F->>U: Display Full Detail Page
```

---

## 5. Deployment & Orchestration
The application is deployed using Docker Compose for local and development environments, with a clear path to Kubernetes for production.

- **Dockerfiles**: Multi-stage builds for optimized image sizes.
- **Environment Variables**: Centralized configuration for API keys and endpoint URLs.
- **Persistence**: Redis persistence enabled for cache durability.

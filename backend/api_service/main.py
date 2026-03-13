from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
from shared.models import StockData, StockListResponse, HistoricalData, StockInfo
from fetch_service.main import DataService, fetch_from_google_sheets, fetch_historical_data, fetch_stock_info
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from api_service import auth_routes
from db import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Trading Bible API")
app.include_router(auth_routes.router, prefix="/auth", tags=["auth"])

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

data_service = DataService()

@app.get("/stocks/{category}", response_model=StockListResponse)
async def get_stocks(category: str):
    logger.info(f"Fetching stocks for category: {category}")
    try:
        # 1. Try Cache
        try:
            cached_data = data_service.get_cached_stock_list(category)
            if cached_data:
                logger.info(f"Returning cached data for {category}")
                return StockListResponse(category=category, stocks=cached_data)
        except Exception as e:
            logger.warning(f"Cache miss or error: {e}")

        # 2. Try Fetch (Mock for now, eventually Google Sheets)
        try:
            stocks = fetch_from_google_sheets(category)
            if stocks:
                # 3. Try Cache Write (Async-like and non-blocking if possible, but safe here)
                try: 
                    data_service.cache_stock_list(category, stocks)
                except: pass
                return StockListResponse(category=category, stocks=stocks)
        except Exception as e:
            logger.error(f"Fetch failed: {e}")

        # 4. Emergency Fallback (Empty if everything else fails)
        logger.warning(f"No data found for category: {category} in Excel or Google Sheets.")
        return StockListResponse(category=category, stocks=[])

    except Exception as e:
        logger.critical(f"Critical failure in get_stocks: {e}", exc_info=True)
        # Even the fallback failed? Return minimal valid response
        return StockListResponse(category=category, stocks=[])

@app.get("/stocks/history/{symbol}", response_model=List[HistoricalData])
async def get_history(symbol: str, interval: str = "1d"):
    logger.info(f"Fetching history for symbol: {symbol}, interval: {interval}")
    try:
        # Try Cache
        cached_data = data_service.get_cached_historical_data(symbol, interval)
        if cached_data:
            return cached_data

        history = fetch_historical_data(symbol, interval)
        if history:
            data_service.cache_historical_data(symbol, interval, history)
            return history
        return []
    except Exception as e:
        logger.error(f"Error in get_history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/info/{symbol}", response_model=StockInfo)
async def get_info(symbol: str):
    logger.info(f"Fetching info for: {symbol}")
    try:
        # Try Cache
        cached_info = data_service.get_cached_stock_info(symbol)
        if cached_info:
            return cached_info

        info = fetch_stock_info(symbol)
        if info:
            data_service.cache_stock_info(symbol, info)
            return info
        
        raise HTTPException(status_code=404, detail="Stock info not found")
    except Exception as e:
        logger.error(f"Error in get_info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

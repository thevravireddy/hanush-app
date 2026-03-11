import os
import pandas as pd
import yfinance as yf
from typing import List, Dict
from datetime import datetime, timedelta
import redis
import json
import calendar

# Placeholder for Google Sheets integration
# In a real scenario, you'd use google-api-python-client
def fetch_from_excel(category: str) -> List[Dict]:
    excel_path = os.getenv("EXCEL_PATH", "/app/data/trading_bull.xlsx")
    # Map friendly names to tab names
    sheet_map = {
        "Momentum": "Momentum",
        "Low Vol": "Low Vol",
        "Value": "Value",
        "Quality": "Quality",
        "Trending Upside": "Trending Upside Stocks",
        "Trending Downside": "Trending Downside Stocks",
        "Aggressive Call": "Aggressive Call Option Stocks",
        "Aggressive Put": "Aggressive Put Option Stocks"
    }
    
    sheet_name = sheet_map.get(category, category)
    
    try:
        if not os.path.exists(excel_path):
            print(f"Excel file not found at {excel_path}")
            return []
            
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        stocks = []
        for i, row in df.iterrows():
            # Robust mapping for potential column name variations
            symbol = row.get("Symbol") or row.get("SYMBOL") or row.get("symbol")
            if pd.isna(symbol): continue
            
            sector = row.get("Sector") or row.get("SECTOR") or row.get("sector") or "N/A"
            score = row.get("Score") or row.get("SCORE") or row.get("score") or 0
            ret3m = row.get("3M Return") or row.get("3M RETURN") or row.get("return_3m") or 0
            ret6m = row.get("6M Return") or row.get("6M RETURN") or row.get("return_6m") or 0
            
            stocks.append({
                "rank": i + 1,
                "symbol": str(symbol),
                "sector": str(sector),
                "score": int(score) if not pd.isna(score) else 0,
                "return_3m": float(ret3m) if not pd.isna(ret3m) else 0.0,
                "return_6m": float(ret6m) if not pd.isna(ret6m) else 0.0
            })
        return stocks
    except Exception as e:
        print(f"Error reading Excel {excel_path} sheet {sheet_name}: {e}")
        return []

def fetch_from_google_sheets(category: str) -> List[Dict]:
    # Delegating to Excel reader as requested
    return fetch_from_excel(category)

def fetch_historical_data(symbol: str, interval: str = "1d"):
    yf_symbol = symbol if "." in symbol else f"{symbol}.NS"
    period_map = {"5m": "5d", "15m": "5d", "1h": "1mo", "1d": "1y", "1wk": "max", "1mo": "max"}
    period = period_map.get(interval, "1y")

    try:
        stock = yf.Ticker(yf_symbol)
        hist = stock.history(period=period, interval=interval)
        if hist.empty: return []

        # Technical Indicators Calculation
        if len(hist) > 50:
            # RSI
            delta = hist['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            hist['rsi'] = 100 - (100 / (1 + rs))

            # MACD
            exp1 = hist['Close'].ewm(span=12, adjust=False).mean()
            exp2 = hist['Close'].ewm(span=26, adjust=False).mean()
            hist['macd'] = exp1 - exp2
            hist['macd_signal'] = hist['macd'].ewm(span=9, adjust=False).mean()
            hist['macd_hist'] = hist['macd'] - hist['macd_signal']

            # EMA/SMA
            hist['ema_20'] = hist['Close'].ewm(span=20, adjust=False).mean()
            hist['sma_50'] = hist['Close'].rolling(window=50).mean()

        data = []
        for index, row in hist.iterrows():
            if interval in ["5m", "15m", "1h"]:
                naive_dt = index.replace(tzinfo=None)
                item_time = int(calendar.timegm(naive_dt.timetuple()))
            else:
                item_time = index.strftime("%Y-%m-%d")
                
            data.append({
                "time": item_time,
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
                "rsi": round(float(row.get("rsi", 0)), 2) if not pd.isna(row.get("rsi")) else None,
                "macd": round(float(row.get("macd", 0)), 2) if not pd.isna(row.get("macd")) else None,
                "macd_signal": round(float(row.get("macd_signal", 0)), 2) if not pd.isna(row.get("macd_signal")) else None,
                "macd_hist": round(float(row.get("macd_hist", 0)), 2) if not pd.isna(row.get("macd_hist")) else None,
                "ema_20": round(float(row.get("ema_20", 0)), 2) if not pd.isna(row.get("ema_20")) else None,
                "sma_50": round(float(row.get("sma_50", 0)), 2) if not pd.isna(row.get("sma_50")) else None,
            })
        return data
    except Exception as e:
        print(f"Error fetching {yf_symbol}: {e}")
        return []

def fetch_stock_info(symbol: str):
    yf_symbol = symbol if "." in symbol else f"{symbol}.NS"
    try:
        stock = yf.Ticker(yf_symbol)
        info = stock.info
        return {
            "symbol": symbol,
            "name": info.get("longName"),
            "sector": info.get("sector"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "high_52w": info.get("fiftyTwoWeekHigh"),
            "low_52w": info.get("fiftyTwoWeekLow"),
            "summary": info.get("longBusinessSummary"),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "change_pct": info.get("regularMarketChangePercent")
        }
    except Exception as e:
        print(f"Error fetching info for {yf_symbol}: {e}")
        return None

class DataService:
    def __init__(self):
        redis_host = os.getenv("REDIS_HOST", "localhost")
        try:
            self.redis_client = redis.Redis(host=redis_host, port=6379, db=0, socket_timeout=5)
            self.redis_client.ping()
        except Exception:
            self.redis_client = None # Fallback if Redis is down

    def cache_stock_list(self, category: str, data: List[Dict]):
        if self.redis_client:
            self.redis_client.set(f"stocks:{category}", json.dumps(data), ex=86400)

    def get_cached_stock_list(self, category: str):
        if self.redis_client:
            try:
                data = self.redis_client.get(f"stocks:{category}")
                return json.loads(data) if data else None
            except:
                return None
        return None

    def cache_historical_data(self, symbol: str, interval: str, data: List[Dict]):
        if self.redis_client:
            self.redis_client.set(f"history:{symbol}:{interval}", json.dumps(data, default=str), ex=300) # 5 min cache for intraday/freshness

    def get_cached_historical_data(self, symbol: str, interval: str):
        if self.redis_client:
            try:
                raw = self.redis_client.get(f"history:{symbol}:{interval}")
                return json.loads(raw) if raw else None
            except: return None
        return None

    def cache_stock_info(self, symbol: str, data: Dict):
        if self.redis_client:
            try:
                self.redis_client.set(f"info:{symbol}", json.dumps(data), ex=3600) # 1 hour cache
            except: pass

    def get_cached_stock_info(self, symbol: str):
        if self.redis_client:
            try:
                raw = self.redis_client.get(f"info:{symbol}")
                return json.loads(raw) if raw else None
            except: return None
        return None

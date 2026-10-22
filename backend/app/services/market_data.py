import time
import math
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

INDIAN_WATCHLIST = [
    # Indian Indices
    {"symbol": "NIFTY", "name": "NIFTY 50", "segment": "INDEX", "base_price": 24850.0, "tick_size": 0.05, "lot_size": 25, "currency": "₹"},
    {"symbol": "BANKNIFTY", "name": "NIFTY BANK", "segment": "INDEX", "base_price": 52400.0, "tick_size": 0.05, "lot_size": 15, "currency": "₹"},
    {"symbol": "FINNIFTY", "name": "NIFTY FINANCIAL", "segment": "INDEX", "base_price": 23800.0, "tick_size": 0.05, "lot_size": 40, "currency": "₹"},
    {"symbol": "SENSEX", "name": "BSE SENSEX", "segment": "INDEX", "base_price": 81600.0, "tick_size": 0.05, "lot_size": 10, "currency": "₹"},
    # Indian Large Caps
    {"symbol": "RELIANCE", "name": "Reliance Industries", "segment": "EQUITY", "base_price": 2985.0, "tick_size": 0.05, "lot_size": 250, "currency": "₹"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "segment": "EQUITY", "base_price": 1682.0, "tick_size": 0.05, "lot_size": 550, "currency": "₹"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "segment": "EQUITY", "base_price": 4125.0, "tick_size": 0.05, "lot_size": 175, "currency": "₹"},
    {"symbol": "INFY", "name": "Infosys Ltd", "segment": "EQUITY", "base_price": 1892.0, "tick_size": 0.05, "lot_size": 400, "currency": "₹"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "segment": "EQUITY", "base_price": 1245.0, "tick_size": 0.05, "lot_size": 700, "currency": "₹"},
    {"symbol": "TATAMOTORS", "name": "Tata Motors Ltd", "segment": "EQUITY", "base_price": 965.0, "tick_size": 0.05, "lot_size": 1425, "currency": "₹"},
    {"symbol": "SBIN", "name": "State Bank of India", "segment": "EQUITY", "base_price": 842.0, "tick_size": 0.05, "lot_size": 1500, "currency": "₹"},
    # US Tech Giants
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "segment": "US_EQUITY", "base_price": 138.5, "tick_size": 0.01, "lot_size": 10, "currency": "$"},
    {"symbol": "AAPL", "name": "Apple Inc.", "segment": "US_EQUITY", "base_price": 234.2, "tick_size": 0.01, "lot_size": 10, "currency": "$"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "segment": "US_EQUITY", "base_price": 218.4, "tick_size": 0.01, "lot_size": 10, "currency": "$"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "segment": "US_EQUITY", "base_price": 428.1, "tick_size": 0.01, "lot_size": 10, "currency": "$"},
    # Crypto Assets
    {"symbol": "BTC", "name": "Bitcoin / USD", "segment": "CRYPTO", "base_price": 68450.0, "tick_size": 0.50, "lot_size": 1, "currency": "$"},
    {"symbol": "ETH", "name": "Ethereum / USD", "segment": "CRYPTO", "base_price": 2680.0, "tick_size": 0.10, "lot_size": 1, "currency": "$"},
]

# Timeframe to seconds mapping
TIMEFRAME_SECONDS = {
    "1m": 60,
    "3m": 180,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "1d": 86400,
}

_LIVE_PRICE_CACHE: Dict[str, Dict[str, Any]] = {}

def get_symbol_meta(symbol: str) -> Dict[str, Any]:
    sym = symbol.upper()
    for item in INDIAN_WATCHLIST:
        if item["symbol"] == sym:
            return item
    return {"symbol": sym, "name": sym, "segment": "EQUITY", "base_price": 1000.0, "tick_size": 0.05, "lot_size": 1}

def generate_candles(symbol: str, timeframe: str = "5m", count: int = 300) -> List[Dict[str, Any]]:
    meta = get_symbol_meta(symbol)
    base = meta["base_price"]
    step_sec = TIMEFRAME_SECONDS.get(timeframe, 300)
    
    # Generate realistic pseudo-random geometric brownian motion with mean-reversion & trends
    now_ts = int(time.time())
    start_ts = now_ts - (count * step_sec)
    
    candles = []
    current_price = base * (1 + 0.01 * math.sin(now_ts / 100000))
    volatility = 0.0018 if meta["segment"] == "INDEX" else 0.0028
    
    np.random.seed(int(abs(hash(symbol)) % 1000000) + step_sec)
    
    for i in range(count):
        t = start_ts + (i * step_sec)
        
        drift = 0.00005 * math.sin(i / 15.0)
        shock = np.random.normal(0, volatility)
        pct_change = drift + shock
        
        open_price = current_price
        close_price = max(1.0, round(open_price * (1 + pct_change), 2))
        
        high_extra = abs(np.random.normal(0, volatility * 0.8)) * open_price
        low_extra = abs(np.random.normal(0, volatility * 0.8)) * open_price
        
        high_price = round(max(open_price, close_price) + high_extra, 2)
        low_price = round(min(open_price, close_price) - low_extra, 2)
        
        volume = int(np.random.lognormal(mean=9.5 if meta["segment"] == "INDEX" else 8.5, sigma=0.5))
        
        candles.append({
            "time": t,
            "open": open_price,
            "high": high_price,
            "low": low_price,
            "close": close_price,
            "volume": volume
        })
        current_price = close_price
        
    _LIVE_PRICE_CACHE[symbol.upper()] = {
        "last_price": current_price,
        "high": max(c["high"] for c in candles[-20:]),
        "low": min(c["low"] for c in candles[-20:]),
        "change": round(current_price - candles[0]["open"], 2),
        "change_percent": round(((current_price - candles[0]["open"]) / candles[0]["open"]) * 100, 2),
        "volume": sum(c["volume"] for c in candles[-20:]),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    
    return candles

def get_market_tickers() -> List[Dict[str, Any]]:
    tickers = []
    for item in INDIAN_WATCHLIST:
        sym = item["symbol"]
        if sym not in _LIVE_PRICE_CACHE:
            generate_candles(sym, "5m", 50)
            
        cached = _LIVE_PRICE_CACHE.get(sym, {})
        last_price = cached.get("last_price", item["base_price"])
        change = cached.get("change", 0.0)
        change_pct = cached.get("change_percent", 0.0)
        
        # Slight dynamic tick jitter
        jitter = round(np.random.uniform(-0.05, 0.05) * (last_price * 0.0003), 2)
        last_price = round(last_price + jitter, 2)
        
        tickers.append({
            "symbol": sym,
            "name": item["name"],
            "segment": item["segment"],
            "last_price": last_price,
            "change": round(change + jitter, 2),
            "change_percent": change_pct,
            "high": cached.get("high", last_price * 1.01),
            "low": cached.get("low", last_price * 0.99),
            "volume": cached.get("volume", 150000),
            "timestamp": datetime.now().strftime("%H:%M:%S IST")
        })
    return tickers

def get_live_quote(symbol: str) -> Dict[str, Any]:
    sym = symbol.upper()
    if sym not in _LIVE_PRICE_CACHE:
        generate_candles(sym, "5m", 100)
    cached = _LIVE_PRICE_CACHE[sym]
    meta = get_symbol_meta(sym)
    return {
        "symbol": sym,
        "name": meta["name"],
        "segment": meta["segment"],
        "lot_size": meta["lot_size"],
        "tick_size": meta["tick_size"],
        "last_price": cached["last_price"],
        "change": cached["change"],
        "change_percent": cached["change_percent"],
        "high": cached["high"],
        "low": cached["low"],
        "volume": cached["volume"],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
    }

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import api_router
from app.services.market_data import get_market_tickers

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("bharatquant")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database schemas initialized.")
    yield
    logger.info("Shutting down BharatQuant AI backend.")

app = FastAPI(
    title=settings.APP_NAME,
    description="India's AI-Powered Trading, Charting, Options Analytics & Strategy Backtesting Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local development & cross-port Next.js
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def root():
    return {
        "platform": "BharatQuant AI",
        "description": "Professional-grade Indian Financial Markets Platform",
        "docs_url": "/docs",
        "health": "OK",
        "broker_support": "Angel One SmartAPI"
    }

@app.get("/api/health")
def health():
    return {
        "status": "HEALTHY",
        "service": "BharatQuant Backend",
        "database": "SQLite (WAL Mode)",
        "angel_one_broker": "Ready (Dual Live/Mock boundary)",
        "mode": "ACTIVE"
    }

# WebSocket for real-time market data streaming
@app.websocket("/ws/stream")
async def websocket_market_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            tickers = get_market_tickers()
            payload = {
                "type": "TICKER_UPDATE",
                "tickers": tickers
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.5) # Send tick update every 1.5s
    except WebSocketDisconnect:
        logger.info("Client disconnected from market websocket stream.")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

import pandas as pd
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List, Optional

from app.schemas.schemas import (
    TradeCalculatorRequest,
    TradeCalculatorResponse,
    BacktestRequest,
    BacktestResponse,
    OrderPlacementRequest,
    RiskSettingsUpdateRequest,
    AngelOneConfigRequest
)
from app.services.market_data import (
    get_market_tickers,
    get_live_quote,
    generate_candles,
    INDIAN_WATCHLIST
)
from app.services.indicators import calculate_all_indicators
from app.services.option_chain import generate_option_chain
from app.services.ai_scenarios import generate_explainable_scenarios
from app.services.trade_scanner import scan_market_setups
from app.services.trade_planner import calculate_trade_plan
from app.services.strategy_engine import PRESET_STRATEGIES
from app.services.backtester import run_backtest
from app.services.paper_trading import paper_trading_engine
from app.services.angel_one import angel_one_client
from app.services.live_trading import live_trading_service
from app.services.risk_manager import risk_manager
from app.services.predictor_engine import generate_stock_prediction, simulate_monte_carlo

api_router = APIRouter()

# ----------------- Market Data Endpoints -----------------
@api_router.get("/market/tickers")
def get_tickers():
    return get_market_tickers()

@api_router.get("/market/quote/{symbol}")
def get_quote(symbol: str):
    return get_live_quote(symbol)

@api_router.get("/market/candles")
def get_candles(symbol: str = "NIFTY", timeframe: str = "5m", count: int = 300):
    candles = generate_candles(symbol, timeframe, count)
    return {"symbol": symbol.upper(), "timeframe": timeframe, "candles": candles}

@api_router.get("/market/indicators")
def get_indicators(symbol: str = "NIFTY", timeframe: str = "5m", count: int = 300):
    candles = generate_candles(symbol, timeframe, count)
    df = pd.DataFrame(candles)
    indicators = calculate_all_indicators(df)
    return {"symbol": symbol.upper(), "timeframe": timeframe, "indicators": indicators}

# ----------------- Options Chain Endpoints -----------------
@api_router.get("/options/chain")
def get_option_chain(symbol: str = "NIFTY", expiry: Optional[str] = None):
    return generate_option_chain(symbol, expiry=expiry)

# ----------------- AI Market Intelligence -----------------
@api_router.get("/ai/scenarios")
def get_ai_scenarios(symbol: str = "NIFTY"):
    return generate_explainable_scenarios(symbol)

# ----------------- High-Conviction Scanner -----------------
@api_router.get("/scanner/setups")
def get_scanner_setups():
    return scan_market_setups()

# ----------------- Trade & Risk Calculator -----------------
@api_router.post("/calculator/plan", response_model=TradeCalculatorResponse)
def calculate_plan(req: TradeCalculatorRequest):
    plan = calculate_trade_plan(
        symbol=req.symbol,
        instrument_type=req.instrument_type,
        direction=req.transaction_type,
        entry_price=req.entry_price,
        stop_loss=req.stop_loss,
        target1=req.target1,
        target2=req.target2,
        capital=req.capital,
        risk_percent=req.risk_percent,
        custom_qty=req.custom_qty,
        lot_size=req.lot_size
    )
    return plan

# ----------------- Strategy Lab & Backtesting -----------------
@api_router.get("/strategies")
def list_strategies():
    return PRESET_STRATEGIES

@api_router.post("/backtest/run")
def execute_backtest(req: BacktestRequest):
    rules = None
    if req.strategy_id:
        for s in PRESET_STRATEGIES:
            if s["id"] == req.strategy_id:
                rules = s["rules"]
                req.strategy_name = s["name"]
                break
                
    result = run_backtest(
        symbol=req.symbol,
        timeframe=req.timeframe,
        starting_capital=req.starting_capital,
        strategy_rules=rules,
        strategy_name=req.strategy_name,
        in_sample_ratio=req.in_sample_ratio,
        slippage_points=req.slippage_points
    )
    return result

# ----------------- Paper Trading -----------------
@api_router.get("/paper/summary")
def get_paper_summary():
    return paper_trading_engine.get_summary()

@api_router.post("/paper/order")
def place_paper_order(order: OrderPlacementRequest):
    return paper_trading_engine.place_paper_order(
        symbol=order.symbol,
        transaction_type=order.transaction_type,
        quantity=order.quantity,
        order_type=order.order_type,
        product_type=order.product_type,
        price=order.price,
        stop_loss=order.stop_loss,
        target=order.target
    )

@api_router.post("/paper/reset")
def reset_paper_account(initial_capital: float = 1_000_000.0):
    paper_trading_engine.reset(initial_capital)
    return {"status": "SUCCESS", "message": f"Paper account reset to ₹{initial_capital:,.2f}."}

# ----------------- Broker & Live Trading -----------------
@api_router.get("/broker/status")
def get_broker_status():
    return angel_one_client.get_connection_status()

@api_router.post("/broker/configure")
def configure_broker(creds: AngelOneConfigRequest):
    angel_one_client.configure(
        api_key=creds.api_key,
        client_code=creds.client_code,
        pin=creds.pin,
        totp_secret=creds.totp_secret
    )
    login_result = angel_one_client.login()
    return {
        "status": login_result["status"],
        "message": login_result["message"],
        "broker_info": angel_one_client.get_connection_status()
    }

@api_router.post("/live/pre-check")
def live_pre_check(order: OrderPlacementRequest):
    return live_trading_service.verify_pre_trade(
        symbol=order.symbol,
        transaction_type=order.transaction_type,
        quantity=order.quantity,
        price=order.price,
        stop_loss=order.stop_loss,
        target=order.target
    )

@api_router.post("/live/order")
def place_live_order(order: OrderPlacementRequest):
    return live_trading_service.execute_live_order(
        symbol=order.symbol,
        transaction_type=order.transaction_type,
        quantity=order.quantity,
        price=order.price,
        order_type=order.order_type,
        product_type=order.product_type,
        stop_loss=order.stop_loss,
        target=order.target,
        explicit_confirmation=order.explicit_confirmation
    )

@api_router.post("/live/kill-switch")
def trigger_kill_switch():
    return live_trading_service.emergency_kill_switch_square_off()

# ----------------- Risk Manager -----------------
@api_router.get("/risk/settings")
def get_risk_settings():
    return risk_manager.get_status()

@api_router.put("/risk/settings")
def update_risk_settings(req: RiskSettingsUpdateRequest):
    data = req.model_dump(exclude_unset=True)
    return risk_manager.update_settings(data)

# ----------------- AI Stock Chart Predictor Endpoints -----------------
@api_router.get("/predictor/forecast")
def get_stock_forecast(
    symbol: str = "NIFTY",
    timeframe: str = "5m",
    horizon: str = "24h"
):
    """
    Returns complete AI chart prediction:
    - Historical candles + indicators
    - Forward-projected future candles with confidence envelope
    - Monte Carlo path simulations (500 runs)
    - Bullish / Bearish / Neutral calibrated probabilities
    - Detected chart patterns & support/resistance pivots
    - Explainable AI quantitative reasoning & actionable trade plan
    """
    return generate_stock_prediction(symbol=symbol, timeframe=timeframe, horizon=horizon)

@api_router.get("/predictor/watchlist")
def get_predictor_watchlist():
    """
    Returns supported assets (Indian Indices, Large Caps, US Tech, Crypto).
    """
    from app.services.market_data import INDIAN_WATCHLIST
    return INDIAN_WATCHLIST


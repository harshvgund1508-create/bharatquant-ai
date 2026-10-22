import pytest
import pandas as pd
import numpy as np
from app.services.indicators import calculate_all_indicators
from app.services.option_chain import (
    black_scholes_call,
    black_scholes_put,
    calculate_greeks,
    calculate_max_pain,
    generate_option_chain
)
from app.services.trade_planner import calculate_indian_statutory_charges, calculate_trade_plan
from app.services.risk_manager import RiskManager
from app.services.backtester import run_backtest
from app.services.paper_trading import PaperTradingEngine
from app.services.angel_one import AngelOneSmartAPI

def test_indicators_calculation():
    dates = pd.date_range("2026-01-01", periods=100, freq="5min")
    prices = np.linspace(24000, 24500, 100)
    df = pd.DataFrame({
        "time": [int(d.timestamp()) for d in dates],
        "open": prices,
        "high": prices + 15,
        "low": prices - 15,
        "close": prices + 5,
        "volume": [1000] * 100
    })
    ind = calculate_all_indicators(df)
    assert len(ind["ema9"]) == 100
    assert len(ind["vwap"]) == 100
    assert len(ind["rsi14"]) == 100
    assert ind["rsi14"][-1] > 50 # Upward trend should have RSI > 50
    assert ind["pdh"] > 0
    assert ind["orb_high"] > 0

def test_black_scholes_and_greeks():
    S = 25000.0
    K = 25000.0
    T = 7 / 365.0 # 7 days
    r = 0.065
    sigma = 0.15
    
    call_p = black_scholes_call(S, K, T, r, sigma)
    put_p = black_scholes_put(S, K, T, r, sigma)
    
    assert call_p > 0
    assert put_p > 0
    
    # Put-Call Parity: C - P ≈ S - K * exp(-r*T)
    parity_diff = abs((call_p - put_p) - (S - K * np.exp(-r * T)))
    assert parity_diff < 0.1
    
    # Greeks
    call_g = calculate_greeks(S, K, T, r, sigma, is_call=True)
    put_g = calculate_greeks(S, K, T, r, sigma, is_call=False)
    
    # ATM Call Delta ~ 0.5, ATM Put Delta ~ -0.5
    assert 0.45 <= call_g["delta"] <= 0.58
    assert -0.55 <= put_g["delta"] <= -0.42
    assert call_g["gamma"] > 0
    assert call_g["theta"] < 0 # Theta is decay (negative)

def test_max_pain_and_chain():
    chain = generate_option_chain("NIFTY")
    assert chain["symbol"] == "NIFTY"
    assert chain["lot_size"] == 25
    assert len(chain["strikes"]) > 0
    assert chain["pcr"] > 0
    assert chain["max_pain"] > 0

def test_indian_charges_and_trade_planner():
    charges = calculate_indian_statutory_charges(
        turnover_buy=50000.0,
        turnover_sell=55000.0,
        instrument_type="OPTION"
    )
    assert charges["brokerage"] == 40.0 # 20 buy + 20 sell
    assert charges["stt"] > 0
    assert charges["gst"] > 0
    assert charges["total_charges"] > 40.0
    
    plan = calculate_trade_plan(
        symbol="NIFTY",
        instrument_type="OPTION",
        direction="BUY",
        entry_price=150.0,
        stop_loss=120.0,
        target1=210.0,
        capital=500_000.0,
        risk_percent=2.0,
        lot_size=25
    )
    assert plan["reward_to_risk_ratio"] == 2.0 # (210-150)/(150-120) = 60/30 = 2.0
    assert plan["planned_max_loss_net"] > 0
    assert plan["potential_profit_t1_net"] > 0

def test_risk_manager_guardrails():
    rm = RiskManager()
    rm.max_capital = 100_000.0
    rm.max_risk_per_trade_percent = 2.0 # Max allowed = 2,000
    
    # 1. Normal risk passes
    ok, msg = rm.validate_pre_trade("NIFTY", planned_loss=1500.0, reward_to_risk=2.0, current_open_positions=1)
    assert ok is True
    
    # 2. Risk exceeding 2% rejected
    ok, msg = rm.validate_pre_trade("NIFTY", planned_loss=3500.0, reward_to_risk=2.0, current_open_positions=1)
    assert ok is False
    assert "exceeds max allowed" in msg
    
    # 3. Kill switch halts
    rm.set_kill_switch(True)
    ok, msg = rm.validate_pre_trade("NIFTY", planned_loss=500.0, reward_to_risk=2.0, current_open_positions=1)
    assert ok is False
    assert "Kill Switch" in msg

def test_backtester():
    result = run_backtest(symbol="NIFTY", timeframe="5m", starting_capital=1_000_000.0)
    assert result["starting_capital"] == 1_000_000.0
    assert "win_rate" in result
    assert "profit_factor" in result
    assert "net_expectancy" in result
    assert "in_sample_metrics" in result
    assert "out_of_sample_metrics" in result
    assert len(result["equity_curve"]) > 0

def test_paper_trading():
    engine = PaperTradingEngine(initial_capital=500_000.0)
    res = engine.place_paper_order("NIFTY", "BUY", quantity=25, order_type="MARKET")
    assert res["status"] == "FILLED"
    
    summary = engine.get_summary()
    assert summary["active_positions_count"] == 1
    assert summary["cash_balance"] < 500_000.0

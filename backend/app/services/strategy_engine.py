import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from app.services.indicators import calculate_all_indicators

PRESET_STRATEGIES = [
    {
        "id": 1,
        "name": "EMA Crossover + VWAP Momentum",
        "description": "Trend-following setup popular in Indian intraday index trading. Enters when 9 EMA crosses 21 EMA above VWAP with RSI confirming momentum.",
        "category": "Momentum",
        "author_attribution": "Algorithmic Quantitative Baseline (Cleaned from Indian retail momentum concepts)",
        "rules": {
            "entry_long": ["EMA_9 > EMA_21", "CLOSE > VWAP", "RSI > 50"],
            "entry_short": ["EMA_9 < EMA_21", "CLOSE < VWAP", "RSI < 50"],
            "stop_loss_atr": 1.2,
            "target_atr": 2.0,
            "time_filter": {"start_time": "09:30", "end_time": "15:00"}
        }
    },
    {
        "id": 2,
        "name": "Opening Range Breakout (ORB 15m)",
        "description": "High-probability breakout system capturing institutional morning orderflow. Evaluates range expansion beyond the high/low of the first 15 minutes.",
        "category": "Breakout",
        "author_attribution": "Classic Toby Crabel / Adapted for Indian Indices (Booming Bulls & Umar Punjabi style breakdown)",
        "rules": {
            "entry_long": ["CLOSE > ORB_HIGH", "VOLUME > 1.2 * AVG_VOL"],
            "entry_short": ["CLOSE < ORB_LOW", "VOLUME > 1.2 * AVG_VOL"],
            "stop_loss_atr": 1.0,
            "target_atr": 2.2,
            "time_filter": {"start_time": "09:30", "end_time": "14:30"}
        }
    },
    {
        "id": 3,
        "name": "Mean Reversion Bollinger + RSI Divergence",
        "description": "Counter-trend strategy looking for exhaustion at 2 standard deviation Bollinger Bands with extreme RSI oversold/overbought readings.",
        "category": "MeanReversion",
        "author_attribution": "John Bollinger Quantitative Formulation",
        "rules": {
            "entry_long": ["CLOSE <= BB_LOWER", "RSI <= 30"],
            "entry_short": ["CLOSE >= BB_UPPER", "RSI >= 70"],
            "stop_loss_atr": 1.5,
            "target_atr": 1.8,
            "time_filter": {"start_time": "10:00", "end_time": "14:45"}
        }
    }
]

def evaluate_signals(df: pd.DataFrame, strategy_rules: Dict[str, Any]) -> pd.DataFrame:
    """
    Evaluates rule criteria on chronological candles without future leakage.
    Returns DataFrame with 'signal' column (1 for LONG, -1 for SHORT, 0 for FLAT).
    """
    ind = calculate_all_indicators(df)
    
    signals = np.zeros(len(df))
    close = df["close"].values
    vwap = np.array([v if v is not None else 0 for v in ind["vwap"]])
    ema9 = np.array([v if v is not None else 0 for v in ind["ema9"]])
    ema21 = np.array([v if v is not None else 0 for v in ind["ema21"]])
    rsi = np.array([v if v is not None else 50 for v in ind["rsi14"]])
    orb_high = ind["orb_high"]
    orb_low = ind["orb_low"]
    
    rules_long = strategy_rules.get("entry_long", ["EMA_9 > EMA_21", "CLOSE > VWAP"])
    rules_short = strategy_rules.get("entry_short", ["EMA_9 < EMA_21", "CLOSE < VWAP"])

    for i in range(1, len(df)):
        # Check long condition
        long_ok = True
        for r in rules_long:
            if r == "EMA_9 > EMA_21" and not (ema9[i] > ema21[i] and ema9[i-1] <= ema21[i-1]):
                long_ok = False
            elif r == "CLOSE > VWAP" and not (close[i] > vwap[i]):
                long_ok = False
            elif r == "RSI > 50" and not (rsi[i] > 50):
                long_ok = False
            elif r == "CLOSE > ORB_HIGH" and not (close[i] > orb_high and close[i-1] <= orb_high):
                long_ok = False
                
        # Check short condition
        short_ok = True
        for r in rules_short:
            if r == "EMA_9 < EMA_21" and not (ema9[i] < ema21[i] and ema9[i-1] >= ema21[i-1]):
                short_ok = False
            elif r == "CLOSE < VWAP" and not (close[i] < vwap[i]):
                short_ok = False
            elif r == "RSI < 50" and not (rsi[i] < 50):
                short_ok = False
            elif r == "CLOSE < ORB_LOW" and not (close[i] < orb_low and close[i-1] >= orb_low):
                short_ok = False

        if long_ok:
            signals[i] = 1
        elif short_ok:
            signals[i] = -1

    df_out = df.copy()
    df_out["signal"] = signals
    df_out["atr"] = ind["atr14"]
    return df_out

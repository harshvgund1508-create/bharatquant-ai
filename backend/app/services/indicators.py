import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional

def compute_ema(series: pd.Series, period: int) -> pd.Series:
    return series.ewm(span=period, adjust=False).mean()

def compute_sma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()

def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    
    # Wilder's smoothing
    avg_gain = gain.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)

def compute_macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = compute_ema(close, fast)
    ema_slow = compute_ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    hist = macd_line - signal_line
    return macd_line, signal_line, hist

def compute_bollinger_bands(close: pd.Series, period: int = 20, std_dev: float = 2.0):
    sma = compute_sma(close, period)
    std = close.rolling(window=period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return upper, sma, lower

def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    atr = tr.ewm(alpha=1/period, min_periods=period, adjust=False).mean()
    return atr.bfill()

def compute_adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    up_move = high.diff()
    down_move = -low.diff()
    
    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)
    
    atr = compute_atr(high, low, close, period)
    
    plus_di = 100 * (pd.Series(plus_dm).ewm(alpha=1/period, adjust=False).mean() / atr.replace(0, np.nan))
    minus_di = 100 * (pd.Series(minus_dm).ewm(alpha=1/period, adjust=False).mean() / atr.replace(0, np.nan))
    
    dx = 100 * ((plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan))
    adx = dx.ewm(alpha=1/period, adjust=False).mean()
    return adx.fillna(20.0)

def compute_vwap(df: pd.DataFrame) -> pd.Series:
    # Intraday cumulative VWAP = sum(typical_price * volume) / sum(volume)
    typical_price = (df["high"] + df["low"] + df["close"]) / 3.0
    cum_pv = (typical_price * df["volume"]).cumsum()
    cum_v = df["volume"].cumsum()
    vwap = cum_pv / cum_v.replace(0, np.nan)
    return vwap.ffill().bfill()

def calculate_all_indicators(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Expects df with columns: ['time', 'open', 'high', 'low', 'close', 'volume']
    Returns dictionary with all technical indicator series and key levels.
    """
    if len(df) == 0:
        return {}

    close = df["close"]
    high = df["high"]
    low = df["low"]
    
    ema9 = compute_ema(close, 9)
    ema21 = compute_ema(close, 21)
    ema50 = compute_ema(close, 50)
    ema200 = compute_ema(close, 200) if len(df) >= 200 else compute_ema(close, len(df))
    
    vwap = compute_vwap(df)
    rsi14 = compute_rsi(close, 14)
    macd, macd_signal, macd_hist = compute_macd(close)
    bb_upper, bb_mid, bb_lower = compute_bollinger_bands(close)
    atr14 = compute_atr(high, low, close, 14)
    adx14 = compute_adx(high, low, close, 14)
    
    # Previous Day High / Low estimate (from earliest 30% of data or previous session)
    split_idx = max(1, int(len(df) * 0.4))
    prev_session = df.iloc[:split_idx]
    pdh = float(prev_session["high"].max())
    pdl = float(prev_session["low"].min())
    
    # Opening Range Breakout (first 3-5 candles depending on timeframe)
    orb_window = min(5, len(df))
    orb_high = float(df.iloc[:orb_window]["high"].max())
    orb_low = float(df.iloc[:orb_window]["low"].min())
    
    # Classical Pivot Points
    pp = (pdh + pdl + float(prev_session["close"].iloc[-1])) / 3.0
    r1 = (2 * pp) - pdl
    s1 = (2 * pp) - pdh
    r2 = pp + (pdh - pdl)
    s2 = pp - (pdh - pdl)

    def clean_series(s: pd.Series) -> List[Optional[float]]:
        return [None if np.isnan(v) else round(float(v), 2) for v in s]

    return {
        "ema9": clean_series(ema9),
        "ema21": clean_series(ema21),
        "ema50": clean_series(ema50),
        "ema200": clean_series(ema200),
        "vwap": clean_series(vwap),
        "rsi14": clean_series(rsi14),
        "macd": clean_series(macd),
        "macd_signal": clean_series(macd_signal),
        "macd_hist": clean_series(macd_hist),
        "bb_upper": clean_series(bb_upper),
        "bb_middle": clean_series(bb_mid),
        "bb_lower": clean_series(bb_lower),
        "atr14": clean_series(atr14),
        "adx14": clean_series(adx14),
        "pdh": round(pdh, 2),
        "pdl": round(pdl, 2),
        "orb_high": round(orb_high, 2),
        "orb_low": round(orb_low, 2),
        "pivot_points": {
            "pp": round(pp, 2),
            "r1": round(r1, 2),
            "s1": round(s1, 2),
            "r2": round(r2, 2),
            "s2": round(s2, 2),
        }
    }

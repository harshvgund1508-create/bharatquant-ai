import math
import pandas as pd
import numpy as np
from typing import Dict, Any, List
from datetime import datetime
from app.services.market_data import generate_candles, get_symbol_meta
from app.services.strategy_engine import evaluate_signals, PRESET_STRATEGIES
from app.services.trade_planner import calculate_indian_statutory_charges

def run_backtest(
    symbol: str = "NIFTY",
    timeframe: str = "5m",
    starting_capital: float = 1_000_000.0,
    strategy_rules: Dict[str, Any] = None,
    strategy_name: str = "EMA Crossover + VWAP Momentum",
    in_sample_ratio: float = 0.70,
    slippage_points: float = 1.0
) -> Dict[str, Any]:
    meta = get_symbol_meta(symbol)
    lot_size = meta["lot_size"]
    
    # Generate 500 historical candles
    candles = generate_candles(symbol, timeframe, count=500)
    df = pd.DataFrame(candles)
    
    if strategy_rules is None:
        # Default to Preset 1
        strategy_rules = PRESET_STRATEGIES[0]["rules"]

    df_signals = evaluate_signals(df, strategy_rules)
    
    # Chronological in-sample and out-of-sample split
    total_candles = len(df_signals)
    split_index = int(total_candles * in_sample_ratio)
    
    trades: List[Dict[str, Any]] = []
    equity = starting_capital
    peak_equity = starting_capital
    max_drawdown = 0.0
    equity_curve: List[Dict[str, Any]] = [{"time": int(df["time"].iloc[0]), "equity": equity, "drawdown": 0.0}]
    
    in_position = False
    pos_type = 0 # 1: Long, -1: Short
    entry_price = 0.0
    entry_time = 0
    stop_loss = 0.0
    target = 0.0
    qty = lot_size * 2 # 2 lots traded by default
    
    sl_atr_mult = strategy_rules.get("stop_loss_atr", 1.2)
    tp_atr_mult = strategy_rules.get("target_atr", 2.0)

    for i in range(1, total_candles):
        row = df_signals.iloc[i]
        t = int(row["time"])
        open_p = float(row["open"])
        high_p = float(row["high"])
        low_p = float(row["low"])
        close_p = float(row["close"])
        sig = row["signal"]
        atr = row["atr"] if row["atr"] is not None and not np.isnan(row["atr"]) else (close_p * 0.006)

        # Check exit if in position
        if in_position:
            exit_trade = False
            exit_price = 0.0
            exit_reason = ""
            
            if pos_type == 1: # LONG
                if low_p <= stop_loss:
                    exit_trade = True
                    exit_price = stop_loss - slippage_points
                    exit_reason = "STOP_LOSS"
                elif high_p >= target:
                    exit_trade = True
                    exit_price = target - slippage_points
                    exit_reason = "TARGET"
                elif sig == -1: # Opposite signal
                    exit_trade = True
                    exit_price = open_p - slippage_points
                    exit_reason = "REVERSAL_SIGNAL"
            elif pos_type == -1: # SHORT
                if high_p >= stop_loss:
                    exit_trade = True
                    exit_price = stop_loss + slippage_points
                    exit_reason = "STOP_LOSS"
                elif low_p <= target:
                    exit_trade = True
                    exit_price = target + slippage_points
                    exit_reason = "TARGET"
                elif sig == 1:
                    exit_trade = True
                    exit_price = open_p + slippage_points
                    exit_reason = "REVERSAL_SIGNAL"

            if exit_trade:
                # Calculate P&L and friction
                if pos_type == 1:
                    gross_pnl = (exit_price - entry_price) * qty
                    turnover_buy = entry_price * qty
                    turnover_sell = exit_price * qty
                else:
                    gross_pnl = (entry_price - exit_price) * qty
                    turnover_buy = exit_price * qty
                    turnover_sell = entry_price * qty

                charges = calculate_indian_statutory_charges(turnover_buy, turnover_sell, "EQUITY", is_intraday=True)
                net_pnl = gross_pnl - charges["total_charges"]
                
                equity += net_pnl
                if equity > peak_equity:
                    peak_equity = equity
                current_dd = ((peak_equity - equity) / peak_equity) * 100.0 if peak_equity > 0 else 0.0
                if current_dd > max_drawdown:
                    max_drawdown = current_dd

                is_in_sample = (i <= split_index)
                
                trades.append({
                    "id": len(trades) + 1,
                    "direction": "LONG" if pos_type == 1 else "SHORT",
                    "entry_time": entry_time,
                    "exit_time": t,
                    "entry_price": round(entry_price, 2),
                    "exit_price": round(exit_price, 2),
                    "quantity": qty,
                    "gross_pnl": round(gross_pnl, 2),
                    "charges": charges["total_charges"],
                    "net_pnl": round(net_pnl, 2),
                    "exit_reason": exit_reason,
                    "is_in_sample": is_in_sample
                })
                
                equity_curve.append({
                    "time": t,
                    "equity": round(equity, 2),
                    "drawdown": round(current_dd, 2)
                })
                
                in_position = False

        # Check entry if flat
        if not in_position and sig != 0:
            pos_type = int(sig)
            entry_price = open_p + (slippage_points if pos_type == 1 else -slippage_points)
            entry_time = t
            in_position = True
            
            if pos_type == 1:
                stop_loss = round(entry_price - (atr * sl_atr_mult), 2)
                target = round(entry_price + (atr * tp_atr_mult), 2)
            else:
                stop_loss = round(entry_price + (atr * sl_atr_mult), 2)
                target = round(entry_price - (atr * tp_atr_mult), 2)

    # Compute statistical metrics
    def calculate_metrics(trade_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not trade_list:
            return {
                "trades_count": 0, "win_rate": 0.0, "avg_win": 0.0, "avg_loss": 0.0,
                "profit_factor": 0.0, "net_expectancy": 0.0, "total_net_pnl": 0.0
            }
        wins = [tr["net_pnl"] for tr in trade_list if tr["net_pnl"] > 0]
        losses = [abs(tr["net_pnl"]) for tr in trade_list if tr["net_pnl"] <= 0]
        
        total_count = len(trade_list)
        win_count = len(wins)
        win_rate = round((win_count / total_count) * 100.0, 2)
        
        avg_win = round(float(np.mean(wins)), 2) if wins else 0.0
        avg_loss = round(float(np.mean(losses)), 2) if losses else 0.0
        
        profit_factor = round(sum(wins) / max(1.0, sum(losses)), 2) if losses else round(sum(wins), 2)
        
        # Net expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
        win_prob = win_count / total_count
        loss_prob = len(losses) / total_count
        net_expectancy = round((win_prob * avg_win) - (loss_prob * avg_loss), 2)
        total_net_pnl = round(sum(tr["net_pnl"] for tr in trade_list), 2)
        
        return {
            "trades_count": total_count,
            "win_rate": win_rate,
            "avg_win": avg_win,
            "avg_loss": avg_loss,
            "profit_factor": profit_factor,
            "net_expectancy": net_expectancy,
            "total_net_pnl": total_net_pnl
        }

    in_sample_trades = [tr for tr in trades if tr["is_in_sample"]]
    out_of_sample_trades = [tr for tr in trades if not tr["is_in_sample"]]
    
    total_metrics = calculate_metrics(trades)
    in_metrics = calculate_metrics(in_sample_trades)
    out_metrics = calculate_metrics(out_of_sample_trades)
    
    # Monthly breakdown
    monthly_map: Dict[str, float] = {}
    for tr in trades:
        m_key = datetime.fromtimestamp(tr["exit_time"]).strftime("%b %Y")
        monthly_map[m_key] = monthly_map.get(m_key, 0.0) + tr["net_pnl"]
        
    monthly_performance = [{"month": k, "net_pnl": round(v, 2)} for k, v in monthly_map.items()]

    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "strategy_name": strategy_name,
        "starting_capital": starting_capital,
        "total_trades": total_metrics["trades_count"],
        "win_rate": total_metrics["win_rate"],
        "avg_win": total_metrics["avg_win"],
        "avg_loss": total_metrics["avg_loss"],
        "profit_factor": total_metrics["profit_factor"],
        "net_expectancy": total_metrics["net_expectancy"],
        "max_drawdown_pct": round(max_drawdown, 2),
        "total_net_pnl": total_metrics["total_net_pnl"],
        "total_charges_paid": round(sum(tr["charges"] for tr in trades), 2),
        "in_sample_metrics": in_metrics,
        "out_of_sample_metrics": out_metrics,
        "equity_curve": equity_curve,
        "monthly_performance": monthly_performance,
        "trades": trades
    }

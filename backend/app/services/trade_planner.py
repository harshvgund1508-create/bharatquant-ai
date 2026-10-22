import math
from typing import Dict, Any, Optional

def calculate_indian_statutory_charges(
    turnover_buy: float,
    turnover_sell: float,
    instrument_type: str = "OPTION", # EQUITY, FUTURES, OPTION
    is_intraday: bool = True
) -> Dict[str, float]:
    """
    Computes exact Indian market charges:
    - Brokerage (Angel One / Discount Broker format): Flat ₹20 per executed order (buy + sell = ₹40)
    - STT / CTT:
        * Equity Intraday: 0.025% on Sell
        * Equity Delivery: 0.1% on Buy & Sell
        * Futures: 0.0125% on Sell
        * Options: 0.0625% on Sell premium
    - Exchange Transaction Charges (NSE):
        * Equity: 0.00345%
        * Futures: 0.002%
        * Options: 0.053% on premium turnover
    - SEBI Turnover Charges: 0.0001% (₹10 / crore)
    - Stamp Duty (State Duty on Buy):
        * Equity Intraday: 0.003%
        * Equity Delivery: 0.015%
        * Futures: 0.002%
        * Options: 0.003%
    - GST: 18% on (Brokerage + Exchange Charges + SEBI charges)
    """
    total_turnover = turnover_buy + turnover_sell
    
    # Brokerage
    brokerage_buy = min(20.0, turnover_buy * 0.0005) if turnover_buy > 0 else 0.0
    brokerage_sell = min(20.0, turnover_sell * 0.0005) if turnover_sell > 0 else 0.0
    brokerage = round(brokerage_buy + brokerage_sell, 2)
    
    # STT / CTT
    if instrument_type == "EQUITY":
        if is_intraday:
            stt = round(turnover_sell * 0.00025, 2)
        else:
            stt = round(total_turnover * 0.001, 2)
    elif instrument_type == "FUTURES":
        stt = round(turnover_sell * 0.000125, 2)
    else: # OPTION (on premium)
        stt = round(turnover_sell * 0.000625, 2)
        
    # Exchange Transaction Charges
    if instrument_type == "EQUITY":
        exchange_charges = round(total_turnover * 0.0000345, 2)
    elif instrument_type == "FUTURES":
        exchange_charges = round(total_turnover * 0.00002, 2)
    else: # OPTION
        exchange_charges = round(total_turnover * 0.00053, 2)
        
    # SEBI Charges (₹10 / Cr)
    sebi_charges = round(total_turnover * 0.000001, 2)
    
    # Stamp Duty (Charged only on Buy turnover)
    if instrument_type == "EQUITY":
        stamp_duty = round(turnover_buy * (0.00003 if is_intraday else 0.00015), 2)
    elif instrument_type == "FUTURES":
        stamp_duty = round(turnover_buy * 0.00002, 2)
    else: # OPTION
        stamp_duty = round(turnover_buy * 0.00003, 2)
        
    # GST (18% on Brokerage + Exchange Charges + SEBI Charges)
    taxable_services = brokerage + exchange_charges + sebi_charges
    gst = round(taxable_services * 0.18, 2)
    
    total_charges = round(brokerage + stt + exchange_charges + sebi_charges + stamp_duty + gst, 2)
    
    return {
        "brokerage": brokerage,
        "stt": stt,
        "exchange_txn_charges": exchange_charges,
        "sebi_turnover_charges": sebi_charges,
        "stamp_duty": stamp_duty,
        "gst": gst,
        "total_charges": total_charges
    }

def calculate_trade_plan(
    symbol: str,
    instrument_type: str,
    direction: str, # BUY, SELL
    entry_price: float,
    stop_loss: float,
    target1: float,
    target2: Optional[float] = None,
    capital: float = 1_000_000.0,
    risk_percent: float = 2.0,
    custom_qty: Optional[int] = None,
    lot_size: int = 25,
    estimated_slippage_points: float = 0.5
) -> Dict[str, Any]:
    risk_budget = round(capital * (risk_percent / 100.0), 2)
    
    # Price per share risk
    if direction.upper() == "BUY":
        risk_per_unit = max(0.05, entry_price - stop_loss)
        reward_per_unit_t1 = max(0.0, target1 - entry_price)
        reward_per_unit_t2 = max(0.0, target2 - entry_price) if target2 else None
    else:
        risk_per_unit = max(0.05, stop_loss - entry_price)
        reward_per_unit_t1 = max(0.0, entry_price - target1)
        reward_per_unit_t2 = max(0.0, entry_price - target2) if target2 else None

    # Determine recommended quantity constrained by risk budget and lot size
    if custom_qty and custom_qty > 0:
        recommended_qty = custom_qty
        lots_count = max(1, recommended_qty // lot_size)
    else:
        raw_units = risk_budget / risk_per_unit
        if lot_size > 1:
            lots = max(1, int(raw_units // lot_size))
            recommended_qty = lots * lot_size
            lots_count = lots
        else:
            recommended_qty = max(1, int(raw_units))
            lots_count = 1

    capital_required = round(entry_price * recommended_qty, 2)
    
    # Gross and Net Loss at Stop Loss
    turnover_buy = round(entry_price * recommended_qty, 2)
    turnover_sl = round(stop_loss * recommended_qty, 2)
    slippage_cost = round(estimated_slippage_points * recommended_qty, 2)
    
    charges_sl = calculate_indian_statutory_charges(turnover_buy, turnover_sl, instrument_type)
    planned_max_loss_gross = round(risk_per_unit * recommended_qty, 2)
    planned_max_loss_net = round(planned_max_loss_gross + charges_sl["total_charges"] + slippage_cost, 2)

    # Gross and Net Profit at Target 1
    turnover_t1 = round(target1 * recommended_qty, 2)
    charges_t1 = calculate_indian_statutory_charges(turnover_buy, turnover_t1, instrument_type)
    profit_t1_gross = round(reward_per_unit_t1 * recommended_qty, 2)
    potential_profit_t1_net = round(profit_t1_gross - charges_t1["total_charges"] - slippage_cost, 2)

    # Gross and Net Profit at Target 2
    potential_profit_t2_net = None
    if target2 and reward_per_unit_t2:
        turnover_t2 = round(target2 * recommended_qty, 2)
        charges_t2 = calculate_indian_statutory_charges(turnover_buy, turnover_t2, instrument_type)
        profit_t2_gross = round(reward_per_unit_t2 * recommended_qty, 2)
        potential_profit_t2_net = round(profit_t2_gross - charges_t2["total_charges"] - slippage_cost, 2)

    # Reward to Risk ratio
    rr_ratio = round(reward_per_unit_t1 / risk_per_unit, 2) if risk_per_unit > 0 else 0.0

    # Breakeven price calculation
    breakeven_diff = (charges_t1["total_charges"] + slippage_cost) / recommended_qty
    breakeven_price = round(entry_price + breakeven_diff if direction.upper() == "BUY" else entry_price - breakeven_diff, 2)

    risk_warning = None
    if planned_max_loss_net > (risk_budget * 1.1):
        risk_warning = f"Warning: Minimum lot size ({lot_size}) causes net risk (₹{planned_max_loss_net}) to exceed risk budget (₹{risk_budget}). Consider paper trading or reducing position."

    return {
        "symbol": symbol.upper(),
        "lot_size": lot_size,
        "recommended_qty": recommended_qty,
        "lots_count": lots_count,
        "capital_required": capital_required,
        "risk_budget": risk_budget,
        "planned_max_loss_gross": planned_max_loss_gross,
        "planned_max_loss_net": planned_max_loss_net,
        "potential_profit_t1_net": potential_profit_t1_net,
        "potential_profit_t2_net": potential_profit_t2_net,
        "reward_to_risk_ratio": rr_ratio,
        "charges_breakdown": charges_t1,
        "estimated_slippage": slippage_cost,
        "breakeven_price": breakeven_price,
        "risk_warning": risk_warning
    }

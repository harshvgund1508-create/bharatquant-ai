from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class CandleData(BaseModel):
    time: int # Unix timestamp in seconds
    open: float
    high: float
    low: float
    close: float
    volume: float

class IndicatorsResponse(BaseModel):
    ema9: List[Optional[float]]
    ema21: List[Optional[float]]
    ema50: List[Optional[float]]
    ema200: List[Optional[float]]
    vwap: List[Optional[float]]
    rsi14: List[Optional[float]]
    macd: List[Optional[float]]
    macd_signal: List[Optional[float]]
    macd_hist: List[Optional[float]]
    bb_upper: List[Optional[float]]
    bb_middle: List[Optional[float]]
    bb_lower: List[Optional[float]]
    atr14: List[Optional[float]]
    adx14: List[Optional[float]]
    pdh: float
    pdl: float
    orb_high: float
    orb_low: float

class MarketSymbolSummary(BaseModel):
    symbol: str
    name: str
    segment: str # INDEX, EQUITY, OPTION
    last_price: float
    change: float
    change_percent: float
    high: float
    low: float
    volume: float
    timestamp: str

class OptionGreeks(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float
    iv: float

class OptionStrikeItem(BaseModel):
    strike_price: float
    call_oi: int
    call_change_oi: int
    call_volume: int
    call_iv: float
    call_ltp: float
    call_change: float
    call_bid: float
    call_ask: float
    call_greeks: OptionGreeks
    put_oi: int
    put_change_oi: int
    put_volume: int
    put_iv: float
    put_ltp: float
    put_change: float
    put_bid: float
    put_ask: float
    put_greeks: OptionGreeks
    status: str # ITM, ATM, OTM

class OptionChainResponse(BaseModel):
    symbol: str
    underlying_price: float
    lot_size: int
    expiry: str
    available_expiries: List[str]
    pcr: float
    pcr_volume: float
    max_pain: float
    total_call_oi: int
    total_put_oi: int
    timestamp: str
    strikes: List[OptionStrikeItem]
    warnings: List[str]

class ScenarioDetail(BaseModel):
    direction: str # Bullish, Bearish, Range-bound
    confidence_score: float # Statistically calibrated 0.0 - 1.0
    evidence: List[str]
    trigger_level: float
    invalidation_level: float
    target_levels: List[float]
    risk_factors: List[str]
    time_horizon: str

class AIScenarioResponse(BaseModel):
    symbol: str
    underlying_price: float
    timestamp: str
    market_regime: str # Strong Bullish Trend, Mild Bearish, Consolidation, High Volatility
    regime_confidence: float
    volatility_state: str # Compressed, Normal, Expanding
    data_freshness_sec: int
    bullish: ScenarioDetail
    bearish: ScenarioDetail
    range_bound: ScenarioDetail
    limitations: List[str]

class TradeSetupItem(BaseModel):
    id: str
    symbol: str
    instrument_type: str # EQUITY, FUTURES, OPTION_CALL, OPTION_PUT
    conviction: str # HIGH_CONVICTION, WATCHLIST, NO_TRADE
    direction: str # BUY, SELL
    entry_trigger: float
    stop_loss: float
    target1: float
    target2: float
    reward_to_risk: float
    lot_size: int
    recommended_qty: int
    planned_max_loss: float
    estimated_net_profit: float
    brokerage_charges: float
    estimated_slippage: float
    technical_evidence: List[str]
    option_evidence: List[str]
    conflicting_signals: List[str]
    invalidation_conditions: List[str]
    historical_win_rate_sample: Optional[float] = None
    historical_sample_size: Optional[int] = None

class TradeCalculatorRequest(BaseModel):
    symbol: str
    instrument_type: str = "OPTION" # EQUITY, FUTURES, OPTION
    transaction_type: str = "BUY" # BUY, SELL
    entry_price: float
    stop_loss: float
    target1: float
    target2: Optional[float] = None
    capital: float = 1_000_000.0
    risk_percent: float = 2.0 # 2% max risk per trade
    custom_qty: Optional[int] = None
    lot_size: int = 25

class TradeCalculatorResponse(BaseModel):
    symbol: str
    lot_size: int
    recommended_qty: int
    lots_count: int
    capital_required: float
    risk_budget: float
    planned_max_loss_gross: float
    planned_max_loss_net: float
    potential_profit_t1_net: float
    potential_profit_t2_net: Optional[float]
    reward_to_risk_ratio: float
    charges_breakdown: Dict[str, float]
    breakeven_price: float
    risk_warning: Optional[str] = None

class StrategyCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "Momentum"
    rules: Dict[str, Any]
    parameters: Optional[Dict[str, Any]] = None

class BacktestRequest(BaseModel):
    symbol: str = "NIFTY"
    timeframe: str = "5m"
    start_date: str = "2026-01-01"
    end_date: str = "2026-10-18"
    starting_capital: float = 1_000_000.0
    strategy_id: Optional[int] = None
    strategy_name: str = "EMA Crossover + VWAP Momentum"
    in_sample_ratio: float = 0.70 # 70% in-sample, 30% out-of-sample walk-forward
    lot_size: int = 25
    slippage_points: float = 1.0

class BacktestResponse(BaseModel):
    id: Optional[int] = None
    symbol: str
    timeframe: str
    strategy_name: str
    starting_capital: float
    total_trades: int
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    net_expectancy: float
    max_drawdown_pct: float
    total_net_pnl: float
    total_charges_paid: float
    in_sample_metrics: Dict[str, Any]
    out_of_sample_metrics: Dict[str, Any]
    equity_curve: List[Dict[str, Any]]
    monthly_performance: List[Dict[str, Any]]
    trades: List[Dict[str, Any]]

class OrderPlacementRequest(BaseModel):
    symbol: str
    token: Optional[str] = None
    exchange: str = "NSE"
    transaction_type: str # BUY, SELL
    order_type: str = "MARKET" # MARKET, LIMIT, SL_M
    product_type: str = "INTRADAY" # INTRADAY, CARRYFORWARD
    quantity: int
    price: Optional[float] = None
    trigger_price: Optional[float] = None
    stop_loss: Optional[float] = None
    target: Optional[float] = None
    explicit_confirmation: bool = False

class RiskSettingsUpdateRequest(BaseModel):
    max_capital: Optional[float] = None
    max_risk_per_trade_percent: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    max_open_positions: Optional[int] = None
    min_reward_to_risk_ratio: Optional[float] = None
    kill_switch_active: Optional[bool] = None

class AngelOneConfigRequest(BaseModel):
    api_key: str
    client_code: str
    pin: str
    totp_secret: str

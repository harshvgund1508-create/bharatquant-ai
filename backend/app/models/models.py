import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default="Momentum") # Momentum, Breakout, MeanReversion, Options
    rules_json = Column(JSON, nullable=False) # Visual nodes & conditions
    parameters_json = Column(JSON, nullable=True) # Customizable inputs
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    backtests = relationship("BacktestRecord", back_populates="strategy", cascade="all, delete-orphan")

class BacktestRecord(Base):
    __tablename__ = "backtest_records"

    id = Column(Integer, primary_key=True, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    strategy_name = Column(String(100), nullable=False)
    symbol = Column(String(50), nullable=False) # e.g. NIFTY, BANKNIFTY
    timeframe = Column(String(20), nullable=False) # 5m, 15m, 1d
    start_date = Column(String(30), nullable=False)
    end_date = Column(String(30), nullable=False)
    starting_capital = Column(Float, default=1_000_000.0)
    
    # Walk-forward validation results
    in_sample_metrics = Column(JSON, nullable=True)
    out_of_sample_metrics = Column(JSON, nullable=True)
    total_metrics = Column(JSON, nullable=False) # win_rate, pnl, max_drawdown, profit_factor, expectancy
    equity_curve = Column(JSON, nullable=False) # [{time, equity, drawdown}]
    trades_log = Column(JSON, nullable=False) # [{entry_time, exit_time, type, entry_price, exit_price, pnl, charges, net_pnl}]
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    strategy = relationship("Strategy", back_populates="backtests")

class PaperAccount(Base):
    __tablename__ = "paper_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_name = Column(String(50), default="Default Paper Account")
    initial_capital = Column(Float, default=1_000_000.0)
    current_balance = Column(Float, default=1_000_000.0)
    realized_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    losing_trades = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class PaperOrder(Base):
    __tablename__ = "paper_orders"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False)
    transaction_type = Column(String(10), nullable=False) # BUY, SELL
    order_type = Column(String(20), default="MARKET") # MARKET, LIMIT, SL_M
    product_type = Column(String(20), default="INTRADAY") # INTRADAY, CARRYFORWARD
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=True)
    trigger_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    target = Column(Float, nullable=True)
    status = Column(String(20), default="PENDING") # PENDING, FILLED, CANCELLED, REJECTED
    filled_price = Column(Float, nullable=True)
    brokerage = Column(Float, default=20.0)
    taxes = Column(Float, default=0.0)
    slippage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    filled_at = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

class PaperPosition(Base):
    __tablename__ = "paper_positions"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(50), nullable=False)
    product_type = Column(String(20), default="INTRADAY")
    quantity = Column(Integer, nullable=False)
    average_price = Column(Float, nullable=False)
    ltp = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=True)
    target = Column(Float, nullable=True)
    realized_pnl = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    is_open = Column(Boolean, default=True)
    opened_at = Column(DateTime, default=datetime.datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)

class LiveOrder(Base):
    __tablename__ = "live_orders"

    id = Column(Integer, primary_key=True, index=True)
    broker_order_id = Column(String(100), nullable=True)
    symbol = Column(String(50), nullable=False)
    token = Column(String(50), nullable=True)
    exchange = Column(String(20), default="NSE") # NSE, NFO, BSE, BFO
    transaction_type = Column(String(10), nullable=False) # BUY, SELL
    order_type = Column(String(20), default="MARKET")
    product_type = Column(String(20), default="INTRADAY")
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=True)
    trigger_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    target = Column(Float, nullable=True)
    status = Column(String(30), default="SUBMITTED") # SUBMITTED, REJECTED, COMPLETE, CANCELLED
    filled_price = Column(Float, nullable=True)
    pre_trade_risk_check_pass = Column(Boolean, default=False)
    broker_response = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    placed_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class RiskSettingsModel(Base):
    __tablename__ = "risk_settings"

    id = Column(Integer, primary_key=True, index=True)
    max_capital = Column(Float, default=1_000_000.0)
    max_risk_per_trade_percent = Column(Float, default=2.0)
    daily_loss_limit = Column(Float, default=25_000.0)
    max_open_positions = Column(Integer, default=5)
    min_reward_to_risk_ratio = Column(Float, default=1.5)
    kill_switch_active = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String(50), nullable=False) # LIVE_ORDER, RISK_LIMIT_BREACH, KILL_SWITCH, BROKER_LOGIN
    actor = Column(String(50), default="USER")
    details = Column(JSON, nullable=True)
    severity = Column(String(20), default="INFO") # INFO, WARNING, CRITICAL

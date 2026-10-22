import time
import math
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.services.market_data import get_live_quote
from app.services.trade_planner import calculate_indian_statutory_charges

class PaperTradingEngine:
    def __init__(self, initial_capital: float = 1_000_000.0):
        self.initial_capital = initial_capital
        self.balance = initial_capital
        self.realized_pnl = 0.0
        self.orders: List[Dict[str, Any]] = []
        self.positions: Dict[str, Dict[str, Any]] = {} # symbol -> position
        self.order_counter = 1

    def reset(self, initial_capital: float = 1_000_000.0):
        self.initial_capital = initial_capital
        self.balance = initial_capital
        self.realized_pnl = 0.0
        self.orders = []
        self.positions = {}
        self.order_counter = 1

    def get_summary(self) -> Dict[str, Any]:
        unrealized_pnl = 0.0
        active_positions_list = []
        
        for sym, pos in self.positions.items():
            if pos["quantity"] != 0:
                quote = get_live_quote(sym)
                ltp = quote["last_price"]
                qty = pos["quantity"]
                avg = pos["average_price"]
                
                # MTM PnL
                if qty > 0: # Long
                    mtm = (ltp - avg) * qty
                else: # Short
                    mtm = (avg - ltp) * abs(qty)
                    
                pos["ltp"] = ltp
                pos["mtm_pnl"] = round(mtm, 2)
                unrealized_pnl += mtm
                active_positions_list.append(pos)

        total_portfolio_value = self.balance + unrealized_pnl
        winning = len([o for o in self.orders if o.get("pnl", 0) > 0])
        losing = len([o for o in self.orders if o.get("pnl", 0) < 0])

        return {
            "initial_capital": self.initial_capital,
            "cash_balance": round(self.balance, 2),
            "unrealized_pnl": round(unrealized_pnl, 2),
            "realized_pnl": round(self.realized_pnl, 2),
            "total_portfolio_value": round(total_portfolio_value, 2),
            "net_roi_percent": round(((total_portfolio_value - self.initial_capital) / self.initial_capital) * 100, 2),
            "active_positions_count": len(active_positions_list),
            "active_positions": active_positions_list,
            "total_orders_count": len(self.orders),
            "winning_trades": winning,
            "losing_trades": losing,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        }

    def place_paper_order(
        self,
        symbol: str,
        transaction_type: str, # BUY, SELL
        quantity: int,
        order_type: str = "MARKET",
        product_type: str = "INTRADAY",
        price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        target: Optional[float] = None,
    ) -> Dict[str, Any]:
        quote = get_live_quote(symbol)
        ltp = quote["last_price"]
        
        # Simulate fill price with 0.05% slippage
        slippage_pts = 0.5 if "NIFTY" in symbol else 0.1
        fill_price = ltp + (slippage_pts if transaction_type == "BUY" else -slippage_pts)
        if order_type == "LIMIT" and price:
            fill_price = price

        turnover = fill_price * quantity
        charges = calculate_indian_statutory_charges(turnover, 0.0, "OPTION" if "CE" in symbol or "PE" in symbol else "EQUITY")
        fee = charges["total_charges"]
        
        # Margin check
        if transaction_type == "BUY" and (turnover + fee) > self.balance:
            return {
                "status": "REJECTED",
                "message": f"Insufficient paper trading funds. Required ₹{turnover + fee:,.2f}, Available ₹{self.balance:,.2f}"
            }

        order_id = f"PAP-{self.order_counter:05d}"
        self.order_counter += 1
        
        # Deduct charges
        self.balance -= fee
        
        # Update or create position
        sym = symbol.upper()
        if sym not in self.positions or self.positions[sym]["quantity"] == 0:
            signed_qty = quantity if transaction_type == "BUY" else -quantity
            self.positions[sym] = {
                "symbol": sym,
                "product_type": product_type,
                "quantity": signed_qty,
                "average_price": round(fill_price, 2),
                "ltp": round(ltp, 2),
                "stop_loss": stop_loss,
                "target": target,
                "mtm_pnl": 0.0,
                "opened_at": datetime.now().strftime("%H:%M:%S")
            }
            if transaction_type == "BUY":
                self.balance -= turnover
        else:
            # Exiting / partial squaring off existing position
            pos = self.positions[sym]
            curr_qty = pos["quantity"]
            if (curr_qty > 0 and transaction_type == "SELL") or (curr_qty < 0 and transaction_type == "BUY"):
                # Realizing PnL
                closed_qty = min(abs(curr_qty), quantity)
                if curr_qty > 0:
                    realized = (fill_price - pos["average_price"]) * closed_qty
                    self.balance += (fill_price * closed_qty)
                else:
                    realized = (pos["average_price"] - fill_price) * closed_qty
                    
                self.realized_pnl += realized
                new_qty = curr_qty - closed_qty if curr_qty > 0 else curr_qty + closed_qty
                pos["quantity"] = new_qty
                if new_qty == 0:
                    del self.positions[sym]
            else:
                # Adding to position
                tot_qty = abs(curr_qty) + quantity
                new_avg = ((pos["average_price"] * abs(curr_qty)) + (fill_price * quantity)) / tot_qty
                pos["quantity"] = curr_qty + (quantity if transaction_type == "BUY" else -quantity)
                pos["average_price"] = round(new_avg, 2)
                if transaction_type == "BUY":
                    self.balance -= turnover

        order_record = {
            "order_id": order_id,
            "symbol": sym,
            "transaction_type": transaction_type,
            "order_type": order_type,
            "product_type": product_type,
            "quantity": quantity,
            "price": fill_price,
            "filled_price": fill_price,
            "charges": fee,
            "status": "FILLED",
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "stop_loss": stop_loss,
            "target": target
        }
        self.orders.insert(0, order_record)

        return {
            "status": "FILLED",
            "order": order_record,
            "message": f"Simulated {transaction_type} {quantity} {sym} @ ₹{fill_price:,.2f} executed."
        }

paper_trading_engine = PaperTradingEngine()

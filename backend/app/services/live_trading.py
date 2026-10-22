import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.services.angel_one import angel_one_client
from app.services.risk_manager import risk_manager
from app.services.market_data import get_live_quote
from app.services.trade_planner import calculate_trade_plan

logger = logging.getLogger("live_trading")

class LiveTradingService:
    def __init__(self):
        self.live_orders_history: List[Dict[str, Any]] = []

    def verify_pre_trade(
        self,
        symbol: str,
        transaction_type: str,
        quantity: int,
        price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        target: Optional[float] = None,
        instrument_type: str = "EQUITY"
    ) -> Dict[str, Any]:
        """
        Calculates all risk parameters and pre-conditions before presenting
        to the user for EXPLICIT confirmation.
        """
        quote = get_live_quote(symbol)
        ltp = quote["last_price"]
        entry_price = price if price else ltp
        
        sl = stop_loss if stop_loss else (entry_price * 0.98 if transaction_type == "BUY" else entry_price * 1.02)
        tg = target if target else (entry_price * 1.04 if transaction_type == "BUY" else entry_price * 0.96)
        
        plan = calculate_trade_plan(
            symbol=symbol,
            instrument_type=instrument_type,
            direction=transaction_type,
            entry_price=entry_price,
            stop_loss=sl,
            target1=tg,
            capital=risk_manager.max_capital,
            risk_percent=risk_manager.max_risk_per_trade_percent,
            custom_qty=quantity,
            lot_size=quote["lot_size"]
        )

        # Risk manager checks
        risk_ok, risk_msg = risk_manager.validate_pre_trade(
            symbol=symbol,
            planned_loss=plan["planned_max_loss_net"],
            reward_to_risk=plan["reward_to_risk_ratio"],
            current_open_positions=len(angel_one_client.get_positions()),
            is_averaging_down=False
        )

        broker_status = angel_one_client.get_connection_status()

        return {
            "symbol": symbol.upper(),
            "transaction_type": transaction_type.upper(),
            "quantity": quantity,
            "ltp": ltp,
            "entry_price": entry_price,
            "stop_loss": sl,
            "target": tg,
            "planned_max_loss": plan["planned_max_loss_net"],
            "potential_profit": plan["potential_profit_t1_net"],
            "reward_to_risk_ratio": plan["reward_to_risk_ratio"],
            "estimated_charges": plan["charges_breakdown"]["total_charges"],
            "risk_validation_passed": risk_ok,
            "risk_validation_message": risk_msg,
            "broker_connected": broker_status["is_connected"],
            "ready_for_user_confirmation": (risk_ok and broker_status["is_connected"]),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        }

    def execute_live_order(
        self,
        symbol: str,
        transaction_type: str,
        quantity: int,
        price: Optional[float] = None,
        order_type: str = "MARKET",
        product_type: str = "INTRADAY",
        stop_loss: Optional[float] = None,
        target: Optional[float] = None,
        explicit_confirmation: bool = False
    ) -> Dict[str, Any]:
        """
        Dispatches real broker order ONLY when explicit user confirmation is true
        and all risk guardrails pass.
        """
        # Safety gate 1: Explicit Confirmation
        if not explicit_confirmation:
            return {
                "status": "REJECTED",
                "message": "Security Error: Order rejected. Explicit user confirmation flag missing.",
                "errorcode": "EXPLICIT_CONFIRMATION_REQUIRED"
            }

        # Safety gate 2: Pre-trade risk check
        pre_check = self.verify_pre_trade(
            symbol=symbol,
            transaction_type=transaction_type,
            quantity=quantity,
            price=price,
            stop_loss=stop_loss,
            target=target
        )

        if not pre_check["risk_validation_passed"]:
            return {
                "status": "REJECTED",
                "message": f"Risk Check Failed: {pre_check['risk_validation_message']}",
                "errorcode": "RISK_LIMIT_BREACH"
            }

        if not angel_one_client.is_connected:
            return {
                "status": "REJECTED",
                "message": "Broker Error: Angel One SmartAPI is not connected or session expired. Live orders cannot be placed.",
                "errorcode": "BROKER_NOT_CONNECTED"
            }

        # Dispatch order to SmartAPI
        broker_resp = angel_one_client.place_order(
            symbol=symbol,
            transaction_type=transaction_type,
            quantity=quantity,
            price=price,
            order_type=order_type,
            product_type=product_type
        )

        order_record = {
            "symbol": symbol.upper(),
            "transaction_type": transaction_type.upper(),
            "quantity": quantity,
            "price": price or pre_check["ltp"],
            "stop_loss": stop_loss,
            "target": target,
            "order_type": order_type,
            "product_type": product_type,
            "broker_response": broker_resp,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
            "status": "SUBMITTED" if broker_resp.get("status") else "FAILED"
        }
        self.live_orders_history.insert(0, order_record)

        return {
            "status": "SUCCESS" if broker_resp.get("status") else "FAILED",
            "message": broker_resp.get("message", "Order processed by broker"),
            "data": broker_resp.get("data"),
            "order_record": order_record
        }

    def emergency_kill_switch_square_off(self) -> Dict[str, Any]:
        """
        Emergency kill switch:
        1. Activates risk manager kill switch
        2. Halts all further order submissions
        3. Attempts to square off all open positions
        """
        risk_manager.set_kill_switch(True)
        positions = angel_one_client.get_positions()
        
        squared_off_count = 0
        for pos in positions:
            net_qty = int(pos.get("netqty", 0))
            if net_qty != 0:
                action = "SELL" if net_qty > 0 else "BUY"
                sym = pos.get("tradingsymbol", "")
                angel_one_client.place_order(sym, action, abs(net_qty), order_type="MARKET")
                squared_off_count += 1

        return {
            "kill_switch_active": True,
            "message": f"EMERGENCY KILL SWITCH ACTIVATED. Trading halted. Dispatched square-off for {squared_off_count} open broker positions.",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        }

live_trading_service = LiveTradingService()

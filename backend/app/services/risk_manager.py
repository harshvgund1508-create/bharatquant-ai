from typing import Dict, Any, Tuple
from app.core.config import settings

class RiskManager:
    def __init__(self):
        self.max_capital = settings.MAX_CAPITAL
        self.max_risk_per_trade_percent = settings.MAX_RISK_PER_TRADE_PERCENT
        self.daily_loss_limit = settings.DAILY_LOSS_LIMIT
        self.max_open_positions = settings.MAX_OPEN_POSITIONS
        self.min_reward_to_risk_ratio = settings.MIN_REWARD_TO_RISK_RATIO
        self.kill_switch_active = settings.KILL_SWITCH_ACTIVE
        self.daily_realized_loss = 0.0
        self.consecutive_losses = 0

    def get_status(self) -> Dict[str, Any]:
        return {
            "max_capital": self.max_capital,
            "max_risk_per_trade_percent": self.max_risk_per_trade_percent,
            "max_risk_per_trade_amount": round(self.max_capital * (self.max_risk_per_trade_percent / 100.0), 2),
            "daily_loss_limit": self.daily_loss_limit,
            "daily_realized_loss": round(self.daily_realized_loss, 2),
            "daily_loss_remaining": round(max(0.0, self.daily_loss_limit - abs(self.daily_realized_loss)), 2),
            "max_open_positions": self.max_open_positions,
            "min_reward_to_risk_ratio": self.min_reward_to_risk_ratio,
            "kill_switch_active": self.kill_switch_active,
            "consecutive_losses": self.consecutive_losses,
        }

    def update_settings(self, new_settings: Dict[str, Any]) -> Dict[str, Any]:
        if "max_capital" in new_settings and new_settings["max_capital"] is not None:
            self.max_capital = float(new_settings["max_capital"])
        if "max_risk_per_trade_percent" in new_settings and new_settings["max_risk_per_trade_percent"] is not None:
            self.max_risk_per_trade_percent = float(new_settings["max_risk_per_trade_percent"])
        if "daily_loss_limit" in new_settings and new_settings["daily_loss_limit"] is not None:
            self.daily_loss_limit = float(new_settings["daily_loss_limit"])
        if "max_open_positions" in new_settings and new_settings["max_open_positions"] is not None:
            self.max_open_positions = int(new_settings["max_open_positions"])
        if "min_reward_to_risk_ratio" in new_settings and new_settings["min_reward_to_risk_ratio"] is not None:
            self.min_reward_to_risk_ratio = float(new_settings["min_reward_to_risk_ratio"])
        if "kill_switch_active" in new_settings and new_settings["kill_switch_active"] is not None:
            self.kill_switch_active = bool(new_settings["kill_switch_active"])
        return self.get_status()

    def set_kill_switch(self, active: bool) -> bool:
        self.kill_switch_active = active
        return self.kill_switch_active

    def validate_pre_trade(
        self,
        symbol: str,
        planned_loss: float,
        reward_to_risk: float,
        current_open_positions: int,
        is_averaging_down: bool = False
    ) -> Tuple[bool, str]:
        """
        Enforces strict backend risk controls:
        1. Emergency Kill Switch check
        2. Daily loss limit check
        3. Max risk per trade check
        4. Max open positions check
        5. Minimum Reward-to-Risk ratio check
        6. Anti-martingale / averaging down prohibition
        """
        # 1. Kill switch
        if self.kill_switch_active:
            return False, "Order rejected: Emergency Kill Switch is currently ACTIVE. Live orders disabled."

        # 2. Daily Loss Limit
        if abs(self.daily_realized_loss) >= self.daily_loss_limit:
            return False, f"Order rejected: Daily loss limit (₹{self.daily_loss_limit:,.2f}) has been breached. Trading halted for the session."

        # 3. Max Risk per Trade
        max_allowed_risk = self.max_capital * (self.max_risk_per_trade_percent / 100.0)
        if planned_loss > (max_allowed_risk * 1.05): # allow tiny 5% rounding leeway for strict lot sizes
            return False, f"Order rejected: Planned risk ₹{planned_loss:,.2f} exceeds max allowed per trade (₹{max_allowed_risk:,.2f} - {self.max_risk_per_trade_percent}%)."

        # 4. Max Open Positions
        if current_open_positions >= self.max_open_positions:
            return False, f"Order rejected: Maximum concurrent open positions limit ({self.max_open_positions}) reached."

        # 5. Reward-to-Risk Ratio
        if reward_to_risk > 0 and reward_to_risk < self.min_reward_to_risk_ratio:
            return False, f"Order rejected: Reward-to-Risk ratio ({reward_to_risk:.2f}) is below mandatory threshold ({self.min_reward_to_risk_ratio:.2f})."

        # 6. Anti-Martingale / Averaging Down
        if is_averaging_down:
            return False, "Order rejected: Rule violation - Uncontrolled averaging down or Martingale position sizing is strictly prohibited."

        return True, "Pre-trade risk verification passed."

risk_manager = RiskManager()

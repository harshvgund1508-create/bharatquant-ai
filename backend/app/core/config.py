import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "BharatQuant AI"
    APP_ENV: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001"
    
    # Database
    DATABASE_URL: str = "sqlite:///./bharatquant.db"
    
    # Angel One SmartAPI
    ANGEL_ONE_API_KEY: str = ""
    ANGEL_ONE_CLIENT_CODE: str = ""
    ANGEL_ONE_PIN: str = ""
    ANGEL_ONE_TOTP_SECRET: str = ""
    
    # Pre-trade Risk Controls
    MAX_CAPITAL: float = 1_000_000.0
    MAX_RISK_PER_TRADE_PERCENT: float = 2.0
    DAILY_LOSS_LIMIT: float = 25_000.0
    MAX_OPEN_POSITIONS: int = 5
    MIN_REWARD_TO_RISK_RATIO: float = 1.5
    KILL_SWITCH_ACTIVE: bool = False
    
    # Paper Trading Defaults
    PAPER_INITIAL_CAPITAL: float = 1_000_000.0

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

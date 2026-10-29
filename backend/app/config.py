from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Windora — UK Wind Forecast & Accuracy Intelligence"
    API_V1_STR: str = "/api"
    
    # Elexon API Base URL
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    
    # Data directory & cache
    DATA_DIR: Path = BASE_DIR / "data" / "cache"
    
    # Default Day-Ahead Cutoff Time (GB Day-Ahead Market / EPEX SPOT Gate Closure assumption)
    # Market standard is 11:00 GMT on D-1. Clearly labeled as an explicit configurable modelling assumption.
    DEFAULT_CUTOFF_TIME: str = "11:00"
    
    # Matching Mode: 'hour_block' (distributes hourly WINDFOR to 30-min settlement periods) or 'exact'
    DEFAULT_MATCHING_MODE: str = "hour_block"
    
    # Default Analysis Period
    DEFAULT_START_DATE: str = "2026-01-01"
    DEFAULT_END_DATE: str = "2026-01-31"
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "*"
    ]

settings = Settings()

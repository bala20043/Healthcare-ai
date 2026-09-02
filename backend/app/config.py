import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "MediVerify AI Backend"
    API_V1_STR: str = "/api/v1"
    
    # Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://dvvzzgbojrqtzrgcisvq.supabase.co")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    @property
    def cors_origins(self) -> List[str]:
        origins = [origin.strip() for origin in self.FRONTEND_URL.split(",") if origin.strip()]
        defaults = [
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
        ]
        for item in defaults:
            if item not in origins:
                origins.append(item)
        return origins

    # Limits
    MAX_MESSAGE_LENGTH: int = int(os.getenv("MAX_MESSAGE_LENGTH", "2000"))
    CHAT_HISTORY_CONTEXT_WINDOW: int = int(os.getenv("CHAT_HISTORY_CONTEXT_WINDOW", "6"))

    class Config:
        case_sensitive = True

settings = Settings()

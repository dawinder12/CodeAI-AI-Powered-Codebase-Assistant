import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
# Load .env explicitly
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeAI"
    API_V1_STR: str = "/api/v1"
    
    # API Keys
    LLM_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    
    # Vector DB
    VECTOR_DB_PATH: str = str(BASE_DIR / "data" / "vector_store")
    
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

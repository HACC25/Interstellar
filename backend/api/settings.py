from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path

parent_folder = Path(__file__).parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=parent_folder / ".env")
    openai_api_key: str
    openai_llm: str
    lancedb_storage_path: str

settings = Settings()
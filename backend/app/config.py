from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SmartTax Germany"
    debug: bool = False
    database_url: str = "sqlite:///./smarttax.db"

    # Admin auth
    admin_password: str = "changeme_admin_password_here"
    admin_secret_key: str = "change_this_to_a_long_random_string_at_least_32_chars"
    admin_token_expire_minutes: int = 60

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:4173"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "phi3:mini"
    ollama_enabled: bool = True
    ollama_timeout: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]


settings = Settings()
settings = Settings()

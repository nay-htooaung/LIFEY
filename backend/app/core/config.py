from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "LIFEY"
    debug: bool = False

    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 30
    refresh_token_expire_days: int = 30
    frontend_url: str = "http://localhost:5173"
    opencode_api_key: str | None = None

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

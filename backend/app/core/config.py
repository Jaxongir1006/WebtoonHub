from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator, Field
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "WebtoonHub"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "super-secret-development-key-change-this-in-production-min32chars"
    SEED_ADMIN_EMAIL: str = ""
    SEED_ADMIN_PASSWORD: str = ""
    SEED_DEMO_ACCOUNTS: bool = False
    SEED_DEMO_PASSWORD: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:4173",
        "http://localhost:8080",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8000"
    ]

    FRONTEND_URL: str = "http://localhost:5173"
    DAILY_MAX_COINS: int = Field(100, ge=0)
    CHAPTER_COOLDOWN_MINUTES: int = Field(0, ge=0, le=1440)
    AUTH_RATE_LIMIT: int = Field(20, ge=1, le=1000)

    # Database (PostgreSQL)
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "webtoonhub"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/webtoonhub"

    # Cache (Redis)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage (MinIO / S3)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"
    MINIO_BUCKET_COVERS: str = "webtoon-covers"
    MINIO_BUCKET_CHAPTERS: str = "chapter-images"
    MINIO_BUCKET_SHOP: str = "shop-assets"
    MINIO_SECURE: bool = False

    # Email & SMTP (Mailpit / Production SMTP)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@webtoonhub.uz"
    SMTP_FROM_NAME: str = "WebtoonHub"
    SMTP_TLS: bool = False

    # Timezone & Economy Constants
    TIMEZONE: str = "Asia/Tashkent"
    INITIAL_COINS: int = 50
    DAILY_LOGIN_COINS: int = 15
    CHAPTER_READ_COINS: int = 5

    @model_validator(mode="after")
    def validate_deployment(self):
        if self.APP_ENV.lower() not in {"development", "test"}:
            if self.DEBUG:
                raise ValueError("DEBUG must be disabled outside development and test")
            if self.SECRET_KEY in {"super-secret-development-key-change-this-in-production-min32chars", "replace-with-a-unique-random-secret-of-at-least-32-characters"} or len(self.SECRET_KEY) < 32:
                raise ValueError("Set a unique SECRET_KEY of at least 32 characters")
            if self.SEED_DEMO_ACCOUNTS:
                raise ValueError("SEED_DEMO_ACCOUNTS is allowed only in development")
            if not self.ALLOWED_ORIGINS or (
                self.APP_ENV.lower() != "staging"
                and all("localhost" in origin or "127.0.0.1" in origin for origin in self.ALLOWED_ORIGINS)
            ):
                raise ValueError("Set ALLOWED_ORIGINS for the deployed frontend and admin origins")
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

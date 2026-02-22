from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://susupay:susupay_secret@db:5432/susupay"
    DATABASE_URL_SYNC: str = "postgresql://susupay:susupay_secret@db:5432/susupay"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "eu-west-1"
    S3_BUCKET_NAME: str = "susupay-screenshots"

    # Hubtel SMS API
    HUBTEL_CLIENT_ID: str = ""
    HUBTEL_CLIENT_SECRET: str = ""
    HUBTEL_SMS_SENDER: str = "SusuPay"

    # Web Push VAPID
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_CLAIMS_EMAIL: str = "admin@susupay.com"

    # App
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

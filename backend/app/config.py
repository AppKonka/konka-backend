# backend/app/config.py
from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://konka.app",
        "https://*.konka.app",
    ]
    
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Redis (pour cache et WebSocket)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_PASSWORD: Optional[str] = os.getenv("REDIS_PASSWORD", None)
    
    # AI Services
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    
    # AWS S3 (pour stockage médias)
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "konka-media")
    AWS_S3_REGION: str = os.getenv("AWS_S3_REGION", "eu-west-3")
    AWS_CLOUDFRONT_URL: str = os.getenv("AWS_CLOUDFRONT_URL", "")
    
    # Google Maps
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")
    
    # Email (SendGrid)
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "noreply@konka.app")
    
    # SMS (Twilio)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # Payments (Stripe)
    STRIPE_SECRET_KEY: str = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_WEBHOOK_SECRET: str = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    
    # Mobile Money (Orange Money, MTN Money)
    ORANGE_MONEY_CLIENT_ID: str = os.getenv("ORANGE_MONEY_CLIENT_ID", "")
    ORANGE_MONEY_CLIENT_SECRET: str = os.getenv("ORANGE_MONEY_CLIENT_SECRET", "")
    MTN_MONEY_API_KEY: str = os.getenv("MTN_MONEY_API_KEY", "")
    
    # Video/Audio processing
    FFMPEG_PATH: str = os.getenv("FFMPEG_PATH", "ffmpeg")
    MAX_VIDEO_SIZE: int = 100 * 1024 * 1024  # 100 MB
    MAX_AUDIO_SIZE: int = 50 * 1024 * 1024   # 50 MB
    MAX_IMAGE_SIZE: int = 10 * 1024 * 1024   # 10 MB
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds
    
    # WebRTC (pour appels)
    TURN_SERVER_URL: str = os.getenv("TURN_SERVER_URL", "turn:turn.konka.app")
    TURN_SERVER_USERNAME: str = os.getenv("TURN_SERVER_USERNAME", "")
    TURN_SERVER_CREDENTIAL: str = os.getenv("TURN_SERVER_CREDENTIAL", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

settings = Settings()
# backend/app/monitoring/sentry.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from app.config import settings

def init_sentry():
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[
                StarletteIntegration(),
                FastApiIntegration(),
                SqlalchemyIntegration(),
            ],
            environment=settings.ENVIRONMENT,
            traces_sample_rate=1.0,
            profiles_sample_rate=1.0,
        )
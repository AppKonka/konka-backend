# backend/app/main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv
import os
from datetime import datetime
import logging

# Charger les variables d'environnement
load_dotenv()

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from app.config import settings
from app.database import supabase, check_db_connection
from app.routers import (
    auth, users, content, music, shop, chat, match, chill, 
    artist, seller, notifications, analytics, payments
)
from app.core.security import verify_token

# Créer l'application FastAPI
app = FastAPI(
    title="KONKA API",
    description="""
    API pour l'application KONKA - Plateforme de musique, rencontres et shopping
    
    ## Fonctionnalités principales:
    - 🎵 Streaming musical et gestion de morceaux
    - 👥 Réseau social avec feed vidéo et stories (Sparks)
    - 💌 Système de matchs basé sur les goûts musicaux
    - 🛍️ Marketplace avec gestion de produits et commandes
    - 🎬 Lives et dédicaces d'artistes
    - 🌍 Sorties réelles (Chill) avec GPS
    - 🤖 IA pour recommandations personnalisées
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Trusted Host
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS,
)

# Security
security = HTTPBearer()

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Vérifie l'état de santé de l'API et de la base de données"""
    db_status = await check_db_connection()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "database": "connected" if db_status else "disconnected",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "KONKA API",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/api/docs",
        "health": "/health"
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(music.router, prefix="/api/music", tags=["Music"])
app.include_router(shop.router, prefix="/api/shop", tags=["Shop"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(match.router, prefix="/api/match", tags=["Match"])
app.include_router(chill.router, prefix="/api/chill", tags=["Chill"])
app.include_router(artist.router, prefix="/api/artist", tags=["Artist"])
app.include_router(seller.router, prefix="/api/seller", tags=["Seller"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=["app"]
    )
# backend/app/routers/twilio.py
from fastapi import APIRouter
from twilio.rest import Client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/twilio", tags=["Twilio"])

@router.get("/turn-token")
async def get_turn_token():
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        token = client.tokens.create()
        logger.info("✅ Token TURN Twilio généré")
        return {"ice_servers": token.ice_servers}
    except Exception as e:
        logger.error(f"❌ Erreur Twilio: {e}")
        return {
            "ice_servers": [
                {"urls": "stun:stun.l.google.com:19302"},
                {"urls": "stun:stun1.l.google.com:19302"}
            ]
        }
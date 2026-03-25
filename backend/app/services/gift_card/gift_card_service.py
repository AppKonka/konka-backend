# backend/app/services/gift_card/gift_card_service.py
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.database import db

logger = logging.getLogger(__name__)

class GiftCardService:
    """Service de gestion des cartes cadeaux"""
    
    def __init__(self):
        self.denominations = [10, 25, 50, 100, 250]
    
    async def create_gift_card(
        self,
        purchaser_id: str,
        recipient_email: str,
        amount: float,
        message: Optional[str] = None,
        delivery_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Crée une carte cadeau"""
        try:
            if amount not in self.denominations:
                raise Exception(f"Invalid amount. Must be one of {self.denominations}")
            
            code = f"GIFT-{uuid.uuid4().hex[:8].upper()}"
            
            card_data = {
                "code": code,
                "purchaser_id": purchaser_id,
                "recipient_email": recipient_email,
                "amount": amount,
                "message": message,
                "status": "pending",
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(days=365)).isoformat()
            }
            
            if delivery_date:
                card_data["delivery_date"] = delivery_date.isoformat()
            
            await db.table('gift_cards').insert(card_data).execute()
            
            return {
                "code": code,
                "amount": amount,
                "expires_at": card_data["expires_at"]
            }
            
        except Exception as e:
            logger.error(f"Error creating gift card: {e}")
            raise
    
    async def redeem_gift_card(self, code: str, user_id: str) -> Dict[str, Any]:
        """Utilise une carte cadeau"""
        try:
            # Récupérer la carte
            card = await db.table('gift_cards').select('*')\
                .eq('code', code)\
                .eq('status', 'pending')\
                .execute()
            
            if not card.data:
                return {"success": False, "message": "Code invalide ou déjà utilisé"}
            
            card_data = card.data[0]
            
            # Vérifier l'expiration
            if datetime.fromisoformat(card_data['expires_at']) < datetime.now():
                return {"success": False, "message": "Carte cadeau expirée"}
            
            # Vérifier si c'est le destinataire
            user = await db.table('users').select('email').eq('id', user_id).execute()
            if user.data[0]['email'] != card_data['recipient_email']:
                return {"success": False, "message": "Cette carte n'est pas destinée à cet utilisateur"}
            
            # Créditer le compte
            await db.table('user_wallet').insert({
                "user_id": user_id,
                "amount": card_data['amount'],
                "type": "gift_card",
                "description": f"Rechargement via carte cadeau {code}",
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Marquer comme utilisée
            await db.table('gift_cards').update({
                "status": "redeemed",
                "redeemed_at": datetime.now().isoformat(),
                "redeemed_by": user_id
            }).eq('code', code).execute()
            
            return {
                "success": True,
                "amount": card_data['amount'],
                "message": "Carte cadeau utilisée avec succès"
            }
            
        except Exception as e:
            logger.error(f"Error redeeming gift card: {e}")
            return {"success": False, "message": "Erreur lors de l'utilisation"}
    
    async def check_gift_card(self, code: str) -> Dict[str, Any]:
        """Vérifie le solde d'une carte cadeau"""
        try:
            card = await db.table('gift_cards').select('*')\
                .eq('code', code)\
                .execute()
            
            if not card.data:
                return {"valid": False, "message": "Code invalide"}
            
            card_data = card.data[0]
            
            if card_data['status'] != 'pending':
                return {"valid": False, "message": "Carte déjà utilisée"}
            
            if datetime.fromisoformat(card_data['expires_at']) < datetime.now():
                return {"valid": False, "message": "Carte expirée"}
            
            return {
                "valid": True,
                "amount": card_data['amount'],
                "expires_at": card_data['expires_at']
            }
            
        except Exception as e:
            logger.error(f"Error checking gift card: {e}")
            return {"valid": False, "message": "Erreur lors de la vérification"}

# Instance singleton
gift_card_service = GiftCardService()
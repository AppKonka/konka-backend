# backend/app/services/referral/referral_service.py
import uuid
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.database import db

logger = logging.getLogger(__name__)

class ReferralService:
    """Service de programme de parrainage"""
    
    def __init__(self):
        self.referral_bonus = {
            "referrer": 10.0,  # 10€ pour le parrain
            "referee": 5.0,    # 5€ pour le filleul
        }
        self.referral_limit = 10  # Maximum de parrainages par utilisateur
    
    async def generate_referral_code(self, user_id: str) -> str:
        """Génère un code de parrainage unique"""
        try:
            # Vérifier si l'utilisateur a déjà un code
            existing = await db.table('referral_codes').select('code')\
                .eq('user_id', user_id)\
                .execute()
            
            if existing.data:
                return existing.data[0]['code']
            
            # Générer un nouveau code
            code = f"KONKA-{user_id[:6].upper()}-{uuid.uuid4().hex[:6].upper()}"
            
            await db.table('referral_codes').insert({
                "user_id": user_id,
                "code": code,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return code
            
        except Exception as e:
            logger.error(f"Error generating referral code: {e}")
            return None
    
    async def apply_referral(self, new_user_id: str, referral_code: str) -> Dict[str, Any]:
        """Applique un code de parrainage lors de l'inscription"""
        try:
            # Vérifier le code
            referral = await db.table('referral_codes').select('*')\
                .eq('code', referral_code)\
                .execute()
            
            if not referral.data:
                return {"success": False, "message": "Code de parrainage invalide"}
            
            referrer_id = referral.data[0]['user_id']
            
            # Vérifier que le parrain n'est pas le filleul
            if referrer_id == new_user_id:
                return {"success": False, "message": "Vous ne pouvez pas vous parrainer vous-même"}
            
            # Vérifier la limite du parrain
            referrer_count = await db.table('referrals').select('id', count='exact')\
                .eq('referrer_id', referrer_id)\
                .execute()
            
            if referrer_count.count >= self.referral_limit:
                return {"success": False, "message": "Le parrain a atteint sa limite"}
            
            # Créer la relation de parrainage
            await db.table('referrals').insert({
                "referrer_id": referrer_id,
                "referee_id": new_user_id,
                "code_used": referral_code,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Créditer les bonus (sera fait après validation du compte)
            return {
                "success": True,
                "message": "Code de parrainage appliqué avec succès",
                "bonus": {
                    "referrer": self.referral_bonus["referrer"],
                    "referee": self.referral_bonus["referee"]
                }
            }
            
        except Exception as e:
            logger.error(f"Error applying referral: {e}")
            return {"success": False, "message": "Erreur lors de l'application du code"}
    
    async def validate_referral(self, user_id: str):
        """Valide un parrainage après activation du compte"""
        try:
            # Trouver le parrainage en attente
            referral = await db.table('referrals').select('*')\
                .eq('referee_id', user_id)\
                .eq('status', 'pending')\
                .execute()
            
            if not referral.data:
                return
            
            referral_id = referral.data[0]['id']
            referrer_id = referral.data[0]['referrer_id']
            
            # Créditer le parrain
            await db.table('user_wallet').insert({
                "user_id": referrer_id,
                "amount": self.referral_bonus["referrer"],
                "type": "referral_bonus",
                "description": "Bonus de parrainage",
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Créditer le filleul
            await db.table('user_wallet').insert({
                "user_id": user_id,
                "amount": self.referral_bonus["referee"],
                "type": "referral_bonus",
                "description": "Bonus de bienvenue",
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Marquer comme validé
            await db.table('referrals').update({
                "status": "completed",
                "validated_at": datetime.now().isoformat()
            }).eq('id', referral_id).execute()
            
            logger.info(f"Referral {referral_id} validated: {referrer_id} -> {user_id}")
            
        except Exception as e:
            logger.error(f"Error validating referral: {e}")
    
    async def get_referral_stats(self, user_id: str) -> Dict[str, Any]:
        """Récupère les statistiques de parrainage"""
        try:
            # Nombre de filleuls
            referrals = await db.table('referrals').select('id', count='exact')\
                .eq('referrer_id', user_id)\
                .execute()
            
            # Bonus gagnés
            bonuses = await db.table('user_wallet').select('amount')\
                .eq('user_id', user_id)\
                .eq('type', 'referral_bonus')\
                .execute()
            
            total_bonus = sum(b['amount'] for b in bonuses.data)
            
            # Code de parrainage
            code = await self.generate_referral_code(user_id)
            
            return {
                "referral_code": code,
                "referrals_count": referrals.count,
                "referral_limit": self.referral_limit,
                "remaining": self.referral_limit - referrals.count,
                "total_bonus": total_bonus,
                "bonus_per_referral": self.referral_bonus["referrer"]
            }
            
        except Exception as e:
            logger.error(f"Error getting referral stats: {e}")
            return {
                "referral_code": None,
                "referrals_count": 0,
                "referral_limit": self.referral_limit,
                "remaining": self.referral_limit,
                "total_bonus": 0,
                "bonus_per_referral": 0
            }

# Instance singleton
referral_service = ReferralService()
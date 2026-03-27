# backend/app/services/notifications/sms_service.py
import twilio
from twilio.rest import Client
from twilio.twiml.messaging_response import MessagingResponse
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import re
import random
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class SMSService:
    """Service complet d'envoi de SMS avec Twilio"""
    
    def __init__(self):
        self.client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        self.from_number = settings.TWILIO_PHONE_NUMBER
        
        # Templates SMS
        self.templates = {
            "verification": "Votre code de vérification KONKA est: {code}. Valable 10 minutes.",
            "welcome": "Bienvenue sur KONKA! {username}, votre compte a été créé avec succès.",
            "password_reset": "KONKA: Votre code de réinitialisation est: {code}. Valable 30 minutes.",
            "order_confirmation": "KONKA: Votre commande #{order_id} a été confirmée. Merci de votre confiance!",
            "order_shipped": "KONKA: Votre commande #{order_id} a été expédiée. Suivi: {tracking}",
            "order_delivered": "KONKA: Votre commande #{order_id} a été livrée. Merci!",
            "new_match": "KONKA: Nouveau match! {username} vous a liké. Ouvrez l'app pour voir.",
            "new_message": "KONKA: Nouveau message de {username}: {preview}",
            "dedication_ready": "KONKA: Votre dédicace de {artist} est prête! Ouvrez l'app pour la voir.",
            "live_reminder": "KONKA: {artist} commence son live dans 15 minutes! Ne manquez pas ça.",
            "payment_success": "KONKA: Paiement de {amount}€ confirmé. Merci!",
            "payment_failed": "KONKA: Paiement de {amount}€ échoué. Vérifiez vos informations."
        }
    
    # ==================== ENVOI DE SMS ====================
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
        template_name: Optional[str] = None,
        template_data: Optional[Dict] = None
    ) -> bool:
        """Envoie un SMS"""
        try:
            # Formater le numéro
            to_number = self._format_phone_number(to_number)
            
            # Utiliser un template si spécifié
            if template_name and template_name in self.templates:
                template = self.templates[template_name]
                message = template.format(**(template_data or {}))
            
            # Envoyer le SMS
            message_obj = self.client.messages.create(
                body=message,
                from_=self.from_number,
                to=to_number
            )
            
            if message_obj.sid:
                logger.info(f"SMS sent to {to_number}: {message_obj.sid}")
                await self._log_sms(to_number, message, "sent", message_obj.sid)
                return True
            else:
                logger.error(f"Failed to send SMS to {to_number}")
                await self._log_sms(to_number, message, "failed")
                return False
                
        except twilio.base.exceptions.TwilioRestException as e:
            logger.error(f"Twilio error: {e}")
            await self._log_sms(to_number, message, "error", str(e))
            return False
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            await self._log_sms(to_number, message, "error", str(e))
            return False
    
    async def send_bulk_sms(
        self,
        numbers: List[str],
        message: str,
        template_name: Optional[str] = None,
        template_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Envoie des SMS en masse"""
        results = {"success": [], "failed": [], "total": len(numbers)}
        
        # Utiliser un template si spécifié
        if template_name and template_name in self.templates:
            template = self.templates[template_name]
            message = template.format(**(template_data or {}))
        
        for number in numbers:
            success = await self.send_sms(number, message)
            if success:
                results["success"].append(number)
            else:
                results["failed"].append(number)
        
        return results
    
    # ==================== CODES DE VÉRIFICATION ====================
    
    async def send_verification_code(self, phone_number: str) -> Dict[str, Any]:
        """Envoie un code de vérification par SMS"""
        try:
            code = f"{random.randint(100000, 999999)}"
            
            # Sauvegarder le code
            result = await db.table('verification_codes').insert({
                "phone_number": phone_number,
                "code": code,
                "type": "sms_verification",
                "expires_at": (datetime.now() + timedelta(minutes=10)).isoformat(),
                "created_at": datetime.now().isoformat()
            }).execute()
            
            # Envoyer le SMS
            success = await self.send_sms(
                to_number=phone_number,
                message=self.templates["verification"].format(code=code)
            )
            
            # Utiliser les données de résultat pour le log
            if result.data:
                logger.info(f"Verification code saved for {phone_number}: {result.data[0]['id']}")
            
            return {
                "success": success,
                "code": code if success else None,
                "message": "Code envoyé" if success else "Erreur d'envoi"
            }
            
        except Exception as e:
            logger.error(f"Error sending verification code: {e}")
            return {"success": False, "message": str(e)}
    
    async def verify_code(self, phone_number: str, code: str) -> bool:
        """Vérifie un code de vérification"""
        try:
            # Récupérer le code
            result = await db.table('verification_codes').select('*')\
                .eq('phone_number', phone_number)\
                .eq('code', code)\
                .eq('type', 'sms_verification')\
                .gt('expires_at', datetime.now().isoformat())\
                .execute()
            
            if result.data:
                # Marquer comme utilisé
                verification_id = result.data[0]['id']
                await db.table('verification_codes').update({
                    "verified_at": datetime.now().isoformat(),
                    "is_used": True
                }).eq('id', verification_id).execute()
                
                logger.info(f"Verification code {code} verified for {phone_number}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verifying code: {e}")
            return False
    
    # ==================== SMS SPÉCIFIQUES ====================
    
    async def send_welcome_sms(self, phone_number: str, username: str):
        """Envoie un SMS de bienvenue"""
        await self.send_sms(
            to_number=phone_number,
            template_name="welcome",
            template_data={"username": username}
        )
        logger.info(f"Welcome SMS sent to {phone_number} for user {username}")
    
    async def send_password_reset_sms(self, phone_number: str, code: str):
        """Envoie un SMS de réinitialisation de mot de passe"""
        await self.send_sms(
            to_number=phone_number,
            template_name="password_reset",
            template_data={"code": code}
        )
        logger.info(f"Password reset SMS sent to {phone_number}")
    
    async def send_order_confirmation_sms(self, phone_number: str, order_id: str):
        """Envoie un SMS de confirmation de commande"""
        await self.send_sms(
            to_number=phone_number,
            template_name="order_confirmation",
            template_data={"order_id": order_id}
        )
        logger.info(f"Order confirmation SMS sent for order {order_id}")
    
    async def send_order_shipped_sms(self, phone_number: str, order_id: str, tracking: str):
        """Envoie un SMS de commande expédiée"""
        await self.send_sms(
            to_number=phone_number,
            template_name="order_shipped",
            template_data={"order_id": order_id, "tracking": tracking}
        )
        logger.info(f"Order shipped SMS sent for order {order_id}")
    
    async def send_new_match_sms(self, phone_number: str, username: str):
        """Envoie un SMS de nouveau match"""
        await self.send_sms(
            to_number=phone_number,
            template_name="new_match",
            template_data={"username": username}
        )
        logger.info(f"New match SMS sent to {phone_number}")
    
    async def send_new_message_sms(self, phone_number: str, username: str, preview: str):
        """Envoie un SMS de nouveau message"""
        await self.send_sms(
            to_number=phone_number,
            template_name="new_message",
            template_data={"username": username, "preview": preview[:50]}
        )
        logger.info(f"New message SMS sent to {phone_number} from {username}")
    
    async def send_dedication_ready_sms(self, phone_number: str, artist: str):
        """Envoie un SMS de dédicace prête"""
        await self.send_sms(
            to_number=phone_number,
            template_name="dedication_ready",
            template_data={"artist": artist}
        )
        logger.info(f"Dedication ready SMS sent to {phone_number} for artist {artist}")
    
    async def send_payment_success_sms(self, phone_number: str, amount: float):
        """Envoie un SMS de paiement réussi"""
        await self.send_sms(
            to_number=phone_number,
            template_name="payment_success",
            template_data={"amount": amount}
        )
        logger.info(f"Payment success SMS sent to {phone_number} for {amount}€")
    
    async def send_payment_failed_sms(self, phone_number: str, amount: float):
        """Envoie un SMS de paiement échoué"""
        await self.send_sms(
            to_number=phone_number,
            template_name="payment_failed",
            template_data={"amount": amount}
        )
        logger.info(f"Payment failed SMS sent to {phone_number} for {amount}€")
    
    # ==================== WEBHOOK SMS ====================
    
    async def handle_incoming_sms(self, request_data: Dict) -> Dict[str, Any]:
        """Gère un SMS reçu"""
        try:
            from_number = request_data.get('From')
            body = request_data.get('Body')
            
            # Log le SMS reçu
            result = await db.table('incoming_sms').insert({
                "from_number": from_number,
                "body": body,
                "received_at": datetime.now().isoformat()
            }).execute()
            
            if result.data:
                logger.info(f"Incoming SMS received from {from_number}: {result.data[0]['id']}")
            
            # Traiter la réponse
            resp = MessagingResponse()
            
            # Vérifier si c'est une réponse à une commande
            if "STATUS" in body.upper():
                order_match = re.search(r'ORDER[:\s]*(\w+)', body, re.IGNORECASE)
                if order_match:
                    order_id = order_match.group(1)
                    await self._process_order_status_response(from_number, order_id, body)
                    resp.message("Merci! Votre réponse a été enregistrée.")
                    return {"reply": str(resp)}
            
            # Réponse par défaut
            resp.message("Merci de votre message. Un conseiller vous répondra sous 24h.")
            return {"reply": str(resp)}
            
        except Exception as e:
            logger.error(f"Error handling incoming SMS: {e}")
            return {"reply": None}
    
    async def _process_order_status_response(self, phone_number: str, order_id: str, response: str):
        """Traite une réponse concernant une commande"""
        try:
            # Récupérer la commande
            order = await db.table('orders').select('*').eq('id', order_id).execute()
            if order.data:
                # Sauvegarder le feedback
                feedback_result = await db.table('order_feedback').insert({
                    "order_id": order_id,
                    "phone_number": phone_number,
                    "response": response,
                    "created_at": datetime.now().isoformat()
                }).execute()
                
                if feedback_result.data:
                    logger.info(f"Order feedback saved for order {order_id}: {feedback_result.data[0]['id']}")
                
                if "LIVRE" in response.upper() or "RECU" in response.upper():
                    update_result = await db.table('orders').update({
                        "status": "delivered",
                        "delivered_at": datetime.now().isoformat()
                    }).eq('id', order_id).execute()
                    
                    if update_result.data:
                        logger.info(f"Order {order_id} marked as delivered via SMS")
                
        except Exception as e:
            logger.error(f"Error processing order status response: {e}")
    
    # ==================== UTILITAIRES ====================
    
    def _format_phone_number(self, number: str) -> str:
        """Formate un numéro de téléphone au format international"""
        # Supprimer tous les caractères non numériques
        cleaned = re.sub(r'\D', '', number)
        
        # Si le numéro commence par 0, remplacer par +33 (France)
        if cleaned.startswith('0') and len(cleaned) == 10:
            return f"+33{cleaned[1:]}"
        
        # Si le numéro commence par +, garder tel quel
        if cleaned.startswith('+'):
            return cleaned
        
        # Sinon, ajouter +
        return f"+{cleaned}"
    
    async def _log_sms(
        self,
        to_number: str,
        message: str,
        status: str,
        sid: Optional[str] = None,
        error: Optional[str] = None
    ):
        """Log l'envoi de SMS dans la base de données"""
        try:
            result = await db.table('sms_logs').insert({
                "to_number": to_number,
                "message": message[:500],
                "status": status,
                "sid": sid,
                "error": error,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            if result.data:
                logger.debug(f"SMS log created: {result.data[0]['id']}")
        except Exception as e:
            logger.error(f"Error logging SMS: {e}")
    
    async def get_sms_stats(self, days: int = 30) -> Dict[str, Any]:
        """Récupère les statistiques d'envoi de SMS"""
        try:
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            logs = await db.table('sms_logs').select('status')\
                .gte('created_at', start_date)\
                .execute()
            
            total = len(logs.data)
            sent = len([l for l in logs.data if l['status'] == 'sent'])
            failed = len([l for l in logs.data if l['status'] in ['failed', 'error']])
            
            return {
                "total": total,
                "sent": sent,
                "failed": failed,
                "success_rate": (sent / total * 100) if total > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting SMS stats: {e}")
            return {"total": 0, "sent": 0, "failed": 0, "success_rate": 0}

# Instance singleton
sms_service = SMSService()
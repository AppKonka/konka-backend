# backend/app/services/notifications/email_service.py
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment
from typing import List, Dict, Optional, Any
import logging
import base64
from pathlib import Path
from datetime import datetime
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class EmailService:
    """Service complet d'envoi d'emails avec SendGrid"""
    
    def __init__(self):
        self.client = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        self.from_email = Email(settings.SENDGRID_FROM_EMAIL, "KONKA")
        
        # Templates prédéfinis
        self.templates = {
            "welcome": "d-welcome-template-id",
            "reset_password": "d-reset-password-template-id",
            "email_verification": "d-email-verification-template-id",
            "new_match": "d-new-match-template-id",
            "new_message": "d-new-message-template-id",
            "order_confirmation": "d-order-confirmation-template-id",
            "order_shipped": "d-order-shipped-template-id",
            "order_delivered": "d-order-delivered-template-id",
            "dedication_completed": "d-dedication-completed-template-id",
            "live_reminder": "d-live-reminder-template-id",
            "new_follower": "d-new-follower-template-id",
            "new_track": "d-new-track-template-id",
            "payment_success": "d-payment-success-template-id",
            "payment_failed": "d-payment-failed-template-id",
            "account_verified": "d-account-verified-template-id"
        }
    
    # ==================== EMAILS SIMPLES ====================
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        plain_content: Optional[str] = None,
        from_name: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> bool:
        """Envoie un email simple"""
        try:
            from_email = Email(settings.SENDGRID_FROM_EMAIL, from_name or "KONKA")
            to_email_obj = To(to_email)
            
            content = Content("text/html", html_content)
            
            mail = Mail(from_email, to_email_obj, subject, content)
            
            if plain_content:
                mail.add_content(Content("text/plain", plain_content))
            
            # Ajouter les pièces jointes
            if attachments:
                for attachment in attachments:
                    attachment_obj = Attachment()
                    attachment_obj.file_content = base64.b64encode(attachment["content"]).decode()
                    attachment_obj.file_type = attachment["mime_type"]
                    attachment_obj.file_name = attachment["filename"]
                    attachment_obj.disposition = "attachment"
                    mail.add_attachment(attachment_obj)
            
            response = self.client.send(mail)
            
            if response.status_code in [200, 202]:
                logger.info(f"Email sent to {to_email}")
                await self._log_email(to_email, subject, "sent")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code}")
                await self._log_email(to_email, subject, "failed", str(response.status_code))
                return False
                
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            await self._log_email(to_email, subject, "error", str(e))
            return False
    
    # ==================== EMAILS AVEC TEMPLATES ====================
    
    async def send_template_email(
        self,
        to_email: str,
        template_name: str,
        template_data: Dict[str, Any],
        from_name: Optional[str] = None,
        attachments: Optional[List[Dict]] = None
    ) -> bool:
        """Envoie un email avec un template SendGrid"""
        try:
            template_id = self.templates.get(template_name)
            if not template_id:
                logger.error(f"Template {template_name} not found")
                return False
            
            from_email = Email(settings.SENDGRID_FROM_EMAIL, from_name or "KONKA")
            
            mail = Mail(from_email, To(to_email))
            mail.dynamic_template_data = template_data
            mail.template_id = template_id
            
            # Ajouter les pièces jointes
            if attachments:
                for attachment in attachments:
                    attachment_obj = Attachment()
                    attachment_obj.file_content = base64.b64encode(attachment["content"]).decode()
                    attachment_obj.file_type = attachment["mime_type"]
                    attachment_obj.file_name = attachment["filename"]
                    attachment_obj.disposition = "attachment"
                    mail.add_attachment(attachment_obj)
            
            response = self.client.send(mail)
            
            if response.status_code in [200, 202]:
                logger.info(f"Template email sent to {to_email}: {template_name}")
                await self._log_email(to_email, template_name, "sent")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code}")
                await self._log_email(to_email, template_name, "failed", str(response.status_code))
                return False
                
        except Exception as e:
            logger.error(f"Error sending template email: {e}")
            await self._log_email(to_email, template_name, "error", str(e))
            return False
    
    # ==================== EMAILS SPÉCIFIQUES ====================
    
    async def send_welcome_email(self, to_email: str, username: str):
        """Envoie l'email de bienvenue"""
        await self.send_template_email(
            to_email=to_email,
            template_name="welcome",
            template_data={
                "username": username,
                "app_name": "KONKA",
                "app_url": settings.FRONTEND_URL,
                "year": datetime.now().year
            }
        )
    
    async def send_verification_email(self, to_email: str, username: str, verification_url: str):
        """Envoie l'email de vérification"""
        await self.send_template_email(
            to_email=to_email,
            template_name="email_verification",
            template_data={
                "username": username,
                "verification_url": verification_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_password_reset_email(self, to_email: str, username: str, reset_url: str):
        """Envoie l'email de réinitialisation de mot de passe"""
        await self.send_template_email(
            to_email=to_email,
            template_name="reset_password",
            template_data={
                "username": username,
                "reset_url": reset_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_new_match_email(
        self,
        to_email: str,
        username: str,
        match_username: str,
        match_url: str
    ):
        """Envoie l'email de nouveau match"""
        await self.send_template_email(
            to_email=to_email,
            template_name="new_match",
            template_data={
                "username": username,
                "match_username": match_username,
                "match_url": match_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_new_message_email(
        self,
        to_email: str,
        username: str,
        sender_name: str,
        message_preview: str,
        chat_url: str
    ):
        """Envoie l'email de nouveau message"""
        await self.send_template_email(
            to_email=to_email,
            template_name="new_message",
            template_data={
                "username": username,
                "sender_name": sender_name,
                "message_preview": message_preview[:200],
                "chat_url": chat_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_order_confirmation_email(
        self,
        to_email: str,
        username: str,
        order_id: str,
        order_total: float,
        order_items: List[Dict],
        order_url: str
    ):
        """Envoie l'email de confirmation de commande"""
        await self.send_template_email(
            to_email=to_email,
            template_name="order_confirmation",
            template_data={
                "username": username,
                "order_id": order_id,
                "order_total": order_total,
                "order_items": order_items,
                "order_url": order_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_order_shipped_email(
        self,
        to_email: str,
        username: str,
        order_id: str,
        tracking_number: str,
        tracking_url: str
    ):
        """Envoie l'email de commande expédiée"""
        await self.send_template_email(
            to_email=to_email,
            template_name="order_shipped",
            template_data={
                "username": username,
                "order_id": order_id,
                "tracking_number": tracking_number,
                "tracking_url": tracking_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_dedication_completed_email(
        self,
        to_email: str,
        username: str,
        artist_name: str,
        dedication_url: str
    ):
        """Envoie l'email de dédicace livrée"""
        await self.send_template_email(
            to_email=to_email,
            template_name="dedication_completed",
            template_data={
                "username": username,
                "artist_name": artist_name,
                "dedication_url": dedication_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_payment_success_email(
        self,
        to_email: str,
        username: str,
        amount: float,
        payment_type: str,
        receipt_url: str
    ):
        """Envoie l'email de paiement réussi"""
        await self.send_template_email(
            to_email=to_email,
            template_name="payment_success",
            template_data={
                "username": username,
                "amount": amount,
                "payment_type": payment_type,
                "receipt_url": receipt_url,
                "app_name": "KONKA"
            }
        )
    
    async def send_account_verified_email(
        self,
        to_email: str,
        username: str,
        role: str
    ):
        """Envoie l'email de compte vérifié"""
        await self.send_template_email(
            to_email=to_email,
            template_name="account_verified",
            template_data={
                "username": username,
                "role": role,
                "app_name": "KONKA",
                "dashboard_url": f"{settings.FRONTEND_URL}/{role}/dashboard"
            }
        )
    
    # ==================== UTILITAIRES ====================
    
    async def _log_email(
        self,
        to_email: str,
        subject: str,
        status: str,
        error: Optional[str] = None
    ):
        """Log l'envoi d'email dans la base de données"""
        try:
            await db.table('email_logs').insert({
                "to_email": to_email,
                "subject": subject,
                "status": status,
                "error": error,
                "created_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Error logging email: {e}")
    
    async def get_email_stats(self, days: int = 30) -> Dict[str, Any]:
        """Récupère les statistiques d'envoi d'emails"""
        try:
            from datetime import timedelta
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            logs = await db.table('email_logs').select('status')\
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
            logger.error(f"Error getting email stats: {e}")
            return {"total": 0, "sent": 0, "failed": 0, "success_rate": 0}

# Instance singleton
email_service = EmailService()
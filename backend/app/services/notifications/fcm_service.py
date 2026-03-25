# backend/app/services/notifications/fcm_service.py
import firebase_admin
from firebase_admin import credentials, messaging
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class FCMService:
    """Service complet de notifications push Firebase Cloud Messaging"""
    
    def __init__(self):
        self.app = None
        self._initialize()
        
        # Topics prédéfinis
        self.topics = {
            "all": "all_users",
            "fans": "fans",
            "artists": "artists",
            "sellers": "sellers",
            "live": "live_notifications",
            "music": "music_notifications",
            "shopping": "shopping_notifications",
            "chill": "chill_notifications"
        }
    
    def _initialize(self):
        """Initialise Firebase Admin SDK"""
        try:
            if not firebase_admin._apps:
                # Utiliser le fichier de credentials
                if settings.FIREBASE_ADMIN_CREDENTIALS_PATH:
                    cred = credentials.Certificate(settings.FIREBASE_ADMIN_CREDENTIALS_PATH)
                    self.app = firebase_admin.initialize_app(cred)
                else:
                    # Utiliser les variables d'environnement (pour production)
                    cred = credentials.ApplicationDefault()
                    self.app = firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized")
        except Exception as e:
            logger.error(f"Error initializing Firebase: {e}")
    
    # ==================== NOTIFICATIONS SIMPLES ====================
    
    async def send_notification(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None,
        click_action: Optional[str] = None,
        priority: str = "high"
    ) -> bool:
        """Envoie une notification push à un appareil"""
        try:
            # Construire le message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url
                ),
                data=data or {},
                token=token,
                android=messaging.AndroidConfig(
                    priority=priority,
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="konka_notifications",
                        click_action=click_action
                    )
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            sound="default",
                            badge=1,
                            content_available=True,
                            category=click_action
                        )
                    )
                ),
                webpush=messaging.WebpushConfig(
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        icon=image_url,
                        click_action=click_action
                    )
                )
            )
            
            # Envoyer
            response = messaging.send(message)
            logger.info(f"Notification sent: {response}")
            return True
            
        except messaging.UnregisteredError:
            logger.warning(f"Token {token} is unregistered, removing")
            await self._remove_invalid_token(token)
            return False
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    async def send_multicast(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Envoie une notification à plusieurs appareils"""
        try:
            if not tokens:
                return {"success_count": 0, "failure_count": 0, "invalid_tokens": []}
            
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url
                ),
                data=data or {},
                tokens=tokens
            )
            
            response = messaging.send_multicast(message)
            
            # Gérer les tokens invalides
            invalid_tokens = []
            for idx, resp in enumerate(response.responses):
                if not resp.success:
                    if isinstance(resp.exception, messaging.UnregisteredError):
                        invalid_tokens.append(tokens[idx])
            
            # Supprimer les tokens invalides
            for token in invalid_tokens:
                await self._remove_invalid_token(token)
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "invalid_tokens": invalid_tokens
            }
            
        except Exception as e:
            logger.error(f"Error sending multicast: {e}")
            return {"success_count": 0, "failure_count": 0, "invalid_tokens": []}
    
    # ==================== NOTIFICATIONS PAR TOPIC ====================
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> Optional[str]:
        """Envoie une notification à tous les appareils abonnés à un topic"""
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                    image=image_url
                ),
                data=data or {},
                topic=topic
            )
            
            response = messaging.send(message)
            logger.info(f"Notification sent to topic {topic}: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error sending to topic: {e}")
            return None
    
    async def send_to_condition(
        self,
        condition: str,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Optional[str]:
        """Envoie une notification basée sur une condition (ex: 'fans' in topics && 'live' in topics)"""
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data or {},
                condition=condition
            )
            
            response = messaging.send(message)
            logger.info(f"Notification sent with condition {condition}: {response}")
            return response
            
        except Exception as e:
            logger.error(f"Error sending to condition: {e}")
            return None
    
    # ==================== GESTION DES TOPICS ====================
    
    async def subscribe_to_topic(
        self,
        tokens: List[str],
        topic: str
    ) -> Dict[str, Any]:
        """Abonne des appareils à un topic"""
        try:
            if not tokens:
                return {"success_count": 0, "failure_count": 0}
            
            response = messaging.subscribe_to_topic(tokens, topic)
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Error subscribing to topic: {e}")
            return {"success_count": 0, "failure_count": 0}
    
    async def unsubscribe_from_topic(
        self,
        tokens: List[str],
        topic: str
    ) -> Dict[str, Any]:
        """Désabonne des appareils d'un topic"""
        try:
            if not tokens:
                return {"success_count": 0, "failure_count": 0}
            
            response = messaging.unsubscribe_from_topic(tokens, topic)
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            logger.error(f"Error unsubscribing from topic: {e}")
            return {"success_count": 0, "failure_count": 0}
    
    # ==================== NOTIFICATIONS SPÉCIFIQUES ====================
    
    async def notify_new_match(
        self,
        user_id: str,
        match_user_id: str,
        match_user_name: str
    ):
        """Notifie un nouveau match"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title="Nouveau match !",
                body=f"Vous avez matché avec {match_user_name}",
                data={
                    "type": "new_match",
                    "match_user_id": match_user_id,
                    "match_user_name": match_user_name
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending new match notification: {e}")
    
    async def notify_new_message(
        self,
        user_id: str,
        sender_id: str,
        sender_name: str,
        message_preview: str
    ):
        """Notifie un nouveau message"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title=f"Nouveau message de {sender_name}",
                body=message_preview[:100],
                data={
                    "type": "new_message",
                    "sender_id": sender_id,
                    "sender_name": sender_name
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending new message notification: {e}")
    
    async def notify_new_follower(
        self,
        user_id: str,
        follower_id: str,
        follower_name: str
    ):
        """Notifie un nouveau follower"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title="Nouvel abonné",
                body=f"{follower_name} vous suit maintenant",
                data={
                    "type": "new_follower",
                    "follower_id": follower_id,
                    "follower_name": follower_name
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending new follower notification: {e}")
    
    async def notify_live_started(
        self,
        user_id: str,
        artist_id: str,
        artist_name: str,
        live_title: str
    ):
        """Notifie qu'un live a commencé"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title=f"{artist_name} est en live !",
                body=live_title,
                data={
                    "type": "live_started",
                    "artist_id": artist_id,
                    "artist_name": artist_name,
                    "live_title": live_title
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending live started notification: {e}")
    
    async def notify_new_track(
        self,
        user_id: str,
        artist_id: str,
        artist_name: str,
        track_title: str
    ):
        """Notifie un nouveau morceau d'un artiste suivi"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title=f"Nouveau morceau de {artist_name}",
                body=track_title,
                data={
                    "type": "new_track",
                    "artist_id": artist_id,
                    "artist_name": artist_name,
                    "track_title": track_title
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending new track notification: {e}")
    
    async def notify_dedication_completed(
        self,
        user_id: str,
        artist_id: str,
        artist_name: str
    ):
        """Notifie qu'une dédicace est prête"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title="Votre dédicace est prête !",
                body=f"{artist_name} a livré votre dédicace",
                data={
                    "type": "dedication_completed",
                    "artist_id": artist_id,
                    "artist_name": artist_name
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending dedication completed notification: {e}")
    
    async def notify_order_update(
        self,
        user_id: str,
        order_id: str,
        status: str,
        status_message: str
    ):
        """Notifie une mise à jour de commande"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title="Mise à jour de votre commande",
                body=status_message,
                data={
                    "type": "order_update",
                    "order_id": order_id,
                    "status": status
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending order update notification: {e}")
    
    async def notify_payment_success(
        self,
        user_id: str,
        amount: float,
        payment_type: str
    ):
        """Notifie un paiement réussi"""
        try:
            token = await self._get_user_token(user_id)
            if not token:
                return
            
            await self.send_notification(
                token=token,
                title="Paiement réussi",
                body=f"Votre paiement de {amount}€ a été effectué avec succès",
                data={
                    "type": "payment_success",
                    "amount": str(amount),
                    "payment_type": payment_type
                },
                click_action="FLUTTER_NOTIFICATION_CLICK"
            )
        except Exception as e:
            logger.error(f"Error sending payment success notification: {e}")
    
    # ==================== UTILITAIRES ====================
    
    async def _get_user_token(self, user_id: str) -> Optional[str]:
        """Récupère le token FCM d'un utilisateur"""
        try:
            user = await db.table('users').select('fcm_token').eq('id', user_id).execute()
            if user.data and user.data[0].get('fcm_token'):
                return user.data[0]['fcm_token']
            return None
        except Exception as e:
            logger.error(f"Error getting user token: {e}")
            return None
    
    async def _remove_invalid_token(self, token: str):
        """Supprime un token invalide de la base de données"""
        try:
            await db.table('users').update({"fcm_token": None}).eq('fcm_token', token).execute()
        except Exception as e:
            logger.error(f"Error removing invalid token: {e}")
    
    async def save_user_token(self, user_id: str, token: str):
        """Sauvegarde le token FCM d'un utilisateur"""
        try:
            await db.table('users').update({"fcm_token": token}).eq('id', user_id).execute()
            logger.info(f"Token saved for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving user token: {e}")
    
    async def send_broadcast(
        self,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        target_role: Optional[str] = None
    ) -> Dict[str, Any]:
        """Envoie une notification broadcast à tous les utilisateurs"""
        try:
            # Récupérer tous les tokens
            query = db.table('users').select('fcm_token')
            if target_role:
                query = query.eq('role', target_role)
            
            users = await query.not_.is_('fcm_token', None).execute()
            
            tokens = [u['fcm_token'] for u in users.data if u.get('fcm_token')]
            
            if not tokens:
                return {"success_count": 0, "failure_count": 0, "message": "No tokens found"}
            
            # Envoyer par lots de 500
            results = {"success_count": 0, "failure_count": 0, "invalid_tokens": []}
            
            for i in range(0, len(tokens), 500):
                batch = tokens[i:i+500]
                result = await self.send_multicast(batch, title, body, data)
                results["success_count"] += result["success_count"]
                results["failure_count"] += result["failure_count"]
                results["invalid_tokens"].extend(result.get("invalid_tokens", []))
            
            return results
            
        except Exception as e:
            logger.error(f"Error sending broadcast: {e}")
            return {"success_count": 0, "failure_count": 0, "error": str(e)}

# Instance singleton
fcm_service = FCMService()
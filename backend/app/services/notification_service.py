# backend/app/services/notification_service.py
import logging
from typing import List, Dict, Any, Optional
import json
from datetime import datetime

from app.database import db
from app.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """Service de gestion des notifications push et in-app"""
    
    def __init__(self):
        pass
    
    async def create_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        content: str,
        data: Optional[Dict[str, Any]] = None
    ) -> dict:
        """Crée une notification dans la base de données"""
        
        notification = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "content": content,
            "data": json.dumps(data) if data else None,
            "is_read": False,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('notifications').insert(notification).execute()
        
        if result.data:
            return result.data[0]
        return None
    
    async def get_user_notifications(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False
    ) -> List[dict]:
        """Récupère les notifications d'un utilisateur"""
        
        query = db.table('notifications').select('*').eq('user_id', user_id)
        
        if unread_only:
            query = query.eq('is_read', False)
        
        result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Marque une notification comme lue"""
        
        result = db.table('notifications').update({
            "is_read": True
        }).eq('id', notification_id).eq('user_id', user_id).execute()
        
        return len(result.data) > 0
    
    async def mark_all_as_read(self, user_id: str) -> int:
        """Marque toutes les notifications comme lues"""
        
        result = db.table('notifications').update({
            "is_read": True
        }).eq('user_id', user_id).eq('is_read', False).execute()
        
        return len(result.data)
    
    async def delete_notification(self, notification_id: str, user_id: str) -> bool:
        """Supprime une notification"""
        
        result = db.table('notifications').delete().eq('id', notification_id).eq('user_id', user_id).execute()
        
        return len(result.data) > 0
    
    async def send_push_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None
    ):
        """Envoie une notification push via Firebase Cloud Messaging"""
        
        try:
            # Récupérer le token FCM de l'utilisateur
            user = db.table('users').select('fcm_token').eq('id', user_id).execute()
            
            if not user.data or not user.data[0].get('fcm_token'):
                return
            
            fcm_token = user.data[0]['fcm_token']
            
            # TODO: Implémenter l'envoi via Firebase Admin SDK
            # Pour l'instant, on crée juste la notification in-app
            
            await self.create_notification(
                user_id=user_id,
                notification_type="push",
                title=title,
                content=body,
                data=data
            )
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
    
    async def notify_new_match(self, user1_id: str, user2_id: str):
        """Notifie un nouveau match"""
        
        # Notifier user1
        await self.create_notification(
            user_id=user1_id,
            notification_type="new_match",
            title="Nouveau match !",
            content=f"Vous avez matché avec un nouvel utilisateur !",
            data={"user_id": user2_id}
        )
        
        # Notifier user2
        await self.create_notification(
            user_id=user2_id,
            notification_type="new_match",
            title="Nouveau match !",
            content=f"Vous avez matché avec un nouvel utilisateur !",
            data={"user_id": user1_id}
        )
    
    async def notify_new_message(self, user_id: str, sender_id: str, match_id: str):
        """Notifie un nouveau message"""
        
        # Récupérer le nom de l'expéditeur
        sender = db.table('users').select('username').eq('id', sender_id).execute()
        sender_name = sender.data[0]['username'] if sender.data else "Utilisateur"
        
        await self.create_notification(
            user_id=user_id,
            notification_type="new_message",
            title="Nouveau message",
            content=f"{sender_name} vous a envoyé un message",
            data={"match_id": match_id, "sender_id": sender_id}
        )
    
    async def notify_dedication_completed(self, fan_id: str, artist_id: str, dedication_id: str):
        """Notifie qu'une dédicace est prête"""
        
        artist = db.table('users').select('username').eq('id', artist_id).execute()
        artist_name = artist.data[0]['username'] if artist.data else "L'artiste"
        
        await self.create_notification(
            user_id=fan_id,
            notification_type="dedication_completed",
            title="Votre dédicace est prête !",
            content=f"{artist_name} a livré votre dédicace",
            data={"dedication_id": dedication_id}
        )
    
    async def notify_new_follower(self, user_id: str, follower_id: str):
        """Notifie un nouveau follower"""
        
        follower = db.table('users').select('username').eq('id', follower_id).execute()
        follower_name = follower.data[0]['username'] if follower.data else "Quelqu'un"
        
        await self.create_notification(
            user_id=user_id,
            notification_type="new_follower",
            title="Nouvel abonné",
            content=f"{follower_name} vous suit maintenant",
            data={"follower_id": follower_id}
        )
    
    async def notify_order_status_change(self, buyer_id: str, order_id: str, status: str):
        """Notifie un changement de statut de commande"""
        
        status_messages = {
            "confirmed": "votre commande a été confirmée",
            "shipped": "votre commande a été expédiée",
            "delivered": "votre commande a été livrée",
            "disputed": "un litige a été ouvert pour votre commande"
        }
        
        message = status_messages.get(status, f"le statut de votre commande est passé à {status}")
        
        await self.create_notification(
            user_id=buyer_id,
            notification_type="order_update",
            title="Mise à jour commande",
            content=message,
            data={"order_id": order_id, "status": status}
        )
    
    async def notify_live_started(self, user_id: str, live_id: str, host_id: str):
        """Notifie le début d'un live"""
        
        host = db.table('users').select('username').eq('id', host_id).execute()
        host_name = host.data[0]['username'] if host.data else "Un artiste"
        
        await self.create_notification(
            user_id=user_id,
            notification_type="live_started",
            title="Live en cours !",
            content=f"{host_name} a commencé un live",
            data={"live_id": live_id}
        )

# Instance singleton
notification_service = NotificationService()
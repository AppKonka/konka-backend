# backend/app/services/subscription/subscription_service.py
import stripe
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
from app.database import db
from app.config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

class SubscriptionService:
    """Service de gestion des abonnements premium"""
    
    def __init__(self):
        self.plans = {
            "free": {
                "id": "free",
                "name": "Gratuit",
                "price": 0,
                "features": [
                    "Feed vidéo personnalisé",
                    "Matchs illimités",
                    "10 morceaux en favoris",
                    "Shopping standard",
                    "Sparks basiques"
                ],
                "limits": {
                    "saved_tracks": 10,
                    "spark_duration": 24,
                    "uploads_per_day": 3,
                    "video_quality": "480p"
                }
            },
            "premium": {
                "id": "premium",
                "name": "Premium",
                "price": 9.99,
                "price_id": settings.STRIPE_PREMIUM_PRICE_ID,
                "features": [
                    "Feed vidéo personnalisé avancé",
                    "Matchs illimités",
                    "Morceaux en favoris illimités",
                    "Shopping avec livraison gratuite",
                    "Sparks illimités",
                    "Téléchargement hors ligne",
                    "Qualité audio maximale",
                    "Pas de publicité",
                    "Badge Premium exclusif"
                ],
                "limits": {
                    "saved_tracks": -1,  # illimité
                    "spark_duration": 168,  # 7 jours
                    "uploads_per_day": 20,
                    "video_quality": "1080p",
                    "offline_downloads": 100
                }
            },
            "artist_pro": {
                "id": "artist_pro",
                "name": "Artist Pro",
                "price": 29.99,
                "price_id": settings.STRIPE_ARTIST_PRICE_ID,
                "features": [
                    "Tout Premium +",
                    "Mise en avant dans les découvertes",
                    "Analytics avancés",
                    "Promotion de morceaux",
                    "Badge artiste vérifié",
                    "Support prioritaire",
                    "Accès aux lives payants"
                ],
                "limits": {
                    "saved_tracks": -1,
                    "spark_duration": 168,
                    "uploads_per_day": 50,
                    "video_quality": "4K",
                    "offline_downloads": 500,
                    "promotion_credits": 100
                }
            }
        }
    
    async def create_subscription(
        self,
        user_id: str,
        plan_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Crée un abonnement pour un utilisateur"""
        try:
            plan = self.plans.get(plan_id)
            if not plan or plan_id == "free":
                raise Exception("Invalid plan")
            
            # Récupérer le client Stripe
            user = await db.table('users').select('stripe_customer_id, email')\
                .eq('id', user_id)\
                .execute()
            
            customer_id = user.data[0].get('stripe_customer_id')
            
            if not customer_id:
                # Créer un client Stripe
                customer = stripe.Customer.create(
                    email=user.data[0]['email'],
                    payment_method=payment_method_id,
                    invoice_settings={"default_payment_method": payment_method_id}
                )
                customer_id = customer.id
                
                await db.table('users').update({
                    "stripe_customer_id": customer_id
                }).eq('id', user_id).execute()
            
            # Créer l'abonnement
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": plan["price_id"]}],
                payment_behavior="default_incomplete",
                expand=["latest_invoice.payment_intent"]
            )
            
            # Sauvegarder l'abonnement
            await db.table('subscriptions').insert({
                "user_id": user_id,
                "stripe_subscription_id": subscription.id,
                "plan_id": plan_id,
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "subscription_id": subscription.id,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret,
                "status": subscription.status
            }
            
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            raise
    
    async def cancel_subscription(self, user_id: str, subscription_id: str) -> bool:
        """Annule un abonnement"""
        try:
            subscription = stripe.Subscription.delete(subscription_id)
            
            await db.table('subscriptions').update({
                "status": "canceled",
                "canceled_at": datetime.now().isoformat(),
                "canceled_at_period_end": subscription.cancel_at_period_end
            }).eq('stripe_subscription_id', subscription_id).execute()
            
            # Repasser au plan gratuit
            await self._update_user_plan(user_id, "free")
            
            return True
            
        except Exception as e:
            logger.error(f"Error canceling subscription: {e}")
            return False
    
    async def get_user_plan(self, user_id: str) -> Dict[str, Any]:
        """Récupère le plan actuel d'un utilisateur"""
        try:
            # Récupérer l'abonnement actif
            subscription = await db.table('subscriptions').select('*')\
                .eq('user_id', user_id)\
                .eq('status', 'active')\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            if subscription.data:
                plan_id = subscription.data[0]['plan_id']
                plan = self.plans.get(plan_id, self.plans["free"])
                return {
                    **plan,
                    "is_premium": True,
                    "subscription_end": subscription.data[0]['current_period_end']
                }
            
            return {
                **self.plans["free"],
                "is_premium": False
            }
            
        except Exception as e:
            logger.error(f"Error getting user plan: {e}")
            return self.plans["free"]
    
    async def _update_user_plan(self, user_id: str, plan_id: str):
        """Met à jour le plan de l'utilisateur"""
        try:
            await db.table('users').update({
                "subscription_plan": plan_id,
                "subscription_updated_at": datetime.now().isoformat()
            }).eq('id', user_id).execute()
        except Exception as e:
            logger.error(f"Error updating user plan: {e}")
    
    async def handle_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Gère les webhooks Stripe pour les abonnements"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            
            event_type = event['type']
            event_data = event['data']['object']
            
            if event_type == 'invoice.payment_succeeded':
                await self._handle_invoice_paid(event_data)
            
            elif event_type == 'invoice.payment_failed':
                await self._handle_invoice_failed(event_data)
            
            elif event_type == 'customer.subscription.updated':
                await self._handle_subscription_updated(event_data)
            
            elif event_type == 'customer.subscription.deleted':
                await self._handle_subscription_deleted(event_data)
            
            return {"status": "success"}
            
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            raise
    
    async def _handle_invoice_paid(self, invoice):
        """Gère le paiement réussi d'une facture"""
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Récupérer l'abonnement
        subscription = await db.table('subscriptions').select('user_id, plan_id')\
            .eq('stripe_subscription_id', subscription_id)\
            .execute()
        
        if subscription.data:
            await self._update_user_plan(subscription.data[0]['user_id'], subscription.data[0]['plan_id'])
    
    async def _handle_invoice_failed(self, invoice):
        """Gère l'échec de paiement d'une facture"""
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        # Notifier l'utilisateur
        subscription = await db.table('subscriptions').select('user_id')\
            .eq('stripe_subscription_id', subscription_id)\
            .execute()
        
        if subscription.data:
            await self._notify_payment_failed(subscription.data[0]['user_id'])
    
    async def _handle_subscription_updated(self, subscription_data):
        """Gère la mise à jour d'un abonnement"""
        subscription_id = subscription_data['id']
        
        await db.table('subscriptions').update({
            "status": subscription_data['status'],
            "current_period_start": datetime.fromtimestamp(subscription_data['current_period_start']).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription_data['current_period_end']).isoformat()
        }).eq('stripe_subscription_id', subscription_id).execute()
    
    async def _handle_subscription_deleted(self, subscription_data):
        """Gère la suppression d'un abonnement"""
        subscription_id = subscription_data['id']
        
        subscription = await db.table('subscriptions').select('user_id')\
            .eq('stripe_subscription_id', subscription_id)\
            .execute()
        
        if subscription.data:
            await self._update_user_plan(subscription.data[0]['user_id'], "free")
        
        await db.table('subscriptions').update({
            "status": "canceled",
            "canceled_at": datetime.now().isoformat()
        }).eq('stripe_subscription_id', subscription_id).execute()
    
    async def _notify_payment_failed(self, user_id: str):
        """Notifie l'utilisateur d'un échec de paiement"""
        from app.services.notification_service import notification_service
        await notification_service.create_notification(
            user_id=user_id,
            notification_type="payment_failed",
            title="Paiement échoué",
            content="Le paiement de votre abonnement a échoué. Veuillez mettre à jour vos informations de paiement.",
            data={"type": "subscription"}
        )

# Instance singleton
subscription_service = SubscriptionService()
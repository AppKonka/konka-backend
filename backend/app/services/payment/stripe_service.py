# backend/app/services/payment/stripe_service.py
import stripe
import logging
from typing import Dict, Optional, List, Any
from datetime import datetime
import uuid
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    """Service complet de paiement Stripe Connect"""
    
    def __init__(self):
        self.webhook_secret = settings.STRIPE_WEBHOOK_SECRET
        self.platform_fee_percent = 5  # 5% de commission
        self.platform_fee_fixed = 0.25  # 0.25€ par transaction
    
    # ==================== COMPTES CONNECT ====================
    
    async def create_connect_account(
        self,
        user_id: str,
        email: str,
        country: str = "FR",
        business_type: str = "individual"
    ) -> Dict[str, Any]:
        """Crée un compte Stripe Connect pour un artiste/vendeur"""
        try:
            account = stripe.Account.create(
                type="express",
                country=country,
                email=email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                },
                business_type=business_type,
                business_profile={
                    "mcc": "5734",  # Computer software stores
                    "url": settings.FRONTEND_URL,
                    "product_description": "Vente de musique et produits dérivés"
                },
                metadata={
                    "user_id": user_id,
                    "platform": "konka"
                }
            )
            
            # Sauvegarder l'account_id
            await db.table('users').update({
                "stripe_account_id": account.id,
                "stripe_account_status": "pending",
                "stripe_account_created_at": datetime.now().isoformat()
            }).eq('id', user_id).execute()
            
            # Créer une entrée dans la table des comptes connect
            await db.table('stripe_connect_accounts').insert({
                "user_id": user_id,
                "account_id": account.id,
                "status": "pending",
                "country": country,
                "business_type": business_type,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            logger.info(f"Stripe Connect account created for user {user_id}: {account.id}")
            
            return {
                "account_id": account.id,
                "status": "pending",
                "onboarding_url": None  # Sera généré séparément
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating Stripe account: {e}")
            raise
    
    async def get_account_onboarding_link(
        self,
        account_id: str,
        refresh_url: str,
        return_url: str
    ) -> str:
        """Génère le lien d'onboarding Stripe"""
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type="account_onboarding",
                collect="eventually_due"
            )
            
            logger.info(f"Onboarding link generated for account {account_id}")
            return account_link.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating account link: {e}")
            raise
    
    async def get_account_dashboard_link(self, account_id: str) -> str:
        """Génère le lien vers le dashboard Stripe Express"""
        try:
            login_link = stripe.Account.create_login_link(account_id)
            return login_link.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating login link: {e}")
            raise
    
    async def get_account_balance(self, account_id: str) -> Dict[str, Any]:
        """Récupère le solde d'un compte connecté"""
        try:
            balance = stripe.Balance.retrieve(stripe_account=account_id)
            
            return {
                "available": [
                    {
                        "amount": b["amount"] / 100,
                        "currency": b["currency"]
                    }
                    for b in balance["available"]
                ],
                "pending": [
                    {
                        "amount": b["amount"] / 100,
                        "currency": b["currency"]
                    }
                    for b in balance["pending"]
                ]
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting balance: {e}")
            return {"available": [], "pending": []}
    
    async def create_payout(
        self,
        account_id: str,
        amount: float,
        currency: str = "eur",
        description: str = "Payout"
    ) -> Dict[str, Any]:
        """Crée un payout vers le compte bancaire de l'utilisateur"""
        try:
            payout = stripe.Payout.create(
                amount=int(amount * 100),
                currency=currency,
                description=description,
                stripe_account=account_id
            )
            
            await db.table('payouts').insert({
                "account_id": account_id,
                "payout_id": payout.id,
                "amount": amount,
                "currency": currency,
                "status": payout.status,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "payout_id": payout.id,
                "amount": amount,
                "status": payout.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payout: {e}")
            raise
    
    # ==================== PAIEMENTS ====================
    
    async def create_payment_intent(
        self,
        amount: float,
        currency: str = "eur",
        customer_id: Optional[str] = None,
        metadata: Optional[Dict] = None,
        transfer_group: Optional[str] = None,
        destination_account: Optional[str] = None,
        application_fee_amount: Optional[int] = None
    ) -> Dict[str, Any]:
        """Crée un intent de paiement avec support des transferts"""
        try:
            intent_params = {
                "amount": int(amount * 100),
                "currency": currency,
                "metadata": metadata or {},
                "automatic_payment_methods": {"enabled": True},
                "capture_method": "automatic"
            }
            
            if transfer_group:
                intent_params["transfer_group"] = transfer_group
            
            if customer_id:
                intent_params["customer"] = customer_id
            
            # Si un compte destinataire est spécifié, créer un transfert direct
            if destination_account:
                # Calculer les frais de plateforme
                fee = int((amount * self.platform_fee_percent / 100 + self.platform_fee_fixed) * 100)
                intent_params["application_fee_amount"] = application_fee_amount or fee
                intent_params["transfer_data"] = {
                    "destination": destination_account
                }
            
            intent = stripe.PaymentIntent.create(**intent_params)
            
            # Sauvegarder l'intent
            await db.table('payment_intents').insert({
                "payment_intent_id": intent.id,
                "amount": amount,
                "currency": currency,
                "status": intent.status,
                "client_secret": intent.client_secret,
                "destination_account": destination_account,
                "metadata": metadata,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "client_secret": intent.client_secret,
                "payment_intent_id": intent.id,
                "amount": amount,
                "status": intent.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {e}")
            raise
    
    async def create_transfer(
        self,
        amount: float,
        currency: str,
        destination: str,
        transfer_group: str,
        metadata: Optional[Dict] = None,
        source_transaction: Optional[str] = None
    ) -> Dict[str, Any]:
        """Crée un transfert vers un compte connecté"""
        try:
            transfer_params = {
                "amount": int(amount * 100),
                "currency": currency,
                "destination": destination,
                "transfer_group": transfer_group,
                "metadata": metadata or {}
            }
            
            if source_transaction:
                transfer_params["source_transaction"] = source_transaction
            
            transfer = stripe.Transfer.create(**transfer_params)
            
            await db.table('transfers').insert({
                "transfer_id": transfer.id,
                "amount": amount,
                "currency": currency,
                "destination": destination,
                "transfer_group": transfer_group,
                "status": transfer.status,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "transfer_id": transfer.id,
                "amount": amount,
                "status": transfer.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating transfer: {e}")
            raise
    
    # ==================== CLIENTS ====================
    
    async def create_customer(
        self,
        email: str,
        name: str,
        user_id: str,
        phone: Optional[str] = None
    ) -> str:
        """Crée un client Stripe"""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                phone=phone,
                metadata={"user_id": user_id}
            )
            
            await db.table('users').update({
                "stripe_customer_id": customer.id
            }).eq('id', user_id).execute()
            
            logger.info(f"Stripe customer created for user {user_id}: {customer.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {e}")
            raise
    
    async def attach_payment_method(
        self,
        customer_id: str,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Attache une méthode de paiement à un client"""
        try:
            # Attacher la méthode de paiement
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer_id,
            )
            
            # Définir comme méthode par défaut
            stripe.Customer.modify(
                customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )
            
            return {
                "payment_method_id": payment_method.id,
                "type": payment_method.type,
                "last4": payment_method.card.last4 if payment_method.card else None,
                "brand": payment_method.card.brand if payment_method.card else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error attaching payment method: {e}")
            raise
    
    async def get_customer_payment_methods(self, customer_id: str) -> List[Dict]:
        """Récupère les méthodes de paiement d'un client"""
        try:
            # Récupérer la méthode par défaut du client
            customer = stripe.Customer.retrieve(customer_id)
            default_payment_method = customer.invoice_settings.default_payment_method
            
            payment_methods = stripe.PaymentMethod.list(
                customer=customer_id,
                type="card"
            )
            
            return [
                {
                    "id": pm.id,
                    "last4": pm.card.last4,
                    "brand": pm.card.brand,
                    "exp_month": pm.card.exp_month,
                    "exp_year": pm.card.exp_year,
                    "is_default": pm.id == default_payment_method
                }
                for pm in payment_methods.data
            ]
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting payment methods: {e}")
            return []
    
    # ==================== REMBOURSEMENTS ====================
    
    async def refund_payment(
        self,
        payment_intent_id: str,
        amount: Optional[float] = None,
        reason: str = "requested_by_customer"
    ) -> Dict[str, Any]:
        """Rembourse un paiement"""
        try:
            refund_params = {
                "payment_intent": payment_intent_id,
                "reason": reason
            }
            
            if amount:
                refund_params["amount"] = int(amount * 100)
            
            refund = stripe.Refund.create(**refund_params)
            
            await db.table('refunds').insert({
                "refund_id": refund.id,
                "payment_intent_id": payment_intent_id,
                "amount": amount or (refund.amount / 100),
                "reason": reason,
                "status": refund.status,
                "created_at": datetime.now().isoformat()
            }).execute()
            
            return {
                "refund_id": refund.id,
                "amount": refund.amount / 100,
                "status": refund.status
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error refunding payment: {e}")
            raise
    
    # ==================== ABONNEMENTS ====================
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: int = 0
    ) -> Dict[str, Any]:
        """Crée un abonnement"""
        try:
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{"price": price_id}],
                trial_period_days=trial_period_days,
                expand=["latest_invoice.payment_intent"]
            )
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_start": subscription.current_period_start,
                "current_period_end": subscription.current_period_end,
                "client_secret": subscription.latest_invoice.payment_intent.client_secret if subscription.latest_invoice else None
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {e}")
            raise
    
    async def cancel_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Annule un abonnement"""
        try:
            subscription = stripe.Subscription.delete(subscription_id)
            
            return {
                "subscription_id": subscription.id,
                "status": subscription.status,
                "canceled_at": subscription.canceled_at
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {e}")
            raise
    
    # ==================== WEBHOOKS ====================
    
    async def handle_webhook(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Gère les webhooks Stripe"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.webhook_secret
            )
            
            event_type = event['type']
            event_data = event['data']['object']
            
            # Mapping des événements
            handlers = {
                'account.updated': self._handle_account_updated,
                'account.application.authorized': self._handle_account_authorized,
                'account.application.deauthorized': self._handle_account_deauthorized,
                'payment_intent.succeeded': self._handle_payment_succeeded,
                'payment_intent.payment_failed': self._handle_payment_failed,
                'charge.refunded': self._handle_charge_refunded,
                'transfer.created': self._handle_transfer_created,
                'transfer.failed': self._handle_transfer_failed,
                'customer.subscription.created': self._handle_subscription_created,
                'customer.subscription.updated': self._handle_subscription_updated,
                'customer.subscription.deleted': self._handle_subscription_deleted,
                'invoice.paid': self._handle_invoice_paid,
                'invoice.payment_failed': self._handle_invoice_payment_failed,
            }
            
            handler = handlers.get(event_type)
            if handler:
                await handler(event_data)
            
            return {"status": "success", "event_type": event_type}
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Stripe signature verification failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            raise
    
    async def _handle_account_updated(self, account_data: Dict):
        """Gère la mise à jour du compte connecté"""
        account_id = account_data['id']
        charges_enabled = account_data.get('charges_enabled', False)
        payouts_enabled = account_data.get('payouts_enabled', False)
        
        status = "active" if charges_enabled and payouts_enabled else "pending"
        
        await db.table('users').update({
            "stripe_account_status": status,
            "stripe_account_verified_at": datetime.now().isoformat() if status == "active" else None
        }).eq('stripe_account_id', account_id).execute()
        
        await db.table('stripe_connect_accounts').update({
            "status": status,
            "charges_enabled": charges_enabled,
            "payouts_enabled": payouts_enabled,
            "updated_at": datetime.now().isoformat()
        }).eq('account_id', account_id).execute()
    
    async def _handle_account_authorized(self, account_data: Dict):
        """Gère l'autorisation du compte"""
        account_id = account_data['id']
        await db.table('stripe_connect_accounts').update({
            "authorized": True,
            "authorized_at": datetime.now().isoformat()
        }).eq('account_id', account_id).execute()
    
    async def _handle_account_deauthorized(self, account_data: Dict):
        """Gère la désautorisation du compte"""
        account_id = account_data['id']
        await db.table('stripe_connect_accounts').update({
            "authorized": False,
            "deauthorized_at": datetime.now().isoformat()
        }).eq('account_id', account_id).execute()
    
    async def _handle_payment_succeeded(self, payment_intent: Dict):
        """Gère un paiement réussi"""
        metadata = payment_intent.get('metadata', {})
        user_id = metadata.get('user_id')
        payment_type = metadata.get('type', 'general')
        amount = payment_intent['amount'] / 100
        
        # Créer la transaction
        await db.table('transactions').insert({
            "user_id": user_id,
            "amount": amount,
            "currency": payment_intent['currency'],
            "status": "completed",
            "type": payment_type,
            "stripe_payment_intent_id": payment_intent['id'],
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Mettre à jour le statut de la commande si applicable
        order_id = metadata.get('order_id')
        if order_id:
            await db.table('orders').update({
                "status": "confirmed",
                "paid_at": datetime.now().isoformat()
            }).eq('id', order_id).execute()
        
        # Notifier l'utilisateur
        if user_id:
            await self._send_payment_success_notification(user_id, amount, payment_type)
    
    async def _handle_payment_failed(self, payment_intent: Dict):
        """Gère un paiement échoué"""
        metadata = payment_intent.get('metadata', {})
        user_id = metadata.get('user_id')
        
        # Mettre à jour le statut de la transaction
        await db.table('transactions').update({
            "status": "failed",
            "failure_reason": payment_intent.get('last_payment_error', {}).get('message')
        }).eq('stripe_payment_intent_id', payment_intent['id']).execute()
        
        # Notifier l'utilisateur
        if user_id:
            await self._send_payment_failed_notification(user_id)
    
    async def _handle_charge_refunded(self, charge: Dict):
        """Gère un remboursement"""
        payment_intent_id = charge.get('payment_intent')
        
        if payment_intent_id:
            await db.table('transactions').update({
                "status": "refunded",
                "refunded_at": datetime.now().isoformat()
            }).eq('stripe_payment_intent_id', payment_intent_id).execute()
            
            # Mettre à jour la commande
            order = await db.table('orders').select('id').eq('payment_intent_id', payment_intent_id).execute()
            if order.data:
                await db.table('orders').update({
                    "status": "refunded",
                    "refunded_at": datetime.now().isoformat()
                }).eq('id', order.data[0]['id']).execute()
    
    async def _handle_transfer_created(self, transfer: Dict):
        """Gère un transfert créé"""
        await db.table('transfers').update({
            "status": transfer['status'],
            "completed_at": datetime.now().isoformat() if transfer['status'] == 'paid' else None
        }).eq('transfer_id', transfer['id']).execute()
    
    async def _handle_transfer_failed(self, transfer: Dict):
        """Gère un transfert échoué"""
        await db.table('transfers').update({
            "status": "failed",
            "failure_reason": transfer.get('failure_message')
        }).eq('transfer_id', transfer['id']).execute()
    
    async def _handle_subscription_created(self, subscription: Dict):
        """Gère la création d'un abonnement"""
        await db.table('subscriptions').insert({
            "subscription_id": subscription['id'],
            "customer_id": subscription['customer'],
            "status": subscription['status'],
            "current_period_start": datetime.fromtimestamp(subscription['current_period_start']).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription['current_period_end']).isoformat(),
            "created_at": datetime.now().isoformat()
        }).execute()
    
    async def _handle_subscription_updated(self, subscription: Dict):
        """Gère la mise à jour d'un abonnement"""
        await db.table('subscriptions').update({
            "status": subscription['status'],
            "current_period_start": datetime.fromtimestamp(subscription['current_period_start']).isoformat(),
            "current_period_end": datetime.fromtimestamp(subscription['current_period_end']).isoformat(),
            "updated_at": datetime.now().isoformat()
        }).eq('subscription_id', subscription['id']).execute()
    
    async def _handle_subscription_deleted(self, subscription: Dict):
        """Gère la suppression d'un abonnement"""
        await db.table('subscriptions').update({
            "status": "canceled",
            "canceled_at": datetime.now().isoformat(),
            "canceled_at_period_end": subscription.get('cancel_at_period_end', False)
        }).eq('subscription_id', subscription['id']).execute()
    
    async def _handle_invoice_paid(self, invoice: Dict):
        """Gère le paiement d'une facture"""
        await db.table('invoices').insert({
            "invoice_id": invoice['id'],
            "customer_id": invoice['customer'],
            "subscription_id": invoice.get('subscription'),
            "amount": invoice['amount_paid'] / 100,
            "currency": invoice['currency'],
            "status": "paid",
            "paid_at": datetime.now().isoformat()
        }).execute()
    
    async def _handle_invoice_payment_failed(self, invoice: Dict):
        """Gère l'échec de paiement d'une facture"""
        await db.table('invoices').insert({
            "invoice_id": invoice['id'],
            "customer_id": invoice['customer'],
            "subscription_id": invoice.get('subscription'),
            "amount": invoice['amount_due'] / 100,
            "currency": invoice['currency'],
            "status": "failed",
            "failure_reason": invoice.get('last_payment_error', {}).get('message')
        }).execute()
    
    async def _send_payment_success_notification(self, user_id: str, amount: float, payment_type: str):
        """Envoie une notification de paiement réussi"""
        from app.services.notification_service import notification_service
        await notification_service.create_notification(
            user_id=user_id,
            notification_type="payment_success",
            title="Paiement réussi",
            content=f"Votre paiement de {amount}€ a été effectué avec succès",
            data={"amount": amount, "type": payment_type}
        )
    
    async def _send_payment_failed_notification(self, user_id: str):
        """Envoie une notification de paiement échoué"""
        from app.services.notification_service import notification_service
        await notification_service.create_notification(
            user_id=user_id,
            notification_type="payment_failed",
            title="Paiement échoué",
            content="Votre paiement a échoué. Veuillez réessayer avec une autre méthode.",
            data={}
        )
    
    # ==================== STATISTIQUES ====================
    
    async def get_platform_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques de la plateforme"""
        try:
            # Récupérer les comptes connect
            accounts = await db.table('stripe_connect_accounts').select('*').execute()
            
            # Récupérer les transactions
            transactions = await db.table('transactions').select('*').execute()
            
            total_revenue = sum(t['amount'] for t in transactions.data if t['status'] == 'completed')
            platform_fees = sum(t['amount'] * self.platform_fee_percent / 100 for t in transactions.data if t['status'] == 'completed')
            
            return {
                "total_connect_accounts": len(accounts.data),
                "active_connect_accounts": len([a for a in accounts.data if a.get('status') == 'active']),
                "total_transactions": len(transactions.data),
                "total_revenue": total_revenue,
                "platform_fees": platform_fees,
                "average_transaction": total_revenue / len(transactions.data) if transactions.data else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting platform stats: {e}")
            return {}

# Instance singleton
stripe_service = StripeService()
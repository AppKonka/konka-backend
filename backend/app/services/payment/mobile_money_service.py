# backend/app/services/payment/mobile_money_service.py
import hashlib
import hmac
import json
import logging
import aiohttp
import uuid
import base64
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class MobileMoneyService:
    """Service complet de paiement Mobile Money (Orange, MTN, Wave)"""
    
    def __init__(self):
        self.orange_base_url = "https://api.orange.com"
        self.mtn_base_url = "https://api.mtn.com"
        self.wave_base_url = "https://api.wave.com"
        self.orange_token_cache = None
        self.mtn_token_cache = None
        self.token_expiry = None
    
    # ==================== ORANGE MONEY ====================
    
    async def orange_initiate_payment(
        self,
        phone_number: str,
        amount: float,
        order_id: str,
        user_id: str,
        description: str = "Paiement Konka"
    ) -> Dict[str, Any]:
        """Initie un paiement Orange Money"""
        try:
            # Obtenir un token d'accès
            access_token = await self._orange_get_token()
            
            # Générer un ID de transaction unique
            transaction_id = str(uuid.uuid4())
            merchant_id = settings.ORANGE_MERCHANT_ID
            
            # Préparer la requête
            payload = {
                "merchant_id": merchant_id,
                "amount": amount,
                "currency": "XOF",
                "order_id": order_id,
                "payer": phone_number,
                "description": description,
                "callback_url": f"{settings.API_URL}/api/payments/mobile-money/orange-callback",
                "return_url": f"{settings.FRONTEND_URL}/payment/confirm"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.orange_base_url}/orange-money-webpay/api/v1/payment",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status in [200, 201]:
                        # Sauvegarder la transaction
                        await db.table('transactions').insert({
                            "id": transaction_id,
                            "user_id": user_id,
                            "amount": amount,
                            "currency": "XOF",
                            "status": "pending",
                            "type": "mobile_money",
                            "provider": "orange",
                            "phone_number": phone_number,
                            "order_id": order_id,
                            "orange_transaction_id": result.get("transaction_id"),
                            "created_at": datetime.now().isoformat()
                        }).execute()
                        
                        logger.info(f"Orange Money payment initiated for user {user_id}, amount {amount} XOF")
                        
                        return {
                            "transaction_id": transaction_id,
                            "status": "pending",
                            "message": "Code de confirmation envoyé",
                            "payment_url": result.get("payment_url")
                        }
                    else:
                        logger.error(f"Orange Money error: {result}")
                        return {"status": "error", "message": result.get("message", "Erreur de paiement")}
                        
        except aiohttp.ClientError as e:
            logger.error(f"Orange Money HTTP error: {e}")
            return {"status": "error", "message": "Erreur de connexion au service de paiement"}
        except Exception as e:
            logger.error(f"Orange Money payment error: {e}")
            raise
    
    async def orange_confirm_payment(
        self,
        transaction_id: str,
        confirmation_code: str
    ) -> Dict[str, Any]:
        """Confirme un paiement Orange Money"""
        try:
            # Récupérer la transaction
            transaction = await db.table('transactions').select('*').eq('id', transaction_id).execute()
            if not transaction.data:
                return {"status": "error", "message": "Transaction non trouvée"}
            
            # Vérifier le code avec l'API Orange
            access_token = await self._orange_get_token()
            orange_tx_id = transaction.data[0].get('orange_transaction_id')
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.orange_base_url}/orange-money-webpay/api/v1/transaction/{orange_tx_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                ) as response:
                    result = await response.json()
                    
                    if result.get("status") == "SUCCESS":
                        # Mettre à jour le statut
                        await db.table('transactions').update({
                            "status": "completed",
                            "confirmation_code": confirmation_code,
                            "completed_at": datetime.now().isoformat()
                        }).eq('id', transaction_id).execute()
                        
                        # Mettre à jour la commande
                        order_id = transaction.data[0].get('order_id')
                        if order_id:
                            await db.table('orders').update({
                                "status": "confirmed",
                                "paid_at": datetime.now().isoformat()
                            }).eq('id', order_id).execute()
                        
                        return {
                            "status": "completed",
                            "transaction_id": transaction_id,
                            "amount": transaction.data[0]['amount']
                        }
                    else:
                        return {"status": "pending", "message": "En attente de confirmation"}
                        
        except Exception as e:
            logger.error(f"Orange Money confirmation error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def _orange_get_token(self) -> str:
        """Obtient un token d'accès Orange Money avec cache"""
        try:
            # Vérifier le cache
            if self.orange_token_cache and self.token_expiry and datetime.now() < self.token_expiry:
                return self.orange_token_cache
            
            auth_string = f"{settings.ORANGE_CLIENT_ID}:{settings.ORANGE_CLIENT_SECRET}"
            encoded_auth = base64.b64encode(auth_string.encode()).decode()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.orange_base_url}/oauth/v2/token",
                    headers={
                        "Authorization": f"Basic {encoded_auth}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data="grant_type=client_credentials"
                ) as response:
                    result = await response.json()
                    token = result.get("access_token")
                    expires_in = result.get("expires_in", 3600)
                    
                    # Mettre en cache
                    self.orange_token_cache = token
                    self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)
                    
                    return token
                    
        except Exception as e:
            logger.error(f"Error getting Orange token: {e}")
            raise
    
    # ==================== MTN MONEY ====================
    
    async def mtn_initiate_payment(
        self,
        phone_number: str,
        amount: float,
        order_id: str,
        user_id: str,
        description: str = "Paiement Konka"
    ) -> Dict[str, Any]:
        """Initie un paiement MTN Money"""
        try:
            # Obtenir un token d'accès
            access_token = await self._mtn_get_token()
            
            # Générer un ID de transaction
            transaction_id = str(uuid.uuid4())
            reference_id = str(uuid.uuid4())
            
            payload = {
                "amount": str(amount),
                "currency": "XOF",
                "externalId": order_id,
                "payer": {
                    "partyIdType": "MSISDN",
                    "partyId": phone_number
                },
                "payerMessage": description,
                "payeeNote": f"Commande {order_id}"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.mtn_base_url}/collection/v1_0/requesttopay",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "X-Reference-Id": reference_id,
                        "Content-Type": "application/json"
                    },
                    json=payload
                ) as response:
                    if response.status == 202:
                        # Sauvegarder la transaction
                        await db.table('transactions').insert({
                            "id": transaction_id,
                            "user_id": user_id,
                            "amount": amount,
                            "currency": "XOF",
                            "status": "pending",
                            "type": "mobile_money",
                            "provider": "mtn",
                            "phone_number": phone_number,
                            "order_id": order_id,
                            "mtn_reference_id": reference_id,
                            "created_at": datetime.now().isoformat()
                        }).execute()
                        
                        logger.info(f"MTN Money payment initiated for user {user_id}, amount {amount} XOF")
                        
                        return {
                            "transaction_id": transaction_id,
                            "status": "pending",
                            "message": "Demande de paiement envoyée"
                        }
                    else:
                        result = await response.text()
                        logger.error(f"MTN Money error: {result}")
                        return {"status": "error", "message": "Erreur de paiement"}
                        
        except Exception as e:
            logger.error(f"MTN Money payment error: {e}")
            raise
    
    async def mtn_check_payment_status(self, transaction_id: str) -> Dict[str, Any]:
        """Vérifie le statut d'un paiement MTN Money"""
        try:
            # Récupérer la transaction
            transaction = await db.table('transactions').select('*').eq('id', transaction_id).execute()
            if not transaction.data:
                return {"status": "error", "message": "Transaction non trouvée"}
            
            reference_id = transaction.data[0].get('mtn_reference_id')
            access_token = await self._mtn_get_token()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.mtn_base_url}/collection/v1_0/requesttopay/{reference_id}",
                    headers={"Authorization": f"Bearer {access_token}"}
                ) as response:
                    result = await response.json()
                    
                    if result.get("status") == "SUCCESSFUL":
                        await db.table('transactions').update({
                            "status": "completed",
                            "completed_at": datetime.now().isoformat()
                        }).eq('id', transaction_id).execute()
                        
                        return {"status": "completed"}
                    elif result.get("status") == "FAILED":
                        await db.table('transactions').update({
                            "status": "failed",
                            "failure_reason": result.get("reason")
                        }).eq('id', transaction_id).execute()
                        return {"status": "failed", "message": result.get("reason")}
                    else:
                        return {"status": "pending"}
                        
        except Exception as e:
            logger.error(f"MTN payment status error: {e}")
            return {"status": "pending"}
    
    async def _mtn_get_token(self) -> str:
        """Obtient un token d'accès MTN Money avec cache"""
        try:
            # Vérifier le cache
            if self.mtn_token_cache and self.token_expiry and datetime.now() < self.token_expiry:
                return self.mtn_token_cache
            
            auth_string = f"{settings.MTN_CLIENT_ID}:{settings.MTN_CLIENT_SECRET}"
            encoded_auth = base64.b64encode(auth_string.encode()).decode()
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.mtn_base_url}/collection/token/",
                    headers={
                        "Authorization": f"Basic {encoded_auth}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data="grant_type=client_credentials"
                ) as response:
                    result = await response.json()
                    token = result.get("access_token")
                    expires_in = result.get("expires_in", 3600)
                    
                    self.mtn_token_cache = token
                    self.token_expiry = datetime.now() + timedelta(seconds=expires_in - 60)
                    
                    return token
                    
        except Exception as e:
            logger.error(f"Error getting MTN token: {e}")
            raise
    
    # ==================== WAVE (SENEGAL) ====================
    
    async def wave_initiate_payment(
        self,
        phone_number: str,
        amount: float,
        order_id: str,
        user_id: str,
        description: str = "Paiement Konka"
    ) -> Dict[str, Any]:
        """Initie un paiement Wave"""
        try:
            transaction_id = str(uuid.uuid4())
            
            payload = {
                "amount": amount,
                "currency": "XOF",
                "phone_number": phone_number,
                "reference": order_id,
                "description": description,
                "callback_url": f"{settings.API_URL}/api/payments/mobile-money/wave-callback"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.wave_base_url}/v1/charges",
                    headers={
                        "Authorization": f"Bearer {settings.WAVE_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                ) as response:
                    result = await response.json()
                    
                    if response.status == 200:
                        await db.table('transactions').insert({
                            "id": transaction_id,
                            "user_id": user_id,
                            "amount": amount,
                            "currency": "XOF",
                            "status": "pending",
                            "type": "mobile_money",
                            "provider": "wave",
                            "phone_number": phone_number,
                            "order_id": order_id,
                            "wave_charge_id": result.get("id"),
                            "created_at": datetime.now().isoformat()
                        }).execute()
                        
                        logger.info(f"Wave payment initiated for user {user_id}, amount {amount} XOF")
                        
                        return {
                            "transaction_id": transaction_id,
                            "status": "pending",
                            "wave_charge_id": result.get("id"),
                            "payment_url": result.get("checkout_url")
                        }
                    else:
                        return {"status": "error", "message": result.get("message", "Erreur de paiement")}
                        
        except Exception as e:
            logger.error(f"Wave payment error: {e}")
            raise
    
    async def wave_handle_callback(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Gère le callback Wave"""
        try:
            charge_id = data.get("id")
            status = data.get("status")
            
            if status == "success":
                await db.table('transactions').update({
                    "status": "completed",
                    "completed_at": datetime.now().isoformat()
                }).eq('wave_charge_id', charge_id).execute()
                
                # Récupérer la transaction pour mettre à jour la commande
                transaction = await db.table('transactions').select('order_id').eq('wave_charge_id', charge_id).execute()
                if transaction.data and transaction.data[0].get('order_id'):
                    await db.table('orders').update({
                        "status": "confirmed",
                        "paid_at": datetime.now().isoformat()
                    }).eq('id', transaction.data[0]['order_id']).execute()
                
                return {"status": "success"}
            elif status == "failed":
                await db.table('transactions').update({
                    "status": "failed",
                    "failure_reason": data.get("reason")
                }).eq('wave_charge_id', charge_id).execute()
                return {"status": "failed"}
            
            return {"status": "pending"}
            
        except Exception as e:
            logger.error(f"Wave callback error: {e}")
            return {"status": "error"}
    
    # ==================== MÉTHODES GÉNÉRALES ====================
    
    async def get_transaction_status(self, transaction_id: str) -> Dict[str, Any]:
        """Récupère le statut d'une transaction"""
        try:
            transaction = await db.table('transactions').select('*').eq('id', transaction_id).execute()
            if not transaction.data:
                return {"status": "not_found"}
            
            provider = transaction.data[0].get('provider')
            
            if provider == 'orange':
                return await self.orange_confirm_payment(transaction_id, "")
            elif provider == 'mtn':
                return await self.mtn_check_payment_status(transaction_id)
            else:
                return {"status": transaction.data[0].get('status', 'pending')}
                
        except Exception as e:
            logger.error(f"Error getting transaction status: {e}")
            return {"status": "error"}

# Instance singleton
mobile_money_service = MobileMoneyService()
# backend/app/routers/payments.py
from fastapi import APIRouter, HTTPException, status, Depends, Request, Query, BackgroundTasks
from typing import Optional
from pydantic import BaseModel
from app.core.security import get_current_user
from app.services.payment.stripe_service import stripe_service
from app.services.payment.mobile_money_service import mobile_money_service
from app.database import db

router = APIRouter(prefix="/payments", tags=["Payments"])

class CreatePaymentIntentRequest(BaseModel):
    amount: float
    currency: str = "eur"
    payment_type: str = "general"
    metadata: Optional[dict] = None

class MobileMoneyPaymentRequest(BaseModel):
    phone_number: str
    amount: float
    provider: str  # orange, mtn, wave

# ==================== STRIPE ====================

@router.post("/stripe/create-intent")
async def create_payment_intent(
    request: CreatePaymentIntentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Crée un intent de paiement Stripe"""
    try:
        # Récupérer ou créer le client Stripe
        user = await db.table('users').select('stripe_customer_id, email, display_name')\
            .eq('id', current_user['id']).execute()
        
        customer_id = user.data[0].get('stripe_customer_id')
        
        if not customer_id:
            customer_id = await stripe_service.create_customer(
                email=user.data[0]['email'],
                name=user.data[0]['display_name'],
                user_id=current_user['id']
            )
        
        # Créer le payment intent
        result = await stripe_service.create_payment_intent(
            amount=request.amount,
            currency=request.currency,
            customer_id=customer_id,
            metadata={
                "user_id": current_user['id'],
                "type": request.payment_type,
                **(request.metadata or {})
            }
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stripe/connect/create-account")
async def create_connect_account(
    current_user: dict = Depends(get_current_user)
):
    """Crée un compte Stripe Connect pour un artiste/vendeur"""
    try:
        result = await stripe_service.create_connect_account(
            user_id=current_user['id'],
            email=current_user['email'],
            country="FR"
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stripe/connect/onboarding-link")
async def get_onboarding_link(
    current_user: dict = Depends(get_current_user)
):
    """Génère le lien d'onboarding Stripe Connect"""
    try:
        user = await db.table('users').select('stripe_account_id')\
            .eq('id', current_user['id']).execute()
        
        account_id = user.data[0].get('stripe_account_id')
        
        if not account_id:
            raise HTTPException(status_code=400, detail="No Stripe account found")
        
        url = await stripe_service.get_account_onboarding_link(
            account_id=account_id,
            refresh_url=f"{settings.FRONTEND_URL}/settings/payments",
            return_url=f"{settings.FRONTEND_URL}/settings/payments/success"
        )
        
        return {"url": url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    """Webhook Stripe"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        result = await stripe_service.handle_webhook(payload, sig_header)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== MOBILE MONEY ====================

@router.post("/mobile-money/initiate")
async def initiate_mobile_money_payment(
    request: MobileMoneyPaymentRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initie un paiement Mobile Money"""
    try:
        order_id = str(uuid.uuid4())
        
        if request.provider == "orange":
            result = await mobile_money_service.orange_initiate_payment(
                phone_number=request.phone_number,
                amount=request.amount,
                order_id=order_id,
                user_id=current_user['id']
            )
        elif request.provider == "mtn":
            result = await mobile_money_service.mtn_initiate_payment(
                phone_number=request.phone_number,
                amount=request.amount,
                order_id=order_id,
                user_id=current_user['id']
            )
        elif request.provider == "wave":
            result = await mobile_money_service.wave_initiate_payment(
                phone_number=request.phone_number,
                amount=request.amount,
                order_id=order_id,
                user_id=current_user['id']
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid provider")
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mobile-money/confirm/{transaction_id}")
async def confirm_mobile_money_payment(
    transaction_id: str,
    confirmation_code: str,
    current_user: dict = Depends(get_current_user)
):
    """Confirme un paiement Mobile Money"""
    try:
        result = await mobile_money_service.orange_confirm_payment(
            transaction_id=transaction_id,
            confirmation_code=confirmation_code
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mobile-money/wave-callback")
async def wave_callback(request: Request):
    """Callback Wave pour confirmation de paiement"""
    try:
        data = await request.json()
        result = await mobile_money_service.wave_handle_callback(data)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/transactions")
async def get_transactions(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère l'historique des transactions"""
    try:
        transactions = await db.table('transactions').select('*')\
            .eq('user_id', current_user['id'])\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {
            "data": transactions.data,
            "total": len(transactions.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
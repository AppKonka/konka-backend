# backend/app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import jwt
import os
import logging

from app.database import db
from app.models.user import UserCreate, UserResponse, UserRole
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token, verify_token, get_current_user
)
from app.config import settings

# Configuration du logging
logger = logging.getLogger(__name__)

# Import supabase avec gestion d'erreur
try:
    from supabase import create_client
    SUPABASE_AVAILABLE = True
    logger.info("✅ Supabase package loaded successfully")
except ImportError as e:
    SUPABASE_AVAILABLE = False
    logger.error(f"⚠️ Supabase package not installed: {e}. Run: pip install supabase")

router = APIRouter()
security = HTTPBearer()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RegisterRequest(UserCreate):
    pass


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def get_supabase_client():
    """Retourne un client Supabase avec vérification"""
    if not SUPABASE_AVAILABLE:
        logger.error("Supabase package not available")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase package not installed. Please run: pip install supabase"
        )
    
    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("✅ Supabase client created successfully")
        return client
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase connection failed: {str(e)}"
        )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest):
    """Inscription d'un nouvel utilisateur"""
    logger.info(f"📝 Registering new user: {user_data.email} (role: {user_data.role})")
    
    try:
        # Vérifier si l'email existe déjà
        existing_user = db.table('users').select('id').eq('email', user_data.email).execute()
        if existing_user.data:
            logger.warning(f"Email already registered: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Vérifier si le pseudo existe déjà
        existing_username = db.table('users').select('id').eq('username', user_data.username).execute()
        if existing_username.data:
            logger.warning(f"Username already taken: {user_data.username}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Créer l'utilisateur dans Supabase Auth
        supabase_auth = get_supabase_client()
        
        auth_response = supabase_auth.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "username": user_data.username,
                    "role": user_data.role.value
                }
            }
        })
        
        if not auth_response.user:
            logger.error(f"Failed to create user in Supabase Auth: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
        logger.info(f"✅ User created in Supabase Auth: {auth_response.user.id}")
        
        # Créer le profil dans la table users
        user_insert = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "username": user_data.username,
            "display_name": user_data.display_name or user_data.username,
            "phone": user_data.phone,
            "role": user_data.role.value,
            "date_of_birth": user_data.date_of_birth.isoformat() if user_data.date_of_birth else None,
            "gender": user_data.gender.value if user_data.gender else None,
            "country": user_data.country,
            "city": user_data.city,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        db.table('users').insert(user_insert).execute()
        logger.info(f"✅ User profile created: {auth_response.user.id}")
        
        # Si c'est un artiste, créer le profil artiste
        if user_data.role == UserRole.ARTIST:
            artist_insert = {
                "user_id": auth_response.user.id,
                "artist_name": user_data.username,
                "verification_status": "pending",
                "created_at": datetime.now().isoformat()
            }
            db.table('artists').insert(artist_insert).execute()
            logger.info(f"🎤 Artist profile created: {auth_response.user.id}")
        
        # Si c'est un vendeur, créer le profil vendeur
        if user_data.role == UserRole.SELLER:
            seller_insert = {
                "user_id": auth_response.user.id,
                "store_name": user_data.display_name or user_data.username,
                "verification_status": "pending",
                "created_at": datetime.now().isoformat()
            }
            db.table('sellers').insert(seller_insert).execute()
            logger.info(f"🛍️ Seller profile created: {auth_response.user.id}")
        
        # Récupérer l'utilisateur créé
        user = db.table('users').select('*').eq('id', auth_response.user.id).execute()
        
        if not user.data:
            logger.error(f"User not found after creation: {auth_response.user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found after creation"
            )
        
        # Créer les tokens
        access_token = create_access_token(data={"sub": auth_response.user.id})
        refresh_token = create_refresh_token(data={"sub": auth_response.user.id})
        
        logger.info(f"🎉 User registered successfully: {user_data.email}")
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Connexion utilisateur"""
    logger.info(f"🔐 Login attempt: {login_data.email}")
    
    try:
        supabase_auth = get_supabase_client()
        
        # Authentifier avec Supabase
        auth_response = supabase_auth.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_response.user:
            logger.warning(f"Invalid credentials for: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        logger.info(f"✅ Supabase authentication successful: {auth_response.user.id}")
        
        # Récupérer le profil
        user = db.table('users').select('*').eq('id', auth_response.user.id).execute()
        
        if not user.data:
            logger.error(f"User profile not found: {auth_response.user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Mettre à jour last_active_at
        db.table('users').update({
            "last_active_at": datetime.now().isoformat()
        }).eq('id', auth_response.user.id).execute()
        
        # Créer les tokens
        access_token = create_access_token(data={"sub": auth_response.user.id})
        refresh_token = create_refresh_token(data={"sub": auth_response.user.id})
        
        logger.info(f"🎉 Login successful: {login_data.email}")
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Rafraîchir le token d'accès"""
    logger.info("🔄 Refreshing token")
    
    try:
        payload = verify_token(refresh_data.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            logger.warning("Invalid refresh token: no user_id")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user = db.table('users').select('*').eq('id', user_id).execute()
        
        if not user.data:
            logger.warning(f"User not found for refresh: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})
        
        logger.info(f"✅ Token refreshed for user: {user_id}")
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh failed: {str(e)}"
        )


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Déconnexion utilisateur"""
    logger.info(f"👋 Logout user: {current_user.get('id')}")
    # En production, on pourrait blacklister le token
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Demande de réinitialisation de mot de passe"""
    logger.info(f"📧 Password reset requested for: {request.email}")
    
    try:
        supabase_auth = get_supabase_client()
        
        supabase_auth.auth.reset_password_for_email(
            request.email,
            options={
                "redirect_to": f"{settings.ALLOWED_ORIGINS[0]}/reset-password"
            }
        )
        
        logger.info(f"✅ Password reset email sent to: {request.email}")
        return {"message": "Password reset email sent"}
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reset email: {str(e)}"
        )


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Réinitialisation du mot de passe"""
    logger.info("🔐 Password reset attempt")
    
    try:
        supabase_auth = get_supabase_client()
        
        # Vérifier le token et mettre à jour le mot de passe
        supabase_auth.auth.update_user({
            "password": request.new_password
        }, jwt=request.token)
        
        logger.info("✅ Password reset successful")
        return {"message": "Password updated successfully"}
        
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Récupérer le profil de l'utilisateur connecté"""
    logger.info(f"👤 Getting profile for user: {current_user.get('id')}")
    return UserResponse(**current_user)
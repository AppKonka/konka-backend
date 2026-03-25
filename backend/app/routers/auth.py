# backend/app/routers/auth.py
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
import jwt

from app.database import db
from app.models.user import UserCreate, UserResponse, UserRole
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
    create_refresh_token, verify_token, get_current_user
)
from app.config import settings

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

@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: RegisterRequest):
    """Inscription d'un nouvel utilisateur"""
    try:
        # Vérifier si l'email existe déjà
        existing_user = db.table('users').select('id').eq('email', user_data.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Vérifier si le pseudo existe déjà
        existing_username = db.table('users').select('id').eq('username', user_data.username).execute()
        if existing_username.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Créer l'utilisateur dans Supabase Auth
        from supabase import create_client
        supabase_auth = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
        
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
        }
        
        db.table('users').insert(user_insert).execute()
        
        # Si c'est un artiste, créer le profil artiste
        if user_data.role == UserRole.ARTIST:
            artist_insert = {
                "user_id": auth_response.user.id,
                "artist_name": user_data.username,
                "verification_status": "pending"
            }
            db.table('artists').insert(artist_insert).execute()
        
        # Si c'est un vendeur, créer le profil vendeur
        if user_data.role == UserRole.SELLER:
            seller_insert = {
                "user_id": auth_response.user.id,
                "store_name": user_data.display_name or user_data.username,
                "verification_status": "pending"
            }
            db.table('sellers').insert(seller_insert).execute()
        
        # Récupérer l'utilisateur créé
        user = db.table('users').select('*').eq('id', auth_response.user.id).execute()
        
        # Créer les tokens
        access_token = create_access_token(data={"sub": auth_response.user.id})
        refresh_token = create_refresh_token(data={"sub": auth_response.user.id})
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Connexion utilisateur"""
    try:
        from supabase import create_client
        supabase_auth = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
        # Authentifier avec Supabase
        auth_response = supabase_auth.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Récupérer le profil
        user = db.table('users').select('*').eq('id', auth_response.user.id).execute()
        
        if not user.data:
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
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )

@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Rafraîchir le token d'accès"""
    try:
        payload = verify_token(refresh_data.refresh_token)
        user_id = payload.get("sub")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user = db.table('users').select('*').eq('id', user_id).execute()
        
        if not user.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        access_token = create_access_token(data={"sub": user_id})
        new_refresh_token = create_refresh_token(data={"sub": user_id})
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            user=UserResponse(**user.data[0])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Refresh failed: {str(e)}"
        )

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Déconnexion utilisateur"""
    # En production, on pourrait blacklister le token
    return {"message": "Logged out successfully"}

@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Demande de réinitialisation de mot de passe"""
    try:
        from supabase import create_client
        supabase_auth = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
        supabase_auth.auth.reset_password_for_email(
            request.email,
            options={
                "redirect_to": f"{settings.ALLOWED_ORIGINS[0]}/reset-password"
            }
        )
        
        return {"message": "Password reset email sent"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send reset email: {str(e)}"
        )

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Réinitialisation du mot de passe"""
    try:
        from supabase import create_client
        supabase_auth = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        
        # Vérifier le token et mettre à jour le mot de passe
        supabase_auth.auth.update_user({
            "password": request.new_password
        }, jwt=request.token)
        
        return {"message": "Password updated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {str(e)}"
        )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Récupérer le profil de l'utilisateur connecté"""
    return UserResponse(**current_user)
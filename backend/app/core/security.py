# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext

from app.config import settings
from app.database import db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash un mot de passe"""
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Crée un token d'accès JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Crée un token de rafraîchissement JWT"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    """Vérifie et décode un token JWT"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Récupère l'utilisateur actuel à partir du token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    # Récupérer l'utilisateur depuis Supabase
    user = db.table('users').select('*').eq('id', user_id).execute()
    
    if not user.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return user.data[0]

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Vérifie que l'utilisateur est actif"""
    # Vérifications supplémentaires si nécessaire
    return current_user

async def get_current_fan(current_user: dict = Depends(get_current_active_user)) -> dict:
    """Vérifie que l'utilisateur est un fan"""
    if current_user.get('role') != 'fan':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a fan"
        )
    return current_user

async def get_current_artist(current_user: dict = Depends(get_current_active_user)) -> dict:
    """Vérifie que l'utilisateur est un artiste"""
    if current_user.get('role') != 'artist':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not an artist"
        )
    return current_user

async def get_current_seller(current_user: dict = Depends(get_current_active_user)) -> dict:
    """Vérifie que l'utilisateur est un vendeur"""
    if current_user.get('role') != 'seller':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a seller"
        )
    return current_user
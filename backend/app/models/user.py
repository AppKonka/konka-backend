# backend/app/models/user.py
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class UserRole(str, Enum):
    FAN = "fan"
    ARTIST = "artist"
    SELLER = "seller"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT = "prefer_not"

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.FAN
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    country: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    is_verified: bool = False
    is_private: bool = False

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    country: Optional[str] = None
    city: Optional[str] = None
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    is_private: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    xp_points: int = 0
    reputation_score: float = 0.0
    created_at: datetime
    updated_at: datetime
    last_active_at: datetime
    
    class Config:
        from_attributes = True

class ArtistProfile(BaseModel):
    user_id: str
    artist_name: str
    legal_name: Optional[str] = None
    nationality: Optional[str] = None
    type: str  # solo, group, label, producer
    year_started: Optional[int] = None
    genres: List[str] = []
    social_links: Optional[Dict[str, str]] = None
    verification_status: str = "pending"
    verified_at: Optional[datetime] = None

class SellerProfile(BaseModel):
    user_id: str
    store_name: str
    store_description: Optional[str] = None
    store_logo: Optional[str] = None
    store_banner: Optional[str] = None
    store_type: str  # individual, professional, artisan
    categories: List[str] = []
    siret_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    verification_status: str = "pending"
    verified_at: Optional[datetime] = None

class UserWithProfile(UserResponse):
    artist_profile: Optional[ArtistProfile] = None
    seller_profile: Optional[SellerProfile] = None
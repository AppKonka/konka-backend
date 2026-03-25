# backend/app/models/match.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class MatchCreate(BaseModel):
    user_id: str

class MatchResponse(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    status: str
    created_at: datetime
    matched_at: Optional[datetime] = None

class ProfileResponse(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    common_artists: int = 0
    current_track: Optional[Dict[str, Any]] = None
    compatibility_score: float = 0.0
    status: str = "offline"
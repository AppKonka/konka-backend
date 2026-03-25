# backend/app/models/chill.py
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChillEventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    location_name: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    event_date: datetime
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    participant_limit: Optional[int] = None
    fee: Optional[float] = None
    dress_code: Optional[str] = None
    tags: List[str] = []

class ChillEventResponse(ChillEventCreate):
    id: str
    organizer_id: str
    status: str
    created_at: datetime
    participant_count: int = 0
    participants: List[dict] = []

class ChillParticipantResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    status: str
    joined_at: datetime
    user: Optional[dict] = None
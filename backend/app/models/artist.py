# backend/app/models/artist.py
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class ArtistStats(BaseModel):
    total_plays: int = 0
    followers: int = 0
    tracks_count: int = 0
    pending_dedications: int = 0
    completed_dedications: int = 0
    dedication_revenue: float = 0.0
    total_live_views: int = 0
    live_revenue: float = 0.0
    sales_revenue: float = 0.0
    total_revenue: float = 0.0
    top_tracks: List[dict] = []

class DedicationRequest(BaseModel):
    message: str
    type: str = "video"

class DedicationResponse(BaseModel):
    id: str
    artist_id: str
    fan_id: str
    fan: Optional[dict] = None
    message: str
    video_url: Optional[str] = None
    type: str
    price: float
    status: str
    requested_at: datetime
    completed_at: Optional[datetime] = None
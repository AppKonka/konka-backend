# backend/app/models/analytics.py
from pydantic import BaseModel
from typing import Optional, List

class PlatformStats(BaseModel):
    total_users: int = 0
    total_tracks: int = 0
    total_matches: int = 0
    total_posts: int = 0
    total_orders: int = 0
    total_lives: int = 0
    total_plays: int = 0
    total_revenue: float = 0.0

class TrendingStats(BaseModel):
    trending_tracks: List[dict] = []
    trending_artists: List[dict] = []
    trending_hashtags: List[dict] = []
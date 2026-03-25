# backend/app/models/seller.py
from pydantic import BaseModel
from typing import Optional, List

class SellerStats(BaseModel):
    total_revenue: float = 0.0
    total_orders: int = 0
    total_products: int = 0
    total_customers: int = 0
    average_rating: float = 0.0
    top_products: List[dict] = []
    weekly_growth: float = 0.0
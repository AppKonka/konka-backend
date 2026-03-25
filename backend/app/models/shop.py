# backend/app/models/shop.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    DISPUTED = "disputed"
    CANCELLED = "cancelled"

class ProductBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: float = Field(..., ge=0)
    currency: str = "USD"
    images: List[str] = []
    video_url: Optional[str] = None
    category: Optional[str] = None
    tags: List[str] = []
    stock: int = Field(0, ge=0)
    is_active: bool = True
    promotion_price: Optional[float] = Field(None, ge=0)
    promotion_ends_at: Optional[datetime] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    images: Optional[List[str]] = None
    stock: Optional[int] = None
    is_active: Optional[bool] = None
    promotion_price: Optional[float] = None
    promotion_ends_at: Optional[datetime] = None

class ProductResponse(ProductBase):
    id: str
    seller_id: str
    seller: Optional[Dict[str, Any]] = None
    like_count: int = 0
    created_at: datetime
    updated_at: datetime

class OrderItemBase(BaseModel):
    product_id: str
    quantity: int = Field(1, ge=1)
    price_at_time: float

class OrderCreate(BaseModel):
    items: List[OrderItemBase]
    shipping_address: str
    shipping_method: str
    payment_method: str

class OrderResponse(BaseModel):
    id: str
    buyer_id: str
    buyer: Optional[Dict[str, Any]] = None
    status: OrderStatus
    total_amount: float
    shipping_address: str
    tracking_number: Optional[str] = None
    items: List[OrderItemBase]
    created_at: datetime
    delivered_at: Optional[datetime] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: float
    item_count: int
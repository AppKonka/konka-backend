# backend/app/models/notifications.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class NotificationCreate(BaseModel):
    type: str
    title: str
    content: str
    data: Optional[Dict[str, Any]] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    content: str
    data: Optional[Dict[str, Any]] = None
    is_read: bool = False
    created_at: datetime
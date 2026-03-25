# backend/app/models/chat.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class MessageCreate(BaseModel):
    match_id: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    is_ephemeral: bool = False
    expires_in: Optional[int] = 3600

class MessageResponse(BaseModel):
    id: str
    match_id: str
    sender_id: str
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    is_read: bool = False
    is_ephemeral: bool = False
    created_at: datetime
    expires_at: Optional[datetime] = None

class ConversationResponse(BaseModel):
    match_id: str
    user: Dict[str, Any]
    last_message: Optional[Dict[str, Any]] = None
    unread_count: int = 0
    created_at: datetime
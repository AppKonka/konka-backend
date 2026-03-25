# backend/app/models/content.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ContentType(str, Enum):
    VIDEO = "video"
    IMAGE = "image"
    AUDIO = "audio"

class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    FRIENDS = "friends"
    SUBSCRIBERS = "subscribers"

class SparkType(str, Enum):
    PHOTO = "photo"
    VIDEO = "video"
    LIVE = "live"

class PostBase(BaseModel):
    type: ContentType
    media_urls: List[str]
    caption: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = None
    music_track_id: Optional[str] = None
    visibility: Visibility = Visibility.PUBLIC

class PostCreate(PostBase):
    pass

class PostResponse(PostBase):
    id: str
    user_id: str
    user: Optional[Dict[str, Any]] = None
    like_count: int = 0
    comment_count: int = 0
    share_count: int = 0
    created_at: datetime
    updated_at: datetime

class VideoBase(BaseModel):
    video_url: str
    thumbnail_url: Optional[str] = None
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    music_track_id: Optional[str] = None
    hashtags: List[str] = []
    visibility: Visibility = Visibility.PUBLIC

class VideoCreate(VideoBase):
    pass

class VideoResponse(VideoBase):
    id: str
    user_id: str
    user: Optional[Dict[str, Any]] = None
    like_count: int = 0
    comment_count: int = 0
    view_count: int = 0
    share_count: int = 0
    created_at: datetime

class SparkBase(BaseModel):
    type: SparkType
    media_url: str
    duration_minutes: int = Field(24, ge=1, le=1440)  # ← LIGNE CORRIGÉE
    location_id: Optional[str] = None
    emoji_3d: Optional[str] = Field(None, max_length=10)
    description: Optional[str] = Field(None, max_length=100)
    is_live: bool = False

class SparkCreate(SparkBase):
    pass

class SparkResponse(SparkBase):
    id: str
    user_id: str
    user: Optional[Dict[str, Any]] = None
    expires_at: datetime
    view_count: int = 0
    created_at: datetime

class CommentBase(BaseModel):
    content: str = Field(..., max_length=500)
    parent_id: Optional[str] = None
    audio_url: Optional[str] = None

class CommentCreate(CommentBase):
    pass

class CommentResponse(CommentBase):
    id: str
    user_id: str
    user: Optional[Dict[str, Any]] = None
    like_count: int = 0
    created_at: datetime
    replies: List['CommentResponse'] = []

CommentResponse.model_rebuild()
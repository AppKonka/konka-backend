# backend/app/models/music.py
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class TrackBase(BaseModel):
    title: str = Field(..., max_length=200)
    cover_url: Optional[str] = None
    audio_url: str
    duration: Optional[int] = None
    genre: Optional[str] = None
    lyrics: Optional[str] = None
    is_public: bool = True
    release_date: Optional[datetime] = None

class TrackCreate(TrackBase):
    pass

class TrackResponse(TrackBase):
    id: str
    artist_id: str
    artist: Optional[Dict[str, Any]] = None
    play_count: int = 0
    like_count: int = 0
    created_at: datetime

class AlbumBase(BaseModel):
    title: str = Field(..., max_length=200)
    cover_url: Optional[str] = None
    description: Optional[str] = None
    release_date: Optional[datetime] = None

class AlbumCreate(AlbumBase):
    track_ids: List[str] = []

class AlbumResponse(AlbumBase):
    id: str
    artist_id: str
    artist: Optional[Dict[str, Any]] = None
    track_count: int = 0
    created_at: datetime
    tracks: List[TrackResponse] = []

class PlaylistBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool = True
    is_collaborative: bool = False

class PlaylistCreate(PlaylistBase):
    track_ids: List[str] = []

class PlaylistResponse(PlaylistBase):
    id: str
    user_id: str
    user: Optional[Dict[str, Any]] = None
    track_count: int = 0
    created_at: datetime
    updated_at: datetime

class TrackStats(BaseModel):
    track_id: str
    title: str
    play_count: int
    like_count: int
    added_to_playlists: int
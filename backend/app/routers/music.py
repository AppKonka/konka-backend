# backend/app/routers/music.py
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime

from app.database import db
from app.models.music import TrackCreate, TrackResponse, AlbumCreate, AlbumResponse, PlaylistCreate, PlaylistResponse
from app.core.security import get_current_user, get_current_artist
from app.services.audio_service import audio_service
from app.services.ai_service import ai_service

router = APIRouter()

# ==================== TRACKS ====================

@router.get("/tracks", response_model=List[TrackResponse])
async def get_tracks(
    genre: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les morceaux"""
    try:
        query = db.table('tracks').select('*, artist:users(id, username, avatar_url)')
        
        if genre:
            query = query.eq('genre', genre)
        
        result = query.eq('is_public', True).order('play_count', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tracks/trending", response_model=List[TrackResponse])
async def get_trending_tracks(
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les morceaux tendances"""
    try:
        # Top 50 par écoutes des 7 derniers jours
        from datetime import timedelta
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        
        # Requête simplifiée - en production, utiliser une table de statistiques
        tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
            .eq('is_public', True)\
            .order('play_count', desc=True)\
            .limit(limit)\
            .execute()
        
        return tracks.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(
    track_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère un morceau spécifique"""
    try:
        track = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
            .eq('id', track_id)\
            .execute()
        
        if not track.data:
            raise HTTPException(status_code=404, detail="Track not found")
        
        # Incrémenter le compteur d'écoutes
        current_plays = track.data[0].get('play_count', 0)
        db.table('tracks').update({
            "play_count": current_plays + 1
        }).eq('id', track_id).execute()
        
        return track.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tracks", response_model=TrackResponse)
async def create_track(
    title: str = Form(...),
    genre: Optional[str] = Form(None),
    lyrics: Optional[str] = Form(None),
    is_public: bool = Form(True),
    audio: UploadFile = File(...),
    cover: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_artist)
):
    """Crée un nouveau morceau (artiste uniquement)"""
    try:
        # Traiter l'audio
        audio_path = f"tracks/{current_user['id']}/{datetime.now().timestamp()}_{audio.filename}"
        audio_content = await audio.read()
        
        result = db.storage("media").upload(audio_path, audio_content)
        audio_url = db.storage("media").get_public_url(audio_path)
        
        # Récupérer la durée du morceau
        audio_info = await audio_service.get_audio_info(audio_url)
        duration = audio_info.get('duration')
        
        # Upload de la pochette
        cover_url = None
        if cover:
            cover_path = f"covers/{current_user['id']}/{datetime.now().timestamp()}_{cover.filename}"
            cover_content = await cover.read()
            db.storage("media").upload(cover_path, cover_content)
            cover_url = db.storage("media").get_public_url(cover_path)
        
        # Créer le morceau
        track_data = {
            "artist_id": current_user['id'],
            "title": title,
            "cover_url": cover_url,
            "audio_url": audio_url,
            "duration": duration,
            "genre": genre,
            "lyrics": lyrics,
            "is_public": is_public,
            "release_date": datetime.now().isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('tracks').insert(track_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tracks/{track_id}", response_model=TrackResponse)
async def update_track(
    track_id: str,
    title: Optional[str] = None,
    genre: Optional[str] = None,
    lyrics: Optional[str] = None,
    is_public: Optional[bool] = None,
    current_user: dict = Depends(get_current_artist)
):
    """Met à jour un morceau"""
    try:
        # Vérifier que l'utilisateur est l'artiste
        track = db.table('tracks').select('artist_id').eq('id', track_id).execute()
        if not track.data or track.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        updates = {}
        if title is not None:
            updates['title'] = title
        if genre is not None:
            updates['genre'] = genre
        if lyrics is not None:
            updates['lyrics'] = lyrics
        if is_public is not None:
            updates['is_public'] = is_public
        
        if updates:
            result = db.table('tracks').update(updates).eq('id', track_id).execute()
            return result.data[0]
        
        return track.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tracks/{track_id}")
async def delete_track(
    track_id: str,
    current_user: dict = Depends(get_current_artist)
):
    """Supprime un morceau"""
    try:
        track = db.table('tracks').select('artist_id').eq('id', track_id).execute()
        if not track.data or track.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.table('tracks').delete().eq('id', track_id).execute()
        
        return {"message": "Track deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PLAYLISTS ====================

@router.get("/playlists", response_model=List[PlaylistResponse])
async def get_playlists(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les playlists"""
    try:
        playlists = db.table('playlists').select('*, user:users(id, username, avatar_url)')\
            .eq('is_public', True)\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return playlists.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/playlists/user/{user_id}", response_model=List[PlaylistResponse])
async def get_user_playlists(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère les playlists d'un utilisateur"""
    try:
        playlists = db.table('playlists').select('*, user:users(id, username, avatar_url)')\
            .eq('user_id', user_id)\
            .eq('is_public', True)\
            .order('created_at', desc=True)\
            .execute()
        
        return playlists.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(
    name: str,
    description: Optional[str] = None,
    is_public: bool = True,
    is_collaborative: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Crée une nouvelle playlist"""
    try:
        playlist_data = {
            "user_id": current_user['id'],
            "name": name,
            "description": description,
            "is_public": is_public,
            "is_collaborative": is_collaborative,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.table('playlists').insert(playlist_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère une playlist spécifique"""
    try:
        playlist = db.table('playlists').select('*, user:users(id, username, avatar_url), tracks:playlist_tracks(track:track_id(*))')\
            .eq('id', playlist_id)\
            .execute()
        
        if not playlist.data:
            raise HTTPException(status_code=404, detail="Playlist not found")
        
        return playlist.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/playlists/{playlist_id}/tracks/{track_id}")
async def add_track_to_playlist(
    playlist_id: str,
    track_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Ajoute un morceau à une playlist"""
    try:
        # Vérifier que l'utilisateur est propriétaire ou que la playlist est collaborative
        playlist = db.table('playlists').select('user_id, is_collaborative').eq('id', playlist_id).execute()
        if not playlist.data:
            raise HTTPException(status_code=404, detail="Playlist not found")
        
        if playlist.data[0]['user_id'] != current_user['id'] and not playlist.data[0]['is_collaborative']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Vérifier si déjà présent
        existing = db.table('playlist_tracks').select('id')\
            .eq('playlist_id', playlist_id)\
            .eq('track_id', track_id)\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Track already in playlist")
        
        # Ajouter le morceau
        db.table('playlist_tracks').insert({
            "playlist_id": playlist_id,
            "track_id": track_id,
            "position": 0,  # À la fin
            "added_at": datetime.now().isoformat()
        }).execute()
        
        # Mettre à jour le compteur
        track_count = db.table('playlist_tracks').select('id', count='exact').eq('playlist_id', playlist_id).execute()
        db.table('playlists').update({
            "track_count": track_count.count,
            "updated_at": datetime.now().isoformat()
        }).eq('id', playlist_id).execute()
        
        return {"message": "Track added to playlist"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/playlists/{playlist_id}/tracks/{track_id}")
async def remove_track_from_playlist(
    playlist_id: str,
    track_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime un morceau d'une playlist"""
    try:
        playlist = db.table('playlists').select('user_id').eq('id', playlist_id).execute()
        if not playlist.data or playlist.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.table('playlist_tracks').delete()\
            .eq('playlist_id', playlist_id)\
            .eq('track_id', track_id)\
            .execute()
        
        # Mettre à jour le compteur
        track_count = db.table('playlist_tracks').select('id', count='exact').eq('playlist_id', playlist_id).execute()
        db.table('playlists').update({
            "track_count": track_count.count,
            "updated_at": datetime.now().isoformat()
        }).eq('id', playlist_id).execute()
        
        return {"message": "Track removed from playlist"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RECOMMANDATIONS ====================

@router.get("/recommendations")
async def get_recommendations(
    limit: int = Query(10, ge=1, le=20),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les recommandations musicales personnalisées"""
    try:
        # Récupérer les genres favoris de l'utilisateur
        interests = db.table('user_interests').select('genre').eq('user_id', current_user['id']).execute()
        genres = [i['genre'] for i in interests.data]
        
        # Récupérer les morceaux similaires
        tracks = []
        if genres:
            tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
                .in_('genre', genres)\
                .eq('is_public', True)\
                .order('play_count', desc=True)\
                .limit(limit)\
                .execute()
        
        # Si pas assez de résultats, prendre les tendances
        if len(tracks.data) < limit:
            trending = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
                .eq('is_public', True)\
                .order('play_count', desc=True)\
                .limit(limit - len(tracks.data))\
                .execute()
            tracks.data.extend(trending.data)
        
        return {"data": tracks.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tracks/{track_id}/like")
async def like_track(
    track_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liker un morceau"""
    try:
        existing = db.table('track_likes').select('id')\
            .eq('track_id', track_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already liked")
        
        db.table('track_likes').insert({
            "track_id": track_id,
            "user_id": current_user['id'],
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Incrémenter le compteur
        track = db.table('tracks').select('like_count').eq('id', track_id).execute()
        if track.data:
            db.table('tracks').update({
                "like_count": track.data[0].get('like_count', 0) + 1
            }).eq('id', track_id).execute()
        
        return {"message": "Track liked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tracks/{track_id}/like")
async def unlike_track(
    track_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Enlever un like d'un morceau"""
    try:
        result = db.table('track_likes').delete()\
            .eq('track_id', track_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Like not found")
        
        # Décrémenter le compteur
        track = db.table('tracks').select('like_count').eq('id', track_id).execute()
        if track.data:
            db.table('tracks').update({
                "like_count": max(0, track.data[0].get('like_count', 0) - 1)
            }).eq('id', track_id).execute()
        
        return {"message": "Track unliked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
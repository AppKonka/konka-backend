# backend/app/routers/match.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import db
from app.models.match import MatchCreate, MatchResponse, ProfileResponse
from app.core.security import get_current_user
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/discover")
async def get_discover_profiles(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    gender: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    distance_km: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Récupère les profils à découvrir (algorithme de matching)"""
    try:
        user_id = current_user['id']
        
        # Construire la requête de base
        query = db.table('users').select('*')\
            .neq('id', user_id)\
            .eq('role', 'fan')\
            .eq('is_private', False)
        
        # Filtrer par genre
        if gender:
            query = query.eq('gender', gender)
        
        # Récupérer les utilisateurs déjà likés ou ignorés
        existing_matches = db.table('matches').select('user1_id, user2_id')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .execute()
        
        excluded_ids = [user_id]
        for m in existing_matches.data:
            if m['user1_id'] != user_id:
                excluded_ids.append(m['user1_id'])
            if m['user2_id'] != user_id:
                excluded_ids.append(m['user2_id'])
        
        query = query.not_.in_('id', excluded_ids)
        
        # Calculer l'âge si date_of_birth disponible
        users = query.limit(limit).execute()
        
        profiles = []
        for user in users.data:
            # Calculer l'âge
            age = None
            if user.get('date_of_birth'):
                from datetime import date
                today = date.today()
                birth = date.fromisoformat(user['date_of_birth'])
                age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            
            # Filtrer par âge
            if age_min and age and age < age_min:
                continue
            if age_max and age and age > age_max:
                continue
            
            # Compter les artistes en commun
            common_artists = await get_common_artists_count(user_id, user['id'])
            
            # Récupérer le morceau du moment
            current_track = db.table('tracks').select('*')\
                .eq('artist_id', user['id'])\
                .order('play_count', desc=True)\
                .limit(1)\
                .execute()
            
            # Calculer le score de compatibilité
            compatibility_score = await calculate_compatibility(user_id, user['id'])
            
            profiles.append({
                "id": user['id'],
                "username": user['username'],
                "display_name": user['display_name'],
                "avatar_url": user['avatar_url'],
                "age": age,
                "city": user['city'],
                "bio": user['bio'],
                "common_artists": common_artists,
                "current_track": current_track.data[0] if current_track.data else None,
                "compatibility_score": compatibility_score,
                "status": user.get('status', 'offline')
            })
        
        # Trier par score de compatibilité
        profiles.sort(key=lambda x: x['compatibility_score'], reverse=True)
        
        return {
            "data": profiles[offset:offset + limit],
            "total": len(profiles)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_common_artists_count(user1_id: str, user2_id: str) -> int:
    """Compte le nombre d'artistes en commun entre deux utilisateurs"""
    try:
        # Artistes suivis par user1
        user1_follows = db.table('follows').select('following_id')\
            .eq('follower_id', user1_id)\
            .execute()
        
        # Artistes suivis par user2
        user2_follows = db.table('follows').select('following_id')\
            .eq('follower_id', user2_id)\
            .execute()
        
        user1_artists = set(f['following_id'] for f in user1_follows.data)
        user2_artists = set(f['following_id'] for f in user2_follows.data)
        
        # Compter les artistes en commun
        return len(user1_artists & user2_artists)
        
    except Exception:
        return 0

async def calculate_compatibility(user1_id: str, user2_id: str) -> float:
    """Calcule le score de compatibilité entre deux utilisateurs"""
    try:
        score = 0
        
        # 35% - Artistes en commun
        common_artists = await get_common_artists_count(user1_id, user2_id)
        score += min(common_artists * 5, 35)  # Max 35 points
        
        # 15% - Morceaux en commun (simplifié)
        # En production, analyser les écoutes communes
        
        # 20% - Proximité géographique
        user1 = db.table('users').select('location_lat, location_lng').eq('id', user1_id).execute()
        user2 = db.table('users').select('location_lat, location_lng').eq('id', user2_id).execute()
        
        if user1.data and user2.data and user1.data[0].get('location_lat') and user2.data[0].get('location_lat'):
            from math import radians, sin, cos, sqrt, atan2
            lat1, lon1 = radians(user1.data[0]['location_lat']), radians(user1.data[0]['location_lng'])
            lat2, lon2 = radians(user2.data[0]['location_lat']), radians(user2.data[0]['location_lng'])
            
            R = 6371
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = R * c
            
            # Plus la distance est petite, plus le score est élevé
            if distance < 5:
                score += 20
            elif distance < 20:
                score += 15
            elif distance < 50:
                score += 10
            elif distance < 100:
                score += 5
        
        # 10% - Tranche d'âge
        # À implémenter avec les dates de naissance
        
        # 10% - Centres d'intérêt
        user1_interests = set()
        user2_interests = set()
        
        interests1 = db.table('user_interests').select('genre').eq('user_id', user1_id).execute()
        interests2 = db.table('user_interests').select('genre').eq('user_id', user2_id).execute()
        
        for i in interests1.data:
            user1_interests.add(i['genre'])
        for i in interests2.data:
            user2_interests.add(i['genre'])
        
        common_interests = len(user1_interests & user2_interests)
        score += min(common_interests * 2, 10)  # Max 10 points
        
        # 5% - Boost (pourrait être un facteur payant)
        
        # 5% - Réciprocité potentielle
        # À implémenter avec l'historique des likes
        
        return min(score, 100)
        
    except Exception:
        return 50.0

@router.post("/like/{user_id}")
async def like_user(
    user_id: str,
    is_super: bool = False,
    message: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Like un utilisateur (Smatcher)"""
    try:
        if user_id == current_user['id']:
            raise HTTPException(status_code=400, detail="Cannot like yourself")
        
        # Vérifier si déjà liké
        existing = db.table('matches').select('id, status')\
            .or_(f'and(user1_id.eq.{current_user["id"]},user2_id.eq.{user_id}),and(user1_id.eq.{user_id},user2_id.eq.{current_user["id"]})')\
            .execute()
        
        match_id = None
        is_match = False
        
        if existing.data:
            # Vérifier si l'autre a déjà liké
            if existing.data[0]['status'] == 'pending':
                # Match réciproque !
                db.table('matches').update({
                    "status": "matched",
                    "matched_at": datetime.now().isoformat()
                }).eq('id', existing.data[0]['id']).execute()
                match_id = existing.data[0]['id']
                is_match = True
            else:
                raise HTTPException(status_code=400, detail="Already interacted with this user")
        else:
            # Créer un nouveau match en attente
            match_id = str(uuid.uuid4())
            db.table('matches').insert({
                "id": match_id,
                "user1_id": current_user['id'],
                "user2_id": user_id,
                "status": "pending",
                "created_at": datetime.now().isoformat()
            }).execute()
        
        # Notifier l'utilisateur
        if is_match:
            await notification_service.notify_new_match(current_user['id'], user_id)
            return {"message": "It's a match!", "match_id": match_id, "is_match": True}
        else:
            return {"message": "Liked successfully", "match_id": match_id, "is_match": False}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/matches")
async def get_matches(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les matchs de l'utilisateur"""
    try:
        user_id = current_user['id']
        
        matches = db.table('matches').select('*')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .eq('status', 'matched')\
            .order('matched_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        result = []
        for match in matches.data:
            other_user_id = match['user1_id'] if match['user2_id'] == user_id else match['user2_id']
            
            other_user = db.table('users').select('id, username, display_name, avatar_url, status')\
                .eq('id', other_user_id)\
                .execute()
            
            # Récupérer le dernier message
            last_message = db.table('messages').select('content, created_at')\
                .eq('match_id', match['id'])\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            # Compter les messages non lus
            unread_count = db.table('messages').select('id', count='exact')\
                .eq('match_id', match['id'])\
                .eq('is_read', False)\
                .neq('sender_id', user_id)\
                .execute()
            
            result.append({
                "match_id": match['id'],
                "user": other_user.data[0] if other_user.data else None,
                "last_message": last_message.data[0] if last_message.data else None,
                "unread_count": unread_count.count,
                "matched_at": match['matched_at']
            })
        
        return {
            "data": result,
            "total": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/likes-received")
async def get_likes_received(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les likes reçus"""
    try:
        user_id = current_user['id']
        
        likes = db.table('matches').select('*')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .eq('status', 'pending')\
            .neq('user1_id', user_id)\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        result = []
        for like in likes.data:
            sender_id = like['user1_id'] if like['user2_id'] == user_id else like['user2_id']
            
            sender = db.table('users').select('id, username, display_name, avatar_url')\
                .eq('id', sender_id)\
                .execute()
            
            result.append({
                "match_id": like['id'],
                "user": sender.data[0] if sender.data else None,
                "created_at": like['created_at']
            })
        
        return {
            "data": result,
            "total": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/matches/{match_id}/accept")
async def accept_match(
    match_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accepte un match (répond à un like reçu)"""
    try:
        match = db.table('matches').select('*').eq('id', match_id).execute()
        if not match.data:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if current_user['id'] not in [match.data[0]['user1_id'], match.data[0]['user2_id']]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if match.data[0]['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Match already processed")
        
        # Accepter le match
        db.table('matches').update({
            "status": "matched",
            "matched_at": datetime.now().isoformat()
        }).eq('id', match_id).execute()
        
        # Notifier l'autre utilisateur
        other_user_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == current_user['id'] else match.data[0]['user2_id']
        await notification_service.notify_new_match(current_user['id'], other_user_id)
        
        return {"message": "Match accepted", "match_id": match_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/matches/{match_id}/reject")
async def reject_match(
    match_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Rejette un match (ignore un like reçu)"""
    try:
        match = db.table('matches').select('*').eq('id', match_id).execute()
        if not match.data:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if current_user['id'] not in [match.data[0]['user1_id'], match.data[0]['user2_id']]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if match.data[0]['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Match already processed")
        
        # Rejeter le match (soft delete)
        db.table('matches').update({
            "status": "rejected"
        }).eq('id', match_id).execute()
        
        return {"message": "Match rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
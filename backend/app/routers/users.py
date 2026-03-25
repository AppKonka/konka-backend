# backend/app/routers/users.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime

from app.database import db
from app.models.user import UserResponse, UserUpdate, UserWithProfile
from app.core.security import get_current_user, get_current_fan
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/me", response_model=UserWithProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Récupère le profil complet de l'utilisateur connecté"""
    try:
        user_id = current_user['id']
        
        # Récupérer l'utilisateur
        user = db.table('users').select('*').eq('id', user_id).execute()
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        result = user.data[0]
        
        # Récupérer le profil artiste si nécessaire
        if result.get('role') == 'artist':
            artist = db.table('artists').select('*').eq('user_id', user_id).execute()
            if artist.data:
                result['artist_profile'] = artist.data[0]
        
        # Récupérer le profil vendeur si nécessaire
        if result.get('role') == 'seller':
            seller = db.table('sellers').select('*').eq('user_id', user_id).execute()
            if seller.data:
                result['seller_profile'] = seller.data[0]
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/me", response_model=UserResponse)
async def update_my_profile(
    updates: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Met à jour le profil de l'utilisateur connecté"""
    try:
        user_id = current_user['id']
        
        # Mettre à jour
        result = db.table('users').update(updates.dict(exclude_unset=True)).eq('id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_profile(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère le profil public d'un utilisateur"""
    try:
        user = db.table('users').select('*').eq('id', user_id).execute()
        
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user.data[0]
        
        # Vérifier si le profil est privé
        if user_data.get('is_private') and user_data['id'] != current_user['id']:
            # Vérifier si l'utilisateur est abonné
            is_following = db.table('follows').select('id').eq('follower_id', current_user['id']).eq('following_id', user_id).execute()
            if not is_following.data:
                # Profil privé, masquer certaines informations
                user_data = {k: v for k, v in user_data.items() if k in ['id', 'username', 'display_name', 'avatar_url', 'is_private']}
        
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/followers")
async def get_followers(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère la liste des abonnés d'un utilisateur"""
    try:
        followers = db.table('follows')\
            .select('follower_id, users!follows_follower_id_fkey(id, username, avatar_url)')\
            .eq('following_id', user_id)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {
            "data": [f['users'] for f in followers.data],
            "count": len(followers.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/following")
async def get_following(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère la liste des abonnements d'un utilisateur"""
    try:
        following = db.table('follows')\
            .select('following_id, users!follows_following_id_fkey(id, username, avatar_url)')\
            .eq('follower_id', user_id)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {
            "data": [f['users'] for f in following.data],
            "count": len(following.data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{user_id}/follow")
async def follow_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """S'abonne à un utilisateur"""
    try:
        if user_id == current_user['id']:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
        
        # Vérifier si déjà abonné
        existing = db.table('follows').select('id').eq('follower_id', current_user['id']).eq('following_id', user_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Already following")
        
        # Créer l'abonnement
        result = db.table('follows').insert({
            "follower_id": current_user['id'],
            "following_id": user_id,
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Notifier l'utilisateur
        await notification_service.notify_new_follower(user_id, current_user['id'])
        
        return {"message": "Successfully followed user"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{user_id}/follow")
async def unfollow_user(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Se désabonne d'un utilisateur"""
    try:
        result = db.table('follows').delete()\
            .eq('follower_id', current_user['id'])\
            .eq('following_id', user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Not following")
        
        return {"message": "Successfully unfollowed user"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/me/stats")
async def get_my_stats(current_user: dict = Depends(get_current_user)):
    """Récupère les statistiques de l'utilisateur connecté"""
    try:
        user_id = current_user['id']
        
        # Nombre d'abonnés
        followers_count = db.table('follows').select('id', count='exact').eq('following_id', user_id).execute()
        
        # Nombre d'abonnements
        following_count = db.table('follows').select('id', count='exact').eq('follower_id', user_id).execute()
        
        # Nombre de matchs
        matches_count = db.table('matches').select('id', count='exact')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .eq('status', 'matched')\
            .execute()
        
        # Nombre de posts
        posts_count = db.table('posts').select('id', count='exact').eq('user_id', user_id).execute()
        
        # Nombre de likes reçus
        likes_received = db.table('likes').select('id', count='exact')\
            .in_('post_id', db.table('posts').select('id').eq('user_id', user_id))\
            .execute()
        
        return {
            "followers": followers_count.count,
            "following": following_count.count,
            "matches": matches_count.count,
            "posts": posts_count.count,
            "likes_received": likes_received.count,
            "xp_points": current_user.get('xp_points', 0),
            "reputation_score": current_user.get('reputation_score', 0)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Recherche des utilisateurs"""
    try:
        users = db.table('users')\
            .select('id, username, display_name, avatar_url, role')\
            .or_(f'username.ilike.%{q}%,display_name.ilike.%{q}%')\
            .limit(limit)\
            .execute()
        
        return {"data": users.data, "count": len(users.data)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
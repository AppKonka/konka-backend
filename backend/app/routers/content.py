# backend/app/routers/content.py
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime

from app.database import db
from app.models.content import PostCreate, PostResponse, VideoCreate, VideoResponse, SparkCreate, SparkResponse
from app.core.security import get_current_user
from app.services.video_service import video_service
from app.services.audio_service import audio_service
from app.services.ai_service import ai_service

router = APIRouter()

# ==================== POSTS ====================

@router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    feed_type: str = Query("all", regex="^(all|following|matches)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les posts (feed)"""
    try:
        query = db.table('posts').select('*, user:users(id, username, avatar_url)')
        
        if feed_type == "following":
            # Récupérer les utilisateurs suivis
            following = db.table('follows').select('following_id').eq('follower_id', current_user['id']).execute()
            following_ids = [f['following_id'] for f in following.data] + [current_user['id']]
            query = query.in_('user_id', following_ids)
        
        elif feed_type == "matches":
            # Récupérer les matchs
            matches = db.table('matches').select('user1_id, user2_id')\
                .or_(f'user1_id.eq.{current_user["id"]},user2_id.eq.{current_user["id"]}')\
                .eq('status', 'matched')\
                .execute()
            
            match_ids = []
            for m in matches.data:
                if m['user1_id'] != current_user['id']:
                    match_ids.append(m['user1_id'])
                if m['user2_id'] != current_user['id']:
                    match_ids.append(m['user2_id'])
            
            query = query.in_('user_id', match_ids)
        
        # Filtrer par visibilité
        query = query.or_(f'visibility.eq.public, and(visibility.eq.friends, user_id.in.({",".join(match_ids) if feed_type == "matches" else "''"})), user_id.eq.{current_user["id"]}')
        
        result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/posts", response_model=PostResponse)
async def create_post(
    type: str = Form(...),
    caption: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    music_track_id: Optional[str] = Form(None),
    visibility: str = Form("public"),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Crée un nouveau post (image ou audio)"""
    try:
        media_urls = []
        
        for file in files:
            # Upload du fichier
            file_path = f"posts/{current_user['id']}/{datetime.now().timestamp()}_{file.filename}"
            file_content = await file.read()
            
            result = db.storage("media").upload(file_path, file_content)
            public_url = db.storage("media").get_public_url(file_path)
            media_urls.append(public_url)
        
        # Créer le post
        post_data = {
            "user_id": current_user['id'],
            "type": type,
            "media_urls": media_urls,
            "caption": caption,
            "location": location,
            "music_track_id": music_track_id,
            "visibility": visibility,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('posts').insert(post_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère un post spécifique"""
    try:
        post = db.table('posts').select('*, user:users(id, username, avatar_url)')\
            .eq('id', post_id)\
            .execute()
        
        if not post.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return post.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime un post"""
    try:
        # Vérifier que l'utilisateur est l'auteur
        post = db.table('posts').select('user_id').eq('id', post_id).execute()
        if not post.data or post.data[0]['user_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        result = db.table('posts').delete().eq('id', post_id).execute()
        
        return {"message": "Post deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/posts/{post_id}/like")
async def like_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liker un post"""
    try:
        # Vérifier si déjà liké
        existing = db.table('likes').select('id')\
            .eq('post_id', post_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already liked")
        
        # Ajouter le like
        db.table('likes').insert({
            "post_id": post_id,
            "user_id": current_user['id'],
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Incrémenter le compteur
        db.table('posts').update({
            "like_count": db.table('posts').select('like_count').eq('id', post_id).execute().data[0]['like_count'] + 1
        }).eq('id', post_id).execute()
        
        return {"message": "Post liked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{post_id}/like")
async def unlike_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Enlever un like d'un post"""
    try:
        result = db.table('likes').delete()\
            .eq('post_id', post_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Like not found")
        
        # Décrémenter le compteur
        current_likes = db.table('posts').select('like_count').eq('id', post_id).execute().data[0]['like_count']
        db.table('posts').update({
            "like_count": current_likes - 1
        }).eq('id', post_id).execute()
        
        return {"message": "Post unliked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VIDEOS ====================

@router.get("/videos", response_model=List[VideoResponse])
async def get_videos(
    category: str = Query("all", regex="^(all|following|artists|challenges)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les vidéos (feed)"""
    try:
        query = db.table('videos').select('*, user:users(id, username, avatar_url), music:music_track_id(*)')
        
        if category == "following":
            following = db.table('follows').select('following_id').eq('follower_id', current_user['id']).execute()
            following_ids = [f['following_id'] for f in following.data] + [current_user['id']]
            query = query.in_('user_id', following_ids)
        
        elif category == "artists":
            artists = db.table('users').select('id').eq('role', 'artist').execute()
            artist_ids = [a['id'] for a in artists.data]
            query = query.in_('user_id', artist_ids)
        
        result = query.eq('visibility', 'public').order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/videos", response_model=VideoResponse)
async def create_video(
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    hashtags: str = Form(""),
    visibility: str = Form("public"),
    music_track_id: Optional[str] = Form(None),
    video: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    """Crée une nouvelle vidéo"""
    try:
        # Upload de la vidéo
        video_path = f"videos/{current_user['id']}/{datetime.now().timestamp()}_{video.filename}"
        video_content = await video.read()
        
        result = db.storage("media").upload(video_path, video_content)
        video_url = db.storage("media").get_public_url(video_path)
        
        # Générer une miniature si non fournie
        thumbnail_url = None
        if thumbnail:
            thumbnail_path = f"thumbnails/{current_user['id']}/{datetime.now().timestamp()}_{thumbnail.filename}"
            thumbnail_content = await thumbnail.read()
            db.storage("media").upload(thumbnail_path, thumbnail_content)
            thumbnail_url = db.storage("media").get_public_url(thumbnail_path)
        else:
            # Générer une miniature automatiquement
            thumbnail_url = await video_service.generate_thumbnail(video_url)
        
        # Créer la vidéo
        video_data = {
            "user_id": current_user['id'],
            "video_url": video_url,
            "thumbnail_url": thumbnail_url,
            "title": title,
            "description": description,
            "hashtags": hashtags.split(',') if hashtags else [],
            "music_track_id": music_track_id,
            "visibility": visibility,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('videos').insert(video_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère une vidéo spécifique"""
    try:
        video = db.table('videos').select('*, user:users(id, username, avatar_url), music:music_track_id(*)')\
            .eq('id', video_id)\
            .execute()
        
        if not video.data:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Incrémenter le compteur de vues
        current_views = video.data[0].get('view_count', 0)
        db.table('videos').update({
            "view_count": current_views + 1
        }).eq('id', video_id).execute()
        
        return video.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SPARKS (STORIES) ====================

@router.get("/sparks")
async def get_sparks(
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les sparks (stories) des utilisateurs suivis"""
    try:
        # Récupérer les utilisateurs suivis
        following = db.table('follows').select('following_id').eq('follower_id', current_user['id']).execute()
        following_ids = [f['following_id'] for f in following.data]
        
        # Récupérer les sparks non expirés
        sparks = db.table('sparks').select('*, user:users(id, username, avatar_url)')\
            .in_('user_id', following_ids)\
            .gt('expires_at', datetime.now().isoformat())\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        return {"data": sparks.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sparks", response_model=SparkResponse)
async def create_spark(
    type: str = Form(...),
    duration_minutes: int = Form(24),
    description: Optional[str] = Form(None),
    emoji_3d: Optional[str] = Form(None),
    is_live: bool = Form(False),
    media: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Crée un nouveau spark (story)"""
    try:
        # Upload du média
        media_path = f"sparks/{current_user['id']}/{datetime.now().timestamp()}_{media.filename}"
        media_content = await media.read()
        
        result = db.storage("media").upload(media_path, media_content)
        media_url = db.storage("media").get_public_url(media_path)
        
        # Calculer la date d'expiration
        expires_at = datetime.now()
        from datetime import timedelta
        expires_at += timedelta(minutes=duration_minutes)
        
        # Créer le spark
        spark_data = {
            "user_id": current_user['id'],
            "type": type,
            "media_url": media_url,
            "duration_minutes": duration_minutes,
            "expires_at": expires_at.isoformat(),
            "description": description,
            "emoji_3d": emoji_3d,
            "is_live": is_live,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('sparks').insert(spark_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sparks/{spark_id}")
async def view_spark(
    spark_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marque un spark comme vu"""
    try:
        # Incrémenter le compteur de vues
        spark = db.table('sparks').select('view_count').eq('id', spark_id).execute()
        if spark.data:
            current_views = spark.data[0].get('view_count', 0)
            db.table('sparks').update({
                "view_count": current_views + 1
            }).eq('id', spark_id).execute()
        
        return {"message": "Spark viewed"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMMENTAIRES ====================

@router.get("/posts/{post_id}/comments")
async def get_comments(
    post_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les commentaires d'un post"""
    try:
        comments = db.table('comments').select('*, user:users(id, username, avatar_url)')\
            .eq('post_id', post_id)\
            .is_('parent_id', None)\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Récupérer les réponses pour chaque commentaire
        for comment in comments.data:
            replies = db.table('comments').select('*, user:users(id, username, avatar_url)')\
                .eq('parent_id', comment['id'])\
                .order('created_at', asc=True)\
                .execute()
            comment['replies'] = replies.data
        
        return {"data": comments.data, "count": len(comments.data)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    content: str,
    parent_id: Optional[str] = None,
    audio_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Crée un commentaire sur un post"""
    try:
        comment_data = {
            "post_id": post_id,
            "user_id": current_user['id'],
            "content": content,
            "parent_id": parent_id,
            "audio_url": audio_url,
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('comments').insert(comment_data).execute()
        
        # Incrémenter le compteur de commentaires du post
        post = db.table('posts').select('comment_count').eq('id', post_id).execute()
        if post.data:
            db.table('posts').update({
                "comment_count": post.data[0].get('comment_count', 0) + 1
            }).eq('id', post_id).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/comments/{comment_id}/like")
async def like_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Liker un commentaire"""
    try:
        existing = db.table('comment_likes').select('id')\
            .eq('comment_id', comment_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already liked")
        
        db.table('comment_likes').insert({
            "comment_id": comment_id,
            "user_id": current_user['id'],
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Incrémenter le compteur
        comment = db.table('comments').select('like_count').eq('id', comment_id).execute()
        if comment.data:
            db.table('comments').update({
                "like_count": comment.data[0].get('like_count', 0) + 1
            }).eq('id', comment_id).execute()
        
        return {"message": "Comment liked"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# backend/app/routers/artist.py
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime

from app.database import db
from app.models.artist import ArtistStats, DedicationRequest, DedicationResponse
from app.core.security import get_current_artist
from app.services.ai_service import ai_service

router = APIRouter()

@router.get("/dashboard/stats")
async def get_artist_stats(
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_artist)
):
    """Récupère les statistiques de l'artiste"""
    try:
        user_id = current_user['id']
        
        # Récupérer les morceaux
        tracks = db.table('tracks').select('*').eq('artist_id', user_id).execute()
        
        # Calculer les écoutes totales
        total_plays = sum(t.get('play_count', 0) for t in tracks.data)
        
        # Récupérer les abonnés
        followers_count = db.table('follows').select('id', count='exact').eq('following_id', user_id).execute()
        
        # Récupérer les dédicaces
        dedications = db.table('dedications').select('*').eq('artist_id', user_id).execute()
        pending_dedications = [d for d in dedications.data if d['status'] == 'pending']
        completed_dedications = [d for d in dedications.data if d['status'] == 'completed']
        dedication_revenue = sum(d.get('price', 0) for d in completed_dedications)
        
        # Récupérer les lives
        lives = db.table('lives').select('*').eq('host_id', user_id).execute()
        total_live_views = sum(l.get('viewer_count', 0) for l in lives.data)
        live_revenue = sum(l.get('revenue', 0) for l in lives.data if l.get('type') == 'paid')
        
        # Récupérer les ventes de produits (si artiste est aussi vendeur)
        products = db.table('products').select('*').eq('seller_id', user_id).execute()
        sales = 0
        for product in products.data:
            order_items = db.table('order_items').select('*').eq('product_id', product['id']).execute()
            sales += sum(oi.get('quantity', 0) * oi.get('price_at_time', 0) for oi in order_items.data)
        
        # Top 5 des morceaux
        top_tracks = sorted(tracks.data, key=lambda x: x.get('play_count', 0), reverse=True)[:5]
        
        return {
            "total_plays": total_plays,
            "followers": followers_count.count,
            "tracks_count": len(tracks.data),
            "pending_dedications": len(pending_dedications),
            "completed_dedications": len(completed_dedications),
            "dedication_revenue": dedication_revenue,
            "total_live_views": total_live_views,
            "live_revenue": live_revenue,
            "sales_revenue": sales,
            "total_revenue": dedication_revenue + live_revenue + sales,
            "top_tracks": top_tracks,
            "last_7_days": {
                "plays": 0,  # À calculer avec historique
                "new_followers": 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dedications", response_model=List[DedicationResponse])
async def get_dedication_requests(
    status: Optional[str] = Query(None, regex="^(pending|accepted|completed|rejected)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_artist)
):
    """Récupère les demandes de dédicace de l'artiste"""
    try:
        query = db.table('dedications').select('*, fan:users!dedications_fan_id_fkey(id, username, avatar_url)')\
            .eq('artist_id', current_user['id'])
        
        if status:
            query = query.eq('status', status)
        
        result = query.order('requested_at', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/dedications/{dedication_id}/accept")
async def accept_dedication(
    dedication_id: str,
    current_user: dict = Depends(get_current_artist)
):
    """Accepte une demande de dédicace"""
    try:
        dedication = db.table('dedications').select('artist_id, fan_id')\
            .eq('id', dedication_id)\
            .execute()
        
        if not dedication.data or dedication.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.table('dedications').update({
            "status": "accepted",
            "accepted_at": datetime.now().isoformat()
        }).eq('id', dedication_id).execute()
        
        # Notifier le fan
        await notification_service.create_notification(
            user_id=dedication.data[0]['fan_id'],
            notification_type="dedication_accepted",
            title="Dédicace acceptée",
            content=f"Votre demande de dédicace a été acceptée",
            data={"dedication_id": dedication_id}
        )
        
        return {"message": "Dedication accepted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/dedications/{dedication_id}/reject")
async def reject_dedication(
    dedication_id: str,
    current_user: dict = Depends(get_current_artist)
):
    """Refuse une demande de dédicace"""
    try:
        dedication = db.table('dedications').select('artist_id, fan_id')\
            .eq('id', dedication_id)\
            .execute()
        
        if not dedication.data or dedication.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.table('dedications').update({
            "status": "rejected",
            "rejected_at": datetime.now().isoformat()
        }).eq('id', dedication_id).execute()
        
        # Notifier le fan
        await notification_service.create_notification(
            user_id=dedication.data[0]['fan_id'],
            notification_type="dedication_rejected",
            title="Dédicace refusée",
            content=f"Votre demande de dédicace a été refusée",
            data={"dedication_id": dedication_id}
        )
        
        return {"message": "Dedication rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dedications/{dedication_id}/complete")
async def complete_dedication(
    dedication_id: str,
    video: UploadFile = File(...),
    current_user: dict = Depends(get_current_artist)
):
    """Livrer une dédicace (upload vidéo)"""
    try:
        dedication = db.table('dedications').select('artist_id, fan_id')\
            .eq('id', dedication_id)\
            .execute()
        
        if not dedication.data or dedication.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if dedication.data[0]['status'] != 'accepted':
            raise HTTPException(status_code=400, detail="Dedication not accepted")
        
        # Upload de la vidéo
        video_path = f"dedications/{current_user['id']}/{datetime.now().timestamp()}_{video.filename}"
        video_content = await video.read()
        
        db.storage("media").upload(video_path, video_content)
        video_url = db.storage("media").get_public_url(video_path)
        
        # Mettre à jour la dédicace
        db.table('dedications').update({
            "status": "completed",
            "video_url": video_url,
            "completed_at": datetime.now().isoformat()
        }).eq('id', dedication_id).execute()
        
        # Notifier le fan
        await notification_service.create_notification(
            user_id=dedication.data[0]['fan_id'],
            notification_type="dedication_completed",
            title="Votre dédicace est prête !",
            content=f"Votre dédicace est disponible",
            data={"dedication_id": dedication_id}
        )
        
        return {"message": "Dedication delivered", "video_url": video_url}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
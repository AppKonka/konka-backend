# backend/app/routers/notifications.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime

from app.database import db
from app.core.security import get_current_user
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/")
async def get_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Récupère les notifications de l'utilisateur"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user['id'],
            limit=limit,
            offset=offset,
            unread_only=unread_only
        )
        
        return {
            "data": notifications,
            "total": len(notifications),
            "unread_count": len([n for n in notifications if not n.get('is_read')])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Récupère le nombre de notifications non lues"""
    try:
        notifications = await notification_service.get_user_notifications(
            user_id=current_user['id'],
            limit=1000,
            unread_only=True
        )
        
        return {"unread_count": len(notifications)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Marque une notification comme lue"""
    try:
        success = await notification_service.mark_as_read(notification_id, current_user['id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/read-all")
async def mark_all_as_read(
    current_user: dict = Depends(get_current_user)
):
    """Marque toutes les notifications comme lues"""
    try:
        count = await notification_service.mark_all_as_read(current_user['id'])
        
        return {"message": f"{count} notifications marked as read"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime une notification"""
    try:
        success = await notification_service.delete_notification(notification_id, current_user['id'])
        
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def send_test_notification(
    current_user: dict = Depends(get_current_user)
):
    """Envoie une notification de test"""
    try:
        await notification_service.create_notification(
            user_id=current_user['id'],
            notification_type="test",
            title="Notification de test",
            content="Ceci est une notification de test pour KONKA",
            data={"test": True}
        )
        
        return {"message": "Test notification sent"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Types de notifications prédéfinis
@router.get("/types")
async def get_notification_types():
    """Récupère les types de notifications disponibles"""
    return {
        "types": [
            {"id": "new_match", "label": "Nouveau match", "icon": "💘"},
            {"id": "new_message", "label": "Nouveau message", "icon": "💬"},
            {"id": "new_follower", "label": "Nouvel abonné", "icon": "👥"},
            {"id": "new_like", "label": "Nouveau like", "icon": "❤️"},
            {"id": "new_comment", "label": "Nouveau commentaire", "icon": "💭"},
            {"id": "dedication_request", "label": "Demande de dédicace", "icon": "🎬"},
            {"id": "dedication_completed", "label": "Dédicace livrée", "icon": "✅"},
            {"id": "live_started", "label": "Live commencé", "icon": "🔴"},
            {"id": "order_update", "label": "Mise à jour commande", "icon": "📦"},
            {"id": "chill_join_request", "label": "Demande de sortie", "icon": "🌴"},
            {"id": "chill_approved", "label": "Sortie acceptée", "icon": "✅"},
            {"id": "product_back_in_stock", "label": "Produit réapprovisionné", "icon": "🔄"},
            {"id": "price_drop", "label": "Baisse de prix", "icon": "💰"},
            {"id": "artist_new_track", "label": "Nouveau morceau", "icon": "🎵"},
            {"id": "artist_new_live", "label": "Nouveau live", "icon": "📺"},
            {"id": "promotion", "label": "Promotion", "icon": "🎁"},
            {"id": "system", "label": "Système", "icon": "⚙️"},
            {"id": "test", "label": "Test", "icon": "🧪"}
        ]
    }
# backend/app/routers/chill.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import db
from app.models.chill import ChillEventCreate, ChillEventResponse, ChillParticipantResponse
from app.core.security import get_current_user
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/events", response_model=List[ChillEventResponse])
async def get_chill_events(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    distance_km: int = Query(50, ge=1, le=500),
    event_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les événements Chill (sorties)"""
    try:
        query = db.table('chill_events').select('*, organizer:users(id, username, avatar_url)')\
            .eq('status', 'active')\
            .gte('event_date', datetime.now().isoformat())
        
        if event_type:
            query = query.eq('type', event_type)
        
        if date_from:
            query = query.gte('event_date', date_from)
        
        if date_to:
            query = query.lte('event_date', date_to)
        
        result = query.order('event_date', asc=True).range(offset, offset + limit - 1).execute()
        
        events = []
        for event in result.data:
            # Récupérer les participants
            participants = db.table('chill_participants').select('user_id, status, user:users(id, username, avatar_url)')\
                .eq('event_id', event['id'])\
                .execute()
            
            approved_participants = [p for p in participants.data if p['status'] == 'approved']
            
            events.append({
                **event,
                "participants": approved_participants,
                "participant_count": len(approved_participants)
            })
        
        # Filtrer par distance si coordonnées fournies
        if latitude and longitude:
            from math import radians, sin, cos, sqrt, atan2
            filtered_events = []
            for event in events:
                if event.get('location_lat') and event.get('location_lng'):
                    lat1, lon1 = radians(latitude), radians(longitude)
                    lat2, lon2 = radians(event['location_lat']), radians(event['location_lng'])
                    
                    dlat = lat2 - lat1
                    dlon = lon2 - lon1
                    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
                    c = 2 * atan2(sqrt(a), sqrt(1-a))
                    distance = 6371 * c
                    
                    if distance <= distance_km:
                        event['distance'] = round(distance, 1)
                        filtered_events.append(event)
            events = filtered_events
        
        return events
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events", response_model=ChillEventResponse)
async def create_chill_event(
    event: ChillEventCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crée un nouvel événement Chill"""
    try:
        event_data = {
            "id": str(uuid.uuid4()),
            "organizer_id": current_user['id'],
            "name": event.name,
            "description": event.description,
            "location_name": event.location_name,
            "location_lat": event.location_lat,
            "location_lng": event.location_lng,
            "event_date": event.event_date,
            "age_min": event.age_min,
            "age_max": event.age_max,
            "participant_limit": event.participant_limit,
            "fee": event.fee,
            "dress_code": event.dress_code,
            "tags": event.tags,
            "status": "active",
            "created_at": datetime.now().isoformat()
        }
        
        result = db.table('chill_events').insert(event_data).execute()
        
        # L'organisateur participe automatiquement
        db.table('chill_participants').insert({
            "event_id": result.data[0]['id'],
            "user_id": current_user['id'],
            "status": "approved",
            "joined_at": datetime.now().isoformat()
        }).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/events/{event_id}", response_model=ChillEventResponse)
async def get_chill_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère un événement Chill spécifique"""
    try:
        event = db.table('chill_events').select('*, organizer:users(id, username, avatar_url)')\
            .eq('id', event_id)\
            .execute()
        
        if not event.data:
            raise HTTPException(status_code=404, detail="Event not found")
        
        # Récupérer les participants
        participants = db.table('chill_participants').select('*, user:users(id, username, avatar_url)')\
            .eq('event_id', event_id)\
            .execute()
        
        return {
            **event.data[0],
            "participants": participants.data,
            "participant_count": len(participants.data)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/events/{event_id}/join")
async def join_chill_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Rejoindre un événement Chill"""
    try:
        # Vérifier l'événement
        event = db.table('chill_events').select('*').eq('id', event_id).execute()
        if not event.data:
            raise HTTPException(status_code=404, detail="Event not found")
        
        if event.data[0]['status'] != 'active':
            raise HTTPException(status_code=400, detail="Event is not active")
        
        if event.data[0]['event_date'] < datetime.now().isoformat():
            raise HTTPException(status_code=400, detail="Event has already passed")
        
        # Vérifier si déjà participant
        existing = db.table('chill_participants').select('id')\
            .eq('event_id', event_id)\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already joined")
        
        # Vérifier la limite de participants
        participants = db.table('chill_participants').select('id', count='exact')\
            .eq('event_id', event_id)\
            .eq('status', 'approved')\
            .execute()
        
        if event.data[0]['participant_limit'] and participants.count >= event.data[0]['participant_limit']:
            raise HTTPException(status_code=400, detail="Event is full")
        
        # Ajouter le participant
        db.table('chill_participants').insert({
            "event_id": event_id,
            "user_id": current_user['id'],
            "status": "pending",
            "joined_at": datetime.now().isoformat()
        }).execute()
        
        # Notifier l'organisateur
        await notification_service.create_notification(
            user_id=event.data[0]['organizer_id'],
            notification_type="chill_join_request",
            title="Nouvelle demande de participation",
            content=f"{current_user['username']} veut rejoindre votre sortie",
            data={"event_id": event_id, "user_id": current_user['id']}
        )
        
        return {"message": "Join request sent"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/events/{event_id}/participants/{participant_id}")
async def update_participant_status(
    event_id: str,
    participant_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Accepte ou refuse un participant (organisateur uniquement)"""
    try:
        # Vérifier que l'utilisateur est l'organisateur
        event = db.table('chill_events').select('organizer_id').eq('id', event_id).execute()
        if not event.data or event.data[0]['organizer_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Mettre à jour le statut
        db.table('chill_participants').update({
            "status": status
        }).eq('id', participant_id).eq('event_id', event_id).execute()
        
        # Récupérer le participant pour la notification
        participant = db.table('chill_participants').select('user_id').eq('id', participant_id).execute()
        if participant.data and status == 'approved':
            await notification_service.create_notification(
                user_id=participant.data[0]['user_id'],
                notification_type="chill_approved",
                title="Demande acceptée",
                content=f"Votre demande pour rejoindre la sortie a été acceptée",
                data={"event_id": event_id}
            )
        
        return {"message": f"Participant {status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_users(
    status: str = Query(..., regex="^(now|today|weekend)$"),
    type: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les utilisateurs disponibles pour Chill"""
    try:
        # Récupérer les utilisateurs qui se sont signalés disponibles
        query = db.table('users').select('id, username, display_name, avatar_url, bio, city, status, chill_status')\
            .neq('id', current_user['id'])\
            .eq('chill_available', True)
        
        if type:
            query = query.eq('chill_type', type)
        
        # Filtrer par âge
        users = query.limit(limit).execute()
        
        result = []
        for user in users.data:
            age = None
            if user.get('date_of_birth'):
                from datetime import date
                today = date.today()
                birth = date.fromisoformat(user['date_of_birth'])
                age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
            
            if age_min and age and age < age_min:
                continue
            if age_max and age and age > age_max:
                continue
            
            result.append({
                "id": user['id'],
                "username": user['username'],
                "display_name": user['display_name'],
                "avatar_url": user['avatar_url'],
                "bio": user['bio'],
                "city": user['city'],
                "age": age,
                "status": user.get('status', 'offline'),
                "chill_status": user.get('chill_status', 'available'),
                "chill_type": user.get('chill_type')
            })
        
        return {
            "data": result,
            "total": len(result)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/available")
async def set_available(
    status: str,
    chill_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Signale l'utilisateur comme disponible pour Chill"""
    try:
        db.table('users').update({
            "chill_available": True,
            "chill_status": status,
            "chill_type": chill_type,
            "chill_updated_at": datetime.now().isoformat()
        }).eq('id', current_user['id']).execute()
        
        return {"message": "Status updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/available")
async def set_unavailable(
    current_user: dict = Depends(get_current_user)
):
    """Marque l'utilisateur comme indisponible"""
    try:
        db.table('users').update({
            "chill_available": False,
            "chill_status": None,
            "chill_type": None
        }).eq('id', current_user['id']).execute()
        
        return {"message": "Status updated"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
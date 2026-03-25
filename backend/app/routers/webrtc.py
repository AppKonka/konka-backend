# backend/app/routers/webrtc.py
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from app.services.webrtc_service import webrtc_manager
from app.core.security import get_current_user

router = APIRouter()

class StartCallRequest(BaseModel):
    callee_id: str
    call_type: str  # audio or video

class OfferRequest(BaseModel):
    call_id: str
    offer: dict

class AnswerRequest(BaseModel):
    call_id: str
    answer: dict

class IceCandidateRequest(BaseModel):
    call_id: str
    candidate: dict

class MuteRequest(BaseModel):
    call_id: str
    is_muted: bool

class VideoRequest(BaseModel):
    call_id: str
    is_video_on: bool

@router.post("/calls/start")
async def start_call(
    request: StartCallRequest,
    current_user: dict = Depends(get_current_user)
):
    """Démarre un appel"""
    try:
        # Vérifier si l'utilisateur est déjà en appel
        if webrtc_manager.is_in_call(current_user['id']):
            raise HTTPException(status_code=400, detail="Already in a call")
        
        # Vérifier si le destinataire est disponible
        if webrtc_manager.is_in_call(request.callee_id):
            raise HTTPException(status_code=400, detail="Callee is already in a call")
        
        call_id = await webrtc_manager.create_call(
            caller_id=current_user['id'],
            callee_id=request.callee_id,
            call_type=request.call_type
        )
        
        return {"call_id": call_id, "status": "initiated"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/{call_id}/accept")
async def accept_call(
    call_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accepte un appel entrant"""
    try:
        success = await webrtc_manager.accept_call(call_id, current_user['id'])
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "accepted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/{call_id}/reject")
async def reject_call(
    call_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Rejette un appel entrant"""
    try:
        success = await webrtc_manager.reject_call(call_id, current_user['id'])
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "rejected"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/{call_id}/end")
async def end_call(
    call_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Termine un appel"""
    try:
        await webrtc_manager.end_call(call_id)
        return {"status": "ended"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/offer")
async def set_offer(
    request: OfferRequest,
    current_user: dict = Depends(get_current_user)
):
    """Définit l'offre SDP"""
    try:
        success = await webrtc_manager.set_offer(
            request.call_id,
            current_user['id'],
            request.offer
        )
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "offer_set"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/answer")
async def set_answer(
    request: AnswerRequest,
    current_user: dict = Depends(get_current_user)
):
    """Définit la réponse SDP"""
    try:
        success = await webrtc_manager.set_answer(
            request.call_id,
            current_user['id'],
            request.answer
        )
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "answer_set"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/ice")
async def add_ice_candidate(
    request: IceCandidateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Ajoute un candidat ICE"""
    try:
        success = await webrtc_manager.add_ice_candidate(
            request.call_id,
            current_user['id'],
            request.candidate
        )
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "candidate_added"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/mute")
async def toggle_mute(
    request: MuteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Active/désactive le microphone"""
    try:
        success = await webrtc_manager.toggle_mute(
            request.call_id,
            current_user['id'],
            request.is_muted
        )
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "mute_toggled", "is_muted": request.is_muted}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calls/video")
async def toggle_video(
    request: VideoRequest,
    current_user: dict = Depends(get_current_user)
):
    """Active/désactive la caméra"""
    try:
        success = await webrtc_manager.toggle_video(
            request.call_id,
            current_user['id'],
            request.is_video_on
        )
        if not success:
            raise HTTPException(status_code=404, detail="Call not found")
        
        return {"status": "video_toggled", "is_video_on": request.is_video_on}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/calls/active")
async def get_active_call(
    current_user: dict = Depends(get_current_user)
):
    """Récupère l'appel actif de l'utilisateur"""
    try:
        call = webrtc_manager.get_active_call(current_user['id'])
        if call:
            return {
                "call_id": call["call_id"],
                "status": call["status"],
                "type": call["type"],
                "other_user_id": call["callee_id"] if call["caller_id"] == current_user['id'] else call["caller_id"]
            }
        return {"call_id": None}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
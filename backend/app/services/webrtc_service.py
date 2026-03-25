# backend/app/services/webrtc_service.py
import json
import logging
from typing import Dict, Optional
from datetime import datetime
from fastapi import WebSocket
from app.services.websocket_service import ws_manager

logger = logging.getLogger(__name__)

class WebRTCManager:
    """Gestionnaire d'appels WebRTC"""
    
    def __init__(self):
        self.active_calls: Dict[str, Dict] = {}  # call_id -> call info
        self.user_call: Dict[str, str] = {}  # user_id -> call_id
    
    async def create_call(
        self,
        caller_id: str,
        callee_id: str,
        call_type: str  # audio or video
    ) -> str:
        """Crée un nouvel appel"""
        call_id = f"call_{caller_id}_{callee_id}_{datetime.now().timestamp()}"
        
        self.active_calls[call_id] = {
            "call_id": call_id,
            "caller_id": caller_id,
            "callee_id": callee_id,
            "type": call_type,
            "status": "initiating",
            "created_at": datetime.now().isoformat(),
            "offer": None,
            "answer": None,
            "ice_candidates": []
        }
        
        self.user_call[caller_id] = call_id
        self.user_call[callee_id] = call_id
        
        # Notifier le callee
        await ws_manager.send_personal(callee_id, {
            "type": "incoming_call",
            "data": {
                "call_id": call_id,
                "caller_id": caller_id,
                "type": call_type
            }
        })
        
        return call_id
    
    async def accept_call(self, call_id: str, user_id: str) -> bool:
        """Accepte un appel entrant"""
        call = self.active_calls.get(call_id)
        if not call or call["callee_id"] != user_id:
            return False
        
        call["status"] = "connecting"
        
        # Notifier le caller
        await ws_manager.send_personal(call["caller_id"], {
            "type": "call_accepted",
            "data": {
                "call_id": call_id
            }
        })
        
        return True
    
    async def reject_call(self, call_id: str, user_id: str) -> bool:
        """Rejette un appel entrant"""
        call = self.active_calls.get(call_id)
        if not call or call["callee_id"] != user_id:
            return False
        
        call["status"] = "rejected"
        
        # Notifier le caller
        await ws_manager.send_personal(call["caller_id"], {
            "type": "call_rejected",
            "data": {
                "call_id": call_id
            }
        })
        
        await self.end_call(call_id)
        
        return True
    
    async def end_call(self, call_id: str):
        """Termine un appel"""
        call = self.active_calls.pop(call_id, None)
        if not call:
            return
        
        # Nettoyer les références utilisateur
        for user_id in [call["caller_id"], call["callee_id"]]:
            if self.user_call.get(user_id) == call_id:
                del self.user_call[user_id]
        
        # Notifier les participants
        await ws_manager.send_personal(call["caller_id"], {
            "type": "call_ended",
            "data": {"call_id": call_id}
        })
        await ws_manager.send_personal(call["callee_id"], {
            "type": "call_ended",
            "data": {"call_id": call_id}
        })
    
    async def set_offer(self, call_id: str, user_id: str, offer: dict) -> bool:
        """Définit l'offre SDP"""
        call = self.active_calls.get(call_id)
        if not call or call["caller_id"] != user_id:
            return False
        
        call["offer"] = offer
        
        # Transmettre l'offre au callee
        await ws_manager.send_personal(call["callee_id"], {
            "type": "webrtc_offer",
            "data": {
                "call_id": call_id,
                "offer": offer
            }
        })
        
        return True
    
    async def set_answer(self, call_id: str, user_id: str, answer: dict) -> bool:
        """Définit la réponse SDP"""
        call = self.active_calls.get(call_id)
        if not call or call["callee_id"] != user_id:
            return False
        
        call["answer"] = answer
        call["status"] = "connected"
        
        # Transmettre la réponse au caller
        await ws_manager.send_personal(call["caller_id"], {
            "type": "webrtc_answer",
            "data": {
                "call_id": call_id,
                "answer": answer
            }
        })
        
        return True
    
    async def add_ice_candidate(self, call_id: str, user_id: str, candidate: dict) -> bool:
        """Ajoute un candidat ICE"""
        call = self.active_calls.get(call_id)
        if not call:
            return False
        
        call["ice_candidates"].append(candidate)
        
        # Déterminer le destinataire
        recipient_id = call["callee_id"] if user_id == call["caller_id"] else call["caller_id"]
        
        # Transmettre le candidat
        await ws_manager.send_personal(recipient_id, {
            "type": "ice_candidate",
            "data": {
                "call_id": call_id,
                "candidate": candidate
            }
        })
        
        return True
    
    async def toggle_mute(self, call_id: str, user_id: str, is_muted: bool) -> bool:
        """Active/désactive le microphone"""
        call = self.active_calls.get(call_id)
        if not call:
            return False
        
        recipient_id = call["callee_id"] if user_id == call["caller_id"] else call["caller_id"]
        
        await ws_manager.send_personal(recipient_id, {
            "type": "mute_toggle",
            "data": {
                "call_id": call_id,
                "user_id": user_id,
                "is_muted": is_muted
            }
        })
        
        return True
    
    async def toggle_video(self, call_id: str, user_id: str, is_video_on: bool) -> bool:
        """Active/désactive la caméra"""
        call = self.active_calls.get(call_id)
        if not call:
            return False
        
        recipient_id = call["callee_id"] if user_id == call["caller_id"] else call["caller_id"]
        
        await ws_manager.send_personal(recipient_id, {
            "type": "video_toggle",
            "data": {
                "call_id": call_id,
                "user_id": user_id,
                "is_video_on": is_video_on
            }
        })
        
        return True
    
    def get_active_call(self, user_id: str) -> Optional[Dict]:
        """Récupère l'appel actif d'un utilisateur"""
        call_id = self.user_call.get(user_id)
        if call_id:
            return self.active_calls.get(call_id)
        return None
    
    def is_in_call(self, user_id: str) -> bool:
        """Vérifie si l'utilisateur est en appel"""
        return user_id in self.user_call

# Instance singleton
webrtc_manager = WebRTCManager()
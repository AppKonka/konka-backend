# backend/app/routers/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from typing import Optional
import json
from app.services.websocket_service import ws_manager
from app.core.security import verify_token
from app.database import db
from datetime import datetime

router = APIRouter()

@router.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    """Endpoint WebSocket pour les messages en temps réel"""
    try:
        # Vérifier le token
        payload = verify_token(token)
        user_id = payload.get("sub")
        
        if not user_id:
            await websocket.close(code=1008, reason="Invalid token")
            return
        
        # Connecter l'utilisateur
        connection_id = await ws_manager.connect(websocket, user_id)
        
        try:
            while True:
                # Recevoir les messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Traiter selon le type
                await handle_message(message, user_id, connection_id)
                
        except WebSocketDisconnect:
            ws_manager.disconnect(connection_id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

async def handle_message(message: dict, user_id: str, connection_id: str):
    """Traite les messages reçus"""
    msg_type = message.get("type")
    
    if msg_type == "message":
        await handle_chat_message(message, user_id)
    
    elif msg_type == "join_match":
        match_id = message.get("match_id")
        if match_id:
            await ws_manager.join_match(connection_id, match_id)
    
    elif msg_type == "leave_match":
        match_id = message.get("match_id")
        if match_id:
            await ws_manager.leave_match(connection_id, match_id)
    
    elif msg_type == "typing":
        await handle_typing(message, user_id)
    
    elif msg_type == "read_receipt":
        await handle_read_receipt(message, user_id)
    
    elif msg_type == "ping":
        await ws_manager.send_personal(user_id, {"type": "pong", "timestamp": datetime.now().isoformat()})

async def handle_chat_message(message: dict, sender_id: str):
    """Traite l'envoi d'un message de chat"""
    try:
        match_id = message.get("match_id")
        content = message.get("content")
        media_url = message.get("media_url")
        media_type = message.get("media_type")
        is_ephemeral = message.get("is_ephemeral", False)
        expires_in = message.get("expires_in", 3600)
        
        # Vérifier le match
        match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
        if not match.data:
            return
        
        # Créer le message en base
        msg_data = {
            "match_id": match_id,
            "sender_id": sender_id,
            "content": content,
            "media_url": media_url,
            "media_type": media_type,
            "is_ephemeral": is_ephemeral,
            "is_read": False,
            "created_at": datetime.now().isoformat()
        }
        
        if is_ephemeral:
            from datetime import timedelta
            msg_data["expires_at"] = (datetime.now() + timedelta(seconds=expires_in)).isoformat()
        
        result = db.table('messages').insert(msg_data).execute()
        
        if result.data:
            msg = result.data[0]
            
            # Récupérer l'expéditeur
            sender = db.table('users').select('username, avatar_url').eq('id', sender_id).execute()
            
            # Formater pour l'envoi
            response = {
                "type": "message",
                "data": {
                    "id": msg['id'],
                    "match_id": match_id,
                    "sender_id": sender_id,
                    "sender_name": sender.data[0]['username'] if sender.data else "Utilisateur",
                    "content": content,
                    "media_url": media_url,
                    "media_type": media_type,
                    "is_ephemeral": is_ephemeral,
                    "created_at": msg['created_at']
                }
            }
            
            # Envoyer au destinataire
            recipient_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == sender_id else match.data[0]['user2_id']
            await ws_manager.send_personal(recipient_id, response)
            
            # Notifier
            await notification_service.notify_new_message(recipient_id, sender_id, match_id)
            
    except Exception as e:
        logger.error(f"Error handling chat message: {e}")

async def handle_typing(message: dict, user_id: str):
    """Traite l'indicateur de frappe"""
    try:
        match_id = message.get("match_id")
        is_typing = message.get("is_typing", False)
        
        match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
        if not match.data:
            return
        
        recipient_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == user_id else match.data[0]['user2_id']
        
        await ws_manager.send_personal(recipient_id, {
            "type": "typing",
            "data": {
                "match_id": match_id,
                "user_id": user_id,
                "is_typing": is_typing
            }
        })
        
    except Exception as e:
        logger.error(f"Error handling typing: {e}")

async def handle_read_receipt(message: dict, user_id: str):
    """Traite l'accusé de réception"""
    try:
        match_id = message.get("match_id")
        message_ids = message.get("message_ids", [])
        
        for msg_id in message_ids:
            db.table('messages').update({
                "is_read": True,
                "read_at": datetime.now().isoformat()
            }).eq('id', msg_id).execute()
        
        match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
        if not match.data:
            return
        
        recipient_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == user_id else match.data[0]['user2_id']
        
        await ws_manager.send_personal(recipient_id, {
            "type": "read_receipt",
            "data": {
                "match_id": match_id,
                "user_id": user_id,
                "message_ids": message_ids
            }
        })
        
    except Exception as e:
        logger.error(f"Error handling read receipt: {e}")
# backend/app/routers/chat.py
from fastapi import APIRouter, HTTPException, status, Depends, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import asyncio

from app.database import db
from app.models.chat import MessageCreate, MessageResponse, ConversationResponse
from app.core.security import get_current_user, verify_token
from app.services.notification_service import notification_service

router = APIRouter()

# Stockage des connexions WebSocket actives
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}  # user_id -> connection_id
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        connection_id = f"{user_id}_{datetime.now().timestamp()}"
        self.active_connections[connection_id] = websocket
        self.user_connections[user_id] = connection_id
        return connection_id
    
    def disconnect(self, connection_id: str):
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        # Nettoyer user_connections
        for user_id, conn_id in list(self.user_connections.items()):
            if conn_id == connection_id:
                del self.user_connections[user_id]
                break
    
    async def send_personal_message(self, message: dict, user_id: str):
        connection_id = self.user_connections.get(user_id)
        if connection_id and connection_id in self.active_connections:
            await self.active_connections[connection_id].send_json(message)
    
    async def send_to_match(self, message: dict, match_id: str, sender_id: str):
        """Envoie un message à tous les participants du match"""
        try:
            # Récupérer les participants du match
            match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
            if match.data:
                participants = [match.data[0]['user1_id'], match.data[0]['user2_id']]
                for user_id in participants:
                    if user_id != sender_id:
                        await self.send_personal_message(message, user_id)
        except Exception as e:
            print(f"Error sending to match: {e}")

manager = ConnectionManager()

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
        connection_id = await manager.connect(websocket, user_id)
        
        try:
            while True:
                # Recevoir les messages
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Traiter selon le type de message
                if message_data.get("type") == "message":
                    await handle_chat_message(message_data, user_id)
                elif message_data.get("type") == "typing":
                    await handle_typing_indicator(message_data, user_id)
                elif message_data.get("type") == "read_receipt":
                    await handle_read_receipt(message_data, user_id)
                
        except WebSocketDisconnect:
            manager.disconnect(connection_id)
            
    except Exception as e:
        print(f"WebSocket error: {e}")

async def handle_chat_message(data: dict, sender_id: str):
    """Gère l'envoi d'un message"""
    try:
        match_id = data.get("match_id")
        content = data.get("content")
        media_url = data.get("media_url")
        media_type = data.get("media_type")
        is_ephemeral = data.get("is_ephemeral", False)
        expires_in = data.get("expires_in", 3600)  # 1 heure par défaut
        
        # Créer le message en base de données
        message_data = {
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
            expires_at = datetime.now() + timedelta(seconds=expires_in)
            message_data["expires_at"] = expires_at.isoformat()
        
        result = db.table('messages').insert(message_data).execute()
        
        if result.data:
            message = result.data[0]
            
            # Récupérer le nom de l'expéditeur
            sender = db.table('users').select('username, avatar_url').eq('id', sender_id).execute()
            sender_name = sender.data[0]['username'] if sender.data else "Utilisateur"
            
            # Formater le message pour l'envoi
            message_response = {
                "type": "message",
                "data": {
                    "id": message['id'],
                    "match_id": match_id,
                    "sender_id": sender_id,
                    "sender_name": sender_name,
                    "content": content,
                    "media_url": media_url,
                    "media_type": media_type,
                    "is_ephemeral": is_ephemeral,
                    "created_at": message['created_at']
                }
            }
            
            # Envoyer le message au destinataire
            await manager.send_to_match(message_response, match_id, sender_id)
            
            # Notifier l'utilisateur
            match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
            if match.data:
                recipient_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == sender_id else match.data[0]['user2_id']
                await notification_service.notify_new_message(
                    user_id=recipient_id,
                    sender_id=sender_id,
                    match_id=match_id
                )
                
    except Exception as e:
        print(f"Error handling chat message: {e}")

async def handle_typing_indicator(data: dict, sender_id: str):
    """Gère l'indicateur de frappe"""
    try:
        match_id = data.get("match_id")
        is_typing = data.get("is_typing", False)
        
        # Envoyer l'indicateur au destinataire
        typing_data = {
            "type": "typing",
            "data": {
                "match_id": match_id,
                "user_id": sender_id,
                "is_typing": is_typing
            }
        }
        
        await manager.send_to_match(typing_data, match_id, sender_id)
        
    except Exception as e:
        print(f"Error handling typing indicator: {e}")

async def handle_read_receipt(data: dict, user_id: str):
    """Gère l'accusé de réception"""
    try:
        match_id = data.get("match_id")
        message_ids = data.get("message_ids", [])
        
        # Marquer les messages comme lus
        for message_id in message_ids:
            db.table('messages').update({
                "is_read": True,
                "read_at": datetime.now().isoformat()
            }).eq('id', message_id).execute()
        
        # Envoyer l'accusé de réception
        read_data = {
            "type": "read_receipt",
            "data": {
                "match_id": match_id,
                "user_id": user_id,
                "message_ids": message_ids
            }
        }
        
        await manager.send_to_match(read_data, match_id, user_id)
        
    except Exception as e:
        print(f"Error handling read receipt: {e}")

# REST Endpoints pour les messages (fallback)

@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère toutes les conversations de l'utilisateur"""
    try:
        user_id = current_user['id']
        
        # Récupérer tous les matchs
        matches = db.table('matches').select('*')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .eq('status', 'matched')\
            .order('matched_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        conversations = []
        for match in matches.data:
            other_user_id = match['user1_id'] if match['user2_id'] == user_id else match['user2_id']
            
            # Récupérer l'autre utilisateur
            other_user = db.table('users').select('id, username, avatar_url, status')\
                .eq('id', other_user_id)\
                .execute()
            
            # Récupérer le dernier message
            last_message = db.table('messages').select('*')\
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
            
            conversations.append({
                "match_id": match['id'],
                "user": other_user.data[0] if other_user.data else None,
                "last_message": last_message.data[0] if last_message.data else None,
                "unread_count": unread_count.count,
                "created_at": match['matched_at']
            })
        
        return conversations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{match_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    match_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les messages d'une conversation"""
    try:
        # Vérifier que l'utilisateur fait partie du match
        match = db.table('matches').select('user1_id, user2_id').eq('id', match_id).execute()
        if not match.data:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if current_user['id'] not in [match.data[0]['user1_id'], match.data[0]['user2_id']]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Récupérer les messages
        messages = db.table('messages').select('*')\
            .eq('match_id', match_id)\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Marquer les messages comme lus
        for msg in messages.data:
            if msg['sender_id'] != current_user['id'] and not msg['is_read']:
                db.table('messages').update({
                    "is_read": True,
                    "read_at": datetime.now().isoformat()
                }).eq('id', msg['id']).execute()
        
        # Retourner dans l'ordre chronologique
        return list(reversed(messages.data))
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages")
async def send_message(
    message: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Envoie un message (fallback REST)"""
    try:
        # Vérifier le match
        match = db.table('matches').select('user1_id, user2_id').eq('id', message.match_id).execute()
        if not match.data:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if current_user['id'] not in [match.data[0]['user1_id'], match.data[0]['user2_id']]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Créer le message
        message_data = {
            "match_id": message.match_id,
            "sender_id": current_user['id'],
            "content": message.content,
            "media_url": message.media_url,
            "media_type": message.media_type,
            "is_ephemeral": message.is_ephemeral,
            "is_read": False,
            "created_at": datetime.now().isoformat()
        }
        
        if message.is_ephemeral:
            from datetime import timedelta
            expires_at = datetime.now() + timedelta(seconds=message.expires_in or 3600)
            message_data["expires_at"] = expires_at.isoformat()
        
        result = db.table('messages').insert(message_data).execute()
        
        if result.data:
            # Notifier via WebSocket
            recipient_id = match.data[0]['user1_id'] if match.data[0]['user2_id'] == current_user['id'] else match.data[0]['user2_id']
            await notification_service.notify_new_message(
                user_id=recipient_id,
                sender_id=current_user['id'],
                match_id=message.match_id
            )
            
            return result.data[0]
        
        raise HTTPException(status_code=500, detail="Failed to send message")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime un message (pour l'utilisateur uniquement)"""
    try:
        message = db.table('messages').select('sender_id').eq('id', message_id).execute()
        if not message.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        if message.data[0]['sender_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Soft delete ou marquer comme supprimé
        db.table('messages').update({
            "deleted_at": datetime.now().isoformat(),
            "content": "[Message supprimé]"
        }).eq('id', message_id).execute()
        
        return {"message": "Message deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
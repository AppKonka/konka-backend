# backend/app/services/websocket_service.py
import json
import logging
from typing import Dict, Set, Optional
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from app.database import db
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Gestionnaire de connexions WebSocket"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}
        self.match_connections: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Établit une connexion WebSocket"""
        await websocket.accept()
        connection_id = f"{user_id}_{datetime.now().timestamp()}"
        
        self.active_connections[connection_id] = websocket
        self.user_connections[user_id] = connection_id
        
        logger.info(f"User {user_id} connected with ID {connection_id}")
        return connection_id
    
    def disconnect(self, connection_id: str):
        """Ferme une connexion WebSocket"""
        # Supprimer de active_connections
        websocket = self.active_connections.pop(connection_id, None)
        
        # Supprimer de user_connections
        user_id = None
        for uid, cid in list(self.user_connections.items()):
            if cid == connection_id:
                user_id = uid
                del self.user_connections[uid]
                break
        
        # Supprimer des match_connections
        for match_id, connections in list(self.match_connections.items()):
            if connection_id in connections:
                connections.remove(connection_id)
                if not connections:
                    del self.match_connections[match_id]
        
        logger.info(f"Disconnected {connection_id}")
    
    async def send_personal(self, user_id: str, message: dict):
        """Envoie un message personnel à un utilisateur"""
        connection_id = self.user_connections.get(user_id)
        if connection_id and connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"Error sending personal message: {e}")
                return False
        return False
    
    async def send_to_match(self, match_id: str, message: dict, exclude: str = None):
        """Envoie un message à tous les participants d'un match"""
        connections = self.match_connections.get(match_id, set())
        for connection_id in connections:
            if connection_id != exclude and connection_id in self.active_connections:
                try:
                    await self.active_connections[connection_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to match: {e}")
    
    async def join_match(self, connection_id: str, match_id: str):
        """Ajoute une connexion à un match"""
        if match_id not in self.match_connections:
            self.match_connections[match_id] = set()
        self.match_connections[match_id].add(connection_id)
    
    async def leave_match(self, connection_id: str, match_id: str):
        """Retire une connexion d'un match"""
        if match_id in self.match_connections:
            self.match_connections[match_id].discard(connection_id)
            if not self.match_connections[match_id]:
                del self.match_connections[match_id]
    
    async def broadcast(self, message: dict):
        """Diffuse un message à tous les utilisateurs connectés"""
        for connection in self.active_connections.values():
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting: {e}")

# Instance singleton
ws_manager = WebSocketManager()
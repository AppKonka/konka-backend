# backend/app/services/cache_service.py
import json
import logging
from typing import Optional, Any
from datetime import timedelta
import redis
from app.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Service de cache Redis"""
    
    def __init__(self):
        self.client = None
        self._connect()
    
    def _connect(self):
        """Établit la connexion Redis"""
        try:
            self.client = redis.Redis(
                host=settings.REDIS_URL.split(':')[0] if ':' in settings.REDIS_URL else 'localhost',
                port=int(settings.REDIS_URL.split(':')[1]) if ':' in settings.REDIS_URL else 6379,
                password=settings.REDIS_PASSWORD,
                decode_responses=True
            )
            self.client.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Redis connection error: {e}")
            self.client = None
    
    async def get(self, key: str) -> Optional[Any]:
        """Récupère une valeur du cache"""
        if not self.client:
            return None
        
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = 3600
    ) -> bool:
        """Stocke une valeur dans le cache"""
        if not self.client:
            return False
        
        try:
            self.client.setex(
                key,
                timedelta(seconds=ttl),
                json.dumps(value)
            )
            return True
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Supprime une valeur du cache"""
        if not self.client:
            return False
        
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    async def clear_pattern(self, pattern: str) -> int:
        """Supprime toutes les clés correspondant à un pattern"""
        if not self.client:
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                return self.client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis clear pattern error: {e}")
            return 0
    
    async def exists(self, key: str) -> bool:
        """Vérifie si une clé existe"""
        if not self.client:
            return False
        
        try:
            return self.client.exists(key) > 0
        except Exception as e:
            logger.error(f"Redis exists error: {e}")
            return False
    
    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Incrémente une valeur compteur"""
        if not self.client:
            return None
        
        try:
            return self.client.incrby(key, amount)
        except Exception as e:
            logger.error(f"Redis increment error: {e}")
            return None
    
    async def get_or_set(
        self,
        key: str,
        callback,
        ttl: int = 3600
    ) -> Optional[Any]:
        """Récupère du cache ou exécute le callback si absent"""
        cached = await self.get(key)
        if cached is not None:
            return cached
        
        value = await callback()
        if value:
            await self.set(key, value, ttl)
        
        return value

# Instance singleton
cache_service = CacheService()
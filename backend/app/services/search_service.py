# backend/app/services/search_service.py
import logging
from typing import List, Dict, Optional
from datetime import datetime
from app.database import db

logger = logging.getLogger(__name__)

class SearchService:
    """Service de recherche avancée"""
    
    def __init__(self):
        # En production, utiliser Elasticsearch
        # Ici simulation avec PostgreSQL
        pass
    
    async def search_global(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        types: List[str] = None
    ) -> Dict:
        """Recherche globale sur tous les types de contenu"""
        results = {
            "users": [],
            "tracks": [],
            "videos": [],
            "posts": [],
            "products": [],
            "total": 0
        }
        
        if not query or len(query) < 2:
            return results
        
        search_term = f"%{query}%"
        
        # Recherche utilisateurs
        if not types or "users" in types:
            users = await self._search_users(search_term, limit)
            results["users"] = users
            results["total"] += len(users)
        
        # Recherche morceaux
        if not types or "tracks" in types:
            tracks = await self._search_tracks(search_term, limit)
            results["tracks"] = tracks
            results["total"] += len(tracks)
        
        # Recherche vidéos
        if not types or "videos" in types:
            videos = await self._search_videos(search_term, limit)
            results["videos"] = videos
            results["total"] += len(videos)
        
        # Recherche posts
        if not types or "posts" in types:
            posts = await self._search_posts(search_term, limit)
            results["posts"] = posts
            results["total"] += len(posts)
        
        # Recherche produits
        if not types or "products" in types:
            products = await self._search_products(search_term, limit)
            results["products"] = products
            results["total"] += len(products)
        
        return results
    
    async def _search_users(self, search_term: str, limit: int) -> List[Dict]:
        """Recherche des utilisateurs"""
        try:
            users = db.table('users').select('id, username, display_name, avatar_url, role')\
                .or_(f'username.ilike.{search_term},display_name.ilike.{search_term}')\
                .limit(limit)\
                .execute()
            
            return users.data
            
        except Exception as e:
            logger.error(f"Error searching users: {e}")
            return []
    
    async def _search_tracks(self, search_term: str, limit: int) -> List[Dict]:
        """Recherche des morceaux"""
        try:
            tracks = db.table('tracks').select('*, artist:users(id, username)')\
                .or_(f'title.ilike.{search_term},artist.username.ilike.{search_term}')\
                .eq('is_public', True)\
                .limit(limit)\
                .execute()
            
            return tracks.data
            
        except Exception as e:
            logger.error(f"Error searching tracks: {e}")
            return []
    
    async def _search_videos(self, search_term: str, limit: int) -> List[Dict]:
        """Recherche des vidéos"""
        try:
            videos = db.table('videos').select('*, user:users(id, username)')\
                .or_(f'title.ilike.{search_term},description.ilike.{search_term},user.username.ilike.{search_term}')\
                .eq('visibility', 'public')\
                .limit(limit)\
                .execute()
            
            return videos.data
            
        except Exception as e:
            logger.error(f"Error searching videos: {e}")
            return []
    
    async def _search_posts(self, search_term: str, limit: int) -> List[Dict]:
        """Recherche des posts"""
        try:
            posts = db.table('posts').select('*, user:users(id, username)')\
                .or_(f'caption.ilike.{search_term},user.username.ilike.{search_term}')\
                .eq('visibility', 'public')\
                .limit(limit)\
                .execute()
            
            return posts.data
            
        except Exception as e:
            logger.error(f"Error searching posts: {e}")
            return []
    
    async def _search_products(self, search_term: str, limit: int) -> List[Dict]:
        """Recherche des produits"""
        try:
            products = db.table('products').select('*, seller:users(id, username)')\
                .or_(f'name.ilike.{search_term},description.ilike.{search_term}')\
                .eq('is_active', True)\
                .limit(limit)\
                .execute()
            
            return products.data
            
        except Exception as e:
            logger.error(f"Error searching products: {e}")
            return []
    
    async def search_hashtags(
        self,
        hashtag: str,
        limit: int = 20,
        offset: int = 0
    ) -> Dict:
        """Recherche par hashtag"""
        try:
            search_term = f"%{hashtag}%"
            
            posts = db.table('posts').select('*')\
                .contains('hashtags', [hashtag])\
                .eq('visibility', 'public')\
                .order('created_at', desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            return {
                "data": posts.data,
                "total": len(posts.data)
            }
            
        except Exception as e:
            logger.error(f"Error searching hashtags: {e}")
            return {"data": [], "total": 0}
    
    async def search_location(
        self,
        lat: float,
        lng: float,
        radius_km: float = 10,
        limit: int = 20
    ) -> Dict:
        """Recherche par localisation"""
        try:
            # Rechercher les posts avec localisation
            posts = db.table('posts').select('*')\
                .not_.is_('location', None)\
                .eq('visibility', 'public')\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            # En production, filtrer par distance avec PostGIS
            return {
                "data": posts.data,
                "total": len(posts.data)
            }
            
        except Exception as e:
            logger.error(f"Error searching location: {e}")
            return {"data": [], "total": 0}
    
    async def get_trending_hashtags(self, limit: int = 10) -> List[Dict]:
        """Récupère les hashtags tendances"""
        try:
            # Récupérer les hashtags des 24 dernières heures
            day_ago = (datetime.now() - timedelta(days=1)).isoformat()
            
            posts = db.table('posts').select('hashtags, created_at')\
                .gte('created_at', day_ago)\
                .execute()
            
            hashtag_counts = {}
            for post in posts.data:
                for tag in post.get('hashtags', []):
                    hashtag_counts[tag] = hashtag_counts.get(tag, 0) + 1
            
            trending = sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
            
            return [{"tag": t[0], "count": t[1]} for t in trending]
            
        except Exception as e:
            logger.error(f"Error getting trending hashtags: {e}")
            return []

# Instance singleton
search_service = SearchService()
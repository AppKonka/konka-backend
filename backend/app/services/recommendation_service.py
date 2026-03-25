# backend/app/services/recommendation_service.py
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from app.database import db
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class RecommendationService:
    """Service de recommandation avancé avec IA"""
    
    def __init__(self):
        self.user_embeddings = {}  # Cache des embeddings utilisateurs
        self.track_embeddings = {}  # Cache des embeddings des morceaux
    
    async def get_personalized_feed(
        self, 
        user_id: str, 
        limit: int = 20,
        feed_type: str = "ai"
    ) -> List[Dict]:
        """Génère un feed personnalisé pour l'utilisateur"""
        try:
            if feed_type == "ai":
                return await self._get_ai_feed(user_id, limit)
            elif feed_type == "friends":
                return await self._get_friends_feed(user_id, limit)
            elif feed_type == "global":
                return await self._get_global_feed(limit)
            else:
                return await self._get_mixed_feed(user_id, limit)
        except Exception as e:
            logger.error(f"Error generating feed: {e}")
            return []
    
    async def _get_ai_feed(self, user_id: str, limit: int) -> List[Dict]:
        """Feed basé sur l'IA et les intérêts"""
        try:
            # Récupérer les intérêts de l'utilisateur
            interests = await self._get_user_interests(user_id)
            
            # Récupérer les vidéos avec score de pertinence
            videos = await self._get_videos_with_score(user_id, interests, limit * 3)
            
            # Appliquer les poids d'intérêt
            weighted_videos = await self._apply_interest_weights(videos, interests)
            
            # Trier par score
            weighted_videos.sort(key=lambda x: x['score'], reverse=True)
            
            return weighted_videos[:limit]
            
        except Exception as e:
            logger.error(f"Error getting AI feed: {e}")
            return []
    
    async def _get_friends_feed(self, user_id: str, limit: int) -> List[Dict]:
        """Feed des amis (matchs)"""
        try:
            # Récupérer les matchs de l'utilisateur
            matches = await self._get_user_matches(user_id)
            if not matches:
                return await self._get_global_feed(limit)
            
            # Récupérer les vidéos des amis
            videos = await self._get_videos_by_users(matches, limit)
            return videos
            
        except Exception as e:
            logger.error(f"Error getting friends feed: {e}")
            return []
    
    async def _get_global_feed(self, limit: int) -> List[Dict]:
        """Feed global (populaire)"""
        try:
            videos = await self._get_trending_videos(limit)
            return videos
        except Exception as e:
            logger.error(f"Error getting global feed: {e}")
            return []
    
    async def _get_mixed_feed(self, user_id: str, limit: int) -> List[Dict]:
        """Feed mixte (50% IA, 30% amis, 20% global)"""
        try:
            ai_limit = int(limit * 0.5)
            friends_limit = int(limit * 0.3)
            global_limit = limit - ai_limit - friends_limit
            
            ai_feed = await self._get_ai_feed(user_id, ai_limit)
            friends_feed = await self._get_friends_feed(user_id, friends_limit)
            global_feed = await self._get_global_feed(global_limit)
            
            # Mélanger les résultats
            mixed = ai_feed + friends_feed + global_feed
            return mixed[:limit]
            
        except Exception as e:
            logger.error(f"Error getting mixed feed: {e}")
            return []
    
    async def _get_user_interests(self, user_id: str) -> Dict:
        """Récupère les intérêts de l'utilisateur"""
        try:
            # Récupérer les genres musicaux
            genres = db.table('user_interests').select('genre').eq('user_id', user_id).execute()
            
            # Récupérer les artistes suivis
            artists = db.table('follows').select('following_id').eq('follower_id', user_id).execute()
            
            # Récupérer les likes
            likes = db.table('likes').select('post_id').eq('user_id', user_id).execute()
            
            return {
                'genres': [g['genre'] for g in genres.data],
                'artists': [a['following_id'] for a in artists.data],
                'likes_count': len(likes.data)
            }
        except Exception as e:
            logger.error(f"Error getting user interests: {e}")
            return {'genres': [], 'artists': [], 'likes_count': 0}
    
    async def _get_videos_with_score(
        self, 
        user_id: str, 
        interests: Dict, 
        limit: int
    ) -> List[Dict]:
        """Récupère les vidéos avec un score de pertinence"""
        try:
            videos = db.table('videos').select('*, user:users(id, username, avatar_url)')\
                .eq('visibility', 'public')\
                .neq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            scored_videos = []
            for video in videos.data:
                score = await self._calculate_video_score(video, interests)
                scored_videos.append({**video, 'score': score})
            
            return scored_videos
            
        except Exception as e:
            logger.error(f"Error getting videos with score: {e}")
            return []
    
    async def _calculate_video_score(self, video: Dict, interests: Dict) -> float:
        """Calcule le score de pertinence d'une vidéo"""
        score = 0.0
        
        # Score basé sur les artistes suivis (35%)
        if video['user_id'] in interests['artists']:
            score += 35
        
        # Score basé sur les genres musicaux (25%)
        if video.get('music') and video['music'].get('genre') in interests['genres']:
            score += 25
        
        # Score basé sur l'engagement (20%)
        engagement = (video.get('like_count', 0) + video.get('comment_count', 0)) / 100
        score += min(engagement, 20)
        
        # Score basé sur la récence (10%)
        days_ago = (datetime.now() - datetime.fromisoformat(video['created_at'])).days
        recency_score = max(0, 10 - days_ago)
        score += recency_score
        
        # Score basé sur la viralité (10%)
        if video.get('view_count', 0) > 10000:
            score += 10
        elif video.get('view_count', 0) > 5000:
            score += 5
        
        return min(score, 100)
    
    async def _apply_interest_weights(self, videos: List[Dict], interests: Dict) -> List[Dict]:
        """Applique les poids d'intérêt personnalisés"""
        try:
            # Récupérer les poids de l'utilisateur
            weights = await self._get_user_interest_weights(interests)
            
            for video in videos:
                # Ajuster le score selon les poids
                if video['user_id'] in interests['artists']:
                    video['score'] *= (1 + weights.get('artists', 0.5))
                
                if video.get('music') and video['music'].get('genre') in interests['genres']:
                    video['score'] *= (1 + weights.get('genres', 0.3))
                
                video['score'] = min(video['score'], 100)
            
            return videos
            
        except Exception as e:
            logger.error(f"Error applying interest weights: {e}")
            return videos
    
    async def _get_user_interest_weights(self, interests: Dict) -> Dict:
        """Récupère les poids d'intérêt de l'utilisateur"""
        # En production, ces poids seraient stockés en base de données
        # et ajustés par l'utilisateur via le curseur d'intérêt
        return {
            'artists': 0.5,
            'genres': 0.3,
            'engagement': 0.2
        }
    
    async def _get_user_matches(self, user_id: str) -> List[str]:
        """Récupère les IDs des utilisateurs matchés"""
        try:
            matches = db.table('matches').select('user1_id, user2_id')\
                .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
                .eq('status', 'matched')\
                .execute()
            
            match_ids = []
            for match in matches.data:
                if match['user1_id'] != user_id:
                    match_ids.append(match['user1_id'])
                if match['user2_id'] != user_id:
                    match_ids.append(match['user2_id'])
            
            return match_ids
            
        except Exception as e:
            logger.error(f"Error getting user matches: {e}")
            return []
    
    async def _get_videos_by_users(self, user_ids: List[str], limit: int) -> List[Dict]:
        """Récupère les vidéos des utilisateurs spécifiés"""
        try:
            videos = db.table('videos').select('*, user:users(id, username, avatar_url)')\
                .in_('user_id', user_ids)\
                .eq('visibility', 'public')\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return videos.data
            
        except Exception as e:
            logger.error(f"Error getting videos by users: {e}")
            return []
    
    async def _get_trending_videos(self, limit: int) -> List[Dict]:
        """Récupère les vidéos tendances"""
        try:
            # Vidéos avec le plus d'engagement des dernières 24h
            day_ago = (datetime.now() - timedelta(days=1)).isoformat()
            
            videos = db.table('videos').select('*, user:users(id, username, avatar_url)')\
                .eq('visibility', 'public')\
                .gte('created_at', day_ago)\
                .order('like_count', desc=True)\
                .limit(limit)\
                .execute()
            
            return videos.data
            
        except Exception as e:
            logger.error(f"Error getting trending videos: {e}")
            return []
    
    async def get_music_recommendations(
        self,
        user_id: str,
        limit: int = 10
    ) -> List[Dict]:
        """Recommandations musicales personnalisées"""
        try:
            # Récupérer l'historique d'écoute
            listened_tracks = await self._get_user_listening_history(user_id)
            
            # Récupérer les genres préférés
            genres = await self._get_user_genres(user_id)
            
            # Récupérer les morceaux similaires
            recommendations = []
            
            # 50% basé sur les genres
            if genres:
                genre_tracks = await self._get_tracks_by_genres(genres, limit // 2)
                recommendations.extend(genre_tracks)
            
            # 30% basé sur les artistes similaires
            if listened_tracks:
                similar_artists = await self._get_similar_artists(listened_tracks, limit // 3)
                recommendations.extend(similar_artists)
            
            # 20% nouvelles découvertes
            new_tracks = await self._get_new_tracks(limit - len(recommendations))
            recommendations.extend(new_tracks)
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting music recommendations: {e}")
            return []
    
    async def _get_user_listening_history(self, user_id: str) -> List[Dict]:
        """Récupère l'historique d'écoute"""
        try:
            # En production, utiliser une table d'historique
            # Ici simulation
            tracks = db.table('tracks').select('*')\
                .order('play_count', desc=True)\
                .limit(10)\
                .execute()
            
            return tracks.data
            
        except Exception as e:
            logger.error(f"Error getting listening history: {e}")
            return []
    
    async def _get_user_genres(self, user_id: str) -> List[str]:
        """Récupère les genres préférés"""
        try:
            genres = db.table('user_interests').select('genre').eq('user_id', user_id).execute()
            return [g['genre'] for g in genres.data]
        except Exception as e:
            logger.error(f"Error getting user genres: {e}")
            return []
    
    async def _get_tracks_by_genres(self, genres: List[str], limit: int) -> List[Dict]:
        """Récupère des morceaux par genres"""
        try:
            tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
                .in_('genre', genres)\
                .eq('is_public', True)\
                .order('play_count', desc=True)\
                .limit(limit)\
                .execute()
            
            return tracks.data
            
        except Exception as e:
            logger.error(f"Error getting tracks by genres: {e}")
            return []
    
    async def _get_similar_artists(self, listened_tracks: List[Dict], limit: int) -> List[Dict]:
        """Récupère des artistes similaires"""
        try:
            # Récupérer les artistes écoutés
            artist_ids = list(set([t.get('artist_id') for t in listened_tracks if t.get('artist_id')]))
            
            if not artist_ids:
                return []
            
            # Récupérer des artistes similaires (mêmes genres)
            tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
                .not_.in_('artist_id', artist_ids)\
                .eq('is_public', True)\
                .order('play_count', desc=True)\
                .limit(limit)\
                .execute()
            
            return tracks.data
            
        except Exception as e:
            logger.error(f"Error getting similar artists: {e}")
            return []
    
    async def _get_new_tracks(self, limit: int) -> List[Dict]:
        """Récupère les nouvelles sorties"""
        try:
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            
            tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
                .eq('is_public', True)\
                .gte('created_at', week_ago)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return tracks.data
            
        except Exception as e:
            logger.error(f"Error getting new tracks: {e}")
            return []

# Instance singleton
recommendation_service = RecommendationService()
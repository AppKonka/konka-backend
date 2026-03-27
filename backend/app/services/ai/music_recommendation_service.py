# backend/app/services/ai/music_recommendation_service.py
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging
from app.database import db
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class MusicRecommendationService:
    """Service avancé de recommandations musicales IA"""
    
    def __init__(self):
        self.user_embeddings = {}
        self.track_embeddings = {}
        self.collaborative_filtering = True
        self.content_based = True
    
    async def get_personalized_recommendations(
        self,
        user_id: str,
        limit: int = 20,
        context: str = "home"
    ) -> List[Dict]:
        """Génère des recommandations musicales personnalisées"""
        try:
            # Récupérer l'historique d'écoute
            listening_history = await self._get_listening_history(user_id)
            
            # Récupérer les likes
            liked_tracks = await self._get_liked_tracks(user_id)
            
            # Récupérer les genres préférés
            favorite_genres = await self._get_favorite_genres(user_id)
            
            # Récupérer les artistes suivis
            followed_artists = await self._get_followed_artists(user_id)
            
            # Score basé sur l'historique (40%)
            history_based = await self._get_history_based_recommendations(
                listening_history, liked_tracks, limit // 2
            )
            
            # Score basé sur les genres (30%)
            genre_based = await self._get_genre_based_recommendations(
                favorite_genres, limit // 3
            )
            
            # Score basé sur les artistes similaires (20%)
            artist_based = await self._get_artist_based_recommendations(
                followed_artists, limit // 4
            )
            
            # Nouvelles découvertes (10%)
            new_discoveries = await self._get_new_discoveries(limit // 4)
            
            # Fusionner et dédupliquer
            all_recommendations = history_based + genre_based + artist_based + new_discoveries
            seen_ids = set()
            unique_recommendations = []
            
            for rec in all_recommendations:
                if rec['id'] not in seen_ids:
                    seen_ids.add(rec['id'])
                    unique_recommendations.append(rec)
            
            return unique_recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    async def _get_listening_history(self, user_id: str) -> List[Dict]:
        """Récupère l'historique d'écoute de l'utilisateur"""
        try:
            # 30 derniers jours
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            
            # En production, utiliser une table d'historique
            # Ici simulation avec les tracks likées
            liked_tracks = await self._get_liked_tracks(user_id)
            
            if liked_tracks:
                # Simuler un historique basé sur les likes
                history = []
                for track_id in liked_tracks[:10]:
                    history.append({
                        'track_id': track_id,
                        'listened_at': (datetime.now() - timedelta(days=np.random.randint(1, 30))).isoformat()
                    })
                return history
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting listening history: {e}")
            return []
    
    async def _get_liked_tracks(self, user_id: str) -> List[str]:
        """Récupère les morceaux likés"""
        try:
            likes = await db.table('track_likes').select('track_id')\
                .eq('user_id', user_id)\
                .execute()
            
            return [l['track_id'] for l in likes.data] if likes.data else []
            
        except Exception as e:
            logger.error(f"Error getting liked tracks: {e}")
            return []
    
    async def _get_favorite_genres(self, user_id: str) -> List[str]:
        """Récupère les genres préférés"""
        try:
            genres = await db.table('user_interests').select('genre')\
                .eq('user_id', user_id)\
                .execute()
            
            return [g['genre'] for g in genres.data] if genres.data else []
            
        except Exception as e:
            logger.error(f"Error getting favorite genres: {e}")
            return []
    
    async def _get_followed_artists(self, user_id: str) -> List[str]:
        """Récupère les artistes suivis"""
        try:
            follows = await db.table('follows').select('following_id')\
                .eq('follower_id', user_id)\
                .execute()
            
            return [f['following_id'] for f in follows.data] if follows.data else []
            
        except Exception as e:
            logger.error(f"Error getting followed artists: {e}")
            return []
    
    async def _get_history_based_recommendations(
        self,
        history: List[Dict],
        liked_tracks: List[str],
        limit: int
    ) -> List[Dict]:
        """Recommandations basées sur l'historique d'écoute"""
        try:
            if not history:
                return []
            
            # Extraire les IDs des morceaux écoutés
            listened_ids = [h['track_id'] for h in history]
            
            # Trouver des morceaux similaires
            recommendations = []
            
            for track_id in listened_ids[:10]:  # Limiter pour performance
                similar = await self._get_similar_tracks(track_id, limit)
                recommendations.extend(similar)
            
            # Filtrer les morceaux déjà écoutés ou likés
            exclude_ids = set(listened_ids + liked_tracks)
            recommendations = [r for r in recommendations if r['id'] not in exclude_ids]
            
            # Trier par score
            recommendations.sort(key=lambda x: x.get('play_count', 0), reverse=True)
            
            return recommendations[:limit]
            
        except Exception as e:
            logger.error(f"Error getting history based recommendations: {e}")
            return []
    
    async def _get_genre_based_recommendations(
        self,
        genres: List[str],
        limit: int
    ) -> List[Dict]:
        """Recommandations basées sur les genres préférés"""
        try:
            if not genres:
                return []
            
            tracks = await db.table('tracks').select('*, artist:users(id, username)')\
                .in_('genre', genres)\
                .eq('is_public', True)\
                .order('play_count', desc=True)\
                .limit(limit * 2)\
                .execute()
            
            return tracks.data[:limit] if tracks.data else []
            
        except Exception as e:
            logger.error(f"Error getting genre based recommendations: {e}")
            return []
    
    async def _get_artist_based_recommendations(
        self,
        artists: List[str],
        limit: int
    ) -> List[Dict]:
        """Recommandations basées sur les artistes suivis"""
        try:
            if not artists:
                return []
            
            # Trouver des artistes similaires
            similar_artists = []
            for artist_id in artists[:5]:
                similar = await self._get_similar_artists(artist_id, limit)
                similar_artists.extend(similar)
            
            # Récupérer les morceaux de ces artistes
            artist_ids = list(set(similar_artists))
            if artist_ids:
                tracks = await db.table('tracks').select('*, artist:users(id, username)')\
                    .in_('artist_id', artist_ids)\
                    .eq('is_public', True)\
                    .order('play_count', desc=True)\
                    .limit(limit)\
                    .execute()
                
                return tracks.data if tracks.data else []
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting artist based recommendations: {e}")
            return []
    
    async def _get_new_discoveries(self, limit: int) -> List[Dict]:
        """Nouvelles découvertes (morceaux récents)"""
        try:
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            
            tracks = await db.table('tracks').select('*, artist:users(id, username)')\
                .eq('is_public', True)\
                .gte('created_at', week_ago)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return tracks.data if tracks.data else []
            
        except Exception as e:
            logger.error(f"Error getting new discoveries: {e}")
            return []
    
    async def _get_similar_tracks(self, track_id: str, limit: int) -> List[Dict]:
        """Trouve des morceaux similaires"""
        try:
            # Récupérer le morceau source
            track = await db.table('tracks').select('genre, artist_id')\
                .eq('id', track_id)\
                .execute()
            
            if not track.data:
                return []
            
            source = track.data[0]
            
            # Trouver des morceaux avec le même genre ou du même artiste
            similar = await db.table('tracks').select('*, artist:users(id, username)')\
                .neq('id', track_id)\
                .eq('is_public', True)\
                .eq('genre', source.get('genre', ''))\
                .order('play_count', desc=True)\
                .limit(limit)\
                .execute()
            
            return similar.data if similar.data else []
            
        except Exception as e:
            logger.error(f"Error getting similar tracks: {e}")
            return []
    
    async def _get_similar_artists(self, artist_id: str, limit: int) -> List[str]:
        """Trouve des artistes similaires"""
        try:
            # Récupérer les genres de l'artiste
            tracks = await db.table('tracks').select('genre')\
                .eq('artist_id', artist_id)\
                .execute()
            
            genres = list(set([t['genre'] for t in tracks.data if t.get('genre')]))
            
            if not genres:
                return []
            
            # Trouver d'autres artistes avec des genres similaires
            similar_artists = await db.table('tracks').select('artist_id')\
                .in_('genre', genres)\
                .neq('artist_id', artist_id)\
                .execute()
            
            artist_ids = list(set([a['artist_id'] for a in similar_artists.data]))
            
            return artist_ids[:limit]
            
        except Exception as e:
            logger.error(f"Error getting similar artists: {e}")
            return []
    
    async def get_user_music_profile(self, user_id: str) -> Dict[str, Any]:
        """Récupère le profil musical d'un utilisateur"""
        try:
            genres = await self._get_favorite_genres(user_id)
            artists = await self._get_followed_artists(user_id)
            liked_tracks = await self._get_liked_tracks(user_id)
            
            # Calculer l'embedding du profil utilisateur (simplifié)
            profile_vector = np.zeros(10)  # Vecteur de 10 dimensions
            
            # Utiliser numpy pour les calculs (optionnel)
            if genres:
                # Simulation d'un embedding basé sur les genres
                for genre in genres:
                    genre_hash = hash(genre) % 10
                    profile_vector[genre_hash] += 1
            
            # Normaliser
            if np.sum(profile_vector) > 0:
                profile_vector = profile_vector / np.sum(profile_vector)
            
            return {
                "user_id": user_id,
                "favorite_genres": genres,
                "followed_artists_count": len(artists),
                "liked_tracks_count": len(liked_tracks),
                "profile_vector": profile_vector.tolist(),
                "recommendation_ready": len(genres) > 0 or len(artists) > 0
            }
            
        except Exception as e:
            logger.error(f"Error getting user music profile: {e}")
            return {
                "user_id": user_id,
                "favorite_genres": [],
                "followed_artists_count": 0,
                "liked_tracks_count": 0,
                "profile_vector": [],
                "recommendation_ready": False
            }

# Instance singleton
music_recommendation_service = MusicRecommendationService()
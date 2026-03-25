# backend/app/services/moderation_service.py
import re
import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime
import hashlib
from app.database import db
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)

class ModerationService:
    """Service de modération automatique de contenu"""
    
    def __init__(self):
        self.banned_words = self._load_banned_words()
        self.banned_hashtags = self._load_banned_hashtags()
        self.spam_patterns = self._load_spam_patterns()
    
    def _load_banned_words(self) -> List[str]:
        """Charge la liste des mots interdits"""
        return [
            # Insultes et mots vulgaires
            'insulte1', 'insulte2',  # À remplacer par la liste réelle
            # Discours haineux
            'haineux1', 'haineux2',
            # Harcèlement
            'harcelement1', 'harcelement2',
        ]
    
    def _load_banned_hashtags(self) -> List[str]:
        """Charge la liste des hashtags interdits"""
        return [
            '#haine', '#violence', '#drogue',
            # À compléter
        ]
    
    def _load_spam_patterns(self) -> List[str]:
        """Charge les patterns de spam"""
        return [
            r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+])+',  # URLs
            r'\b(?:viagra|cialis|casino|poker)\b',  # Spam classique
            r'(\w+\s*){10,}',  # Trop de mots sans ponctuation
        ]
    
    async def moderate_content(self, content: str, content_type: str = "text") -> Dict:
        """Modère un contenu textuel"""
        results = {
            "is_appropriate": True,
            "flags": [],
            "confidence": 1.0,
            "suggested_action": "allow"
        }
        
        # Vérifier les mots interdits
        word_check = self._check_banned_words(content)
        if word_check["found"]:
            results["is_appropriate"] = False
            results["flags"].append({
                "type": "banned_word",
                "matches": word_check["matches"],
                "severity": "high"
            })
        
        # Vérifier les patterns de spam
        spam_check = self._check_spam_patterns(content)
        if spam_check["found"]:
            results["is_appropriate"] = False
            results["flags"].append({
                "type": "spam",
                "matches": spam_check["matches"],
                "severity": "medium"
            })
        
        # Vérifier les hashtags
        hashtags = self._extract_hashtags(content)
        for tag in hashtags:
            if tag.lower() in self.banned_hashtags:
                results["is_appropriate"] = False
                results["flags"].append({
                    "type": "banned_hashtag",
                    "matches": [tag],
                    "severity": "medium"
                })
        
        # Analyse de sentiment avec IA
        sentiment = await ai_service.analyze_sentiment(content)
        if sentiment.get("negative", 0) > 0.7:
            results["flags"].append({
                "type": "negative_sentiment",
                "confidence": sentiment["negative"],
                "severity": "low"
            })
        
        # Déterminer l'action suggérée
        if not results["is_appropriate"]:
            high_severity = any(f["severity"] == "high" for f in results["flags"])
            if high_severity:
                results["suggested_action"] = "block"
            else:
                results["suggested_action"] = "review"
        
        return results
    
    async def moderate_image(self, image_url: str) -> Dict:
        """Modère une image"""
        results = {
            "is_appropriate": True,
            "flags": [],
            "confidence": 1.0,
            "suggested_action": "allow"
        }
        
        try:
            # En production, utiliser une API de modération d'images
            # Exemple: Google Cloud Vision, AWS Rekognition
            # Ici simulation
            
            # Vérifier la présence de nudité
            # nudity_check = await self._check_nudity(image_url)
            # if nudity_check["detected"]:
            #     results["is_appropriate"] = False
            #     results["flags"].append({
            #         "type": "nudity",
            #         "confidence": nudity_check["confidence"],
            #         "severity": "high"
            #     })
            
            # Vérifier la présence de violence
            # violence_check = await self._check_violence(image_url)
            # if violence_check["detected"]:
            #     results["flags"].append({
            #         "type": "violence",
            #         "confidence": violence_check["confidence"],
            #         "severity": "high"
            #     })
            
            pass
            
        except Exception as e:
            logger.error(f"Error moderating image: {e}")
        
        return results
    
    async def moderate_video(self, video_url: str) -> Dict:
        """Modère une vidéo"""
        results = {
            "is_appropriate": True,
            "flags": [],
            "confidence": 1.0,
            "suggested_action": "allow"
        }
        
        # En production, extraire des frames et les modérer
        # Ici simulation
        
        return results
    
    async def moderate_audio(self, audio_url: str) -> Dict:
        """Modère un fichier audio"""
        results = {
            "is_appropriate": True,
            "flags": [],
            "confidence": 1.0,
            "suggested_action": "allow"
        }
        
        # En production, utiliser une API de transcription + modération
        # Ici simulation
        
        return results
    
    def _check_banned_words(self, text: str) -> Dict:
        """Vérifie la présence de mots interdits"""
        text_lower = text.lower()
        matches = []
        
        for word in self.banned_words:
            if word in text_lower:
                matches.append(word)
        
        return {
            "found": len(matches) > 0,
            "matches": matches
        }
    
    def _check_spam_patterns(self, text: str) -> Dict:
        """Vérifie la présence de patterns de spam"""
        matches = []
        
        for pattern in self.spam_patterns:
            found = re.findall(pattern, text, re.IGNORECASE)
            if found:
                matches.extend(found)
        
        return {
            "found": len(matches) > 0,
            "matches": matches
        }
    
    def _extract_hashtags(self, text: str) -> List[str]:
        """Extrait les hashtags du texte"""
        return re.findall(r'#\w+', text)
    
    async def check_user_report(self, user_id: str, reported_by: str, reason: str) -> Dict:
        """Vérifie un signalement utilisateur"""
        try:
            # Récupérer les signalements précédents
            reports = db.table('reports').select('*')\
                .eq('reported_id', user_id)\
                .execute()
            
            report_count = len(reports.data)
            
            # Déterminer l'action
            if report_count >= 5:
                action = "suspend"
            elif report_count >= 3:
                action = "warn"
            else:
                action = "ignore"
            
            return {
                "action": action,
                "report_count": report_count,
                "reason": reason
            }
            
        except Exception as e:
            logger.error(f"Error checking user report: {e}")
            return {"action": "ignore", "report_count": 0, "reason": reason}
    
    async def apply_moderation_action(self, content_id: str, content_type: str, action: str):
        """Applique une action de modération"""
        try:
            table_name = {
                "post": "posts",
                "video": "videos",
                "comment": "comments",
                "user": "users"
            }.get(content_type)
            
            if not table_name:
                return
            
            if action == "block":
                await db.table(table_name).update({
                    "is_moderated": True,
                    "moderated_at": datetime.now().isoformat(),
                    "moderated_reason": "Inappropriate content"
                }).eq('id', content_id).execute()
            
            elif action == "hide":
                await db.table(table_name).update({
                    "visibility": "private",
                    "moderated_at": datetime.now().isoformat()
                }).eq('id', content_id).execute()
            
            elif action == "warn":
                # Envoyer un avertissement à l'utilisateur
                await self._send_warning(content_id, content_type)
            
        except Exception as e:
            logger.error(f"Error applying moderation action: {e}")
    
    async def _send_warning(self, content_id: str, content_type: str):
        """Envoie un avertissement à l'utilisateur"""
        # À implémenter avec le service de notifications
        pass

# Instance singleton
moderation_service = ModerationService()
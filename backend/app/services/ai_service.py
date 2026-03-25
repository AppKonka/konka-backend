# backend/app/services/ai_service.py
import openai
from typing import List, Dict, Any, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Configurer OpenAI
openai.api_key = settings.OPENAI_API_KEY

class AIService:
    """Service d'intelligence artificielle pour KONKA"""
    
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def generate_description(self, product_name: str, category: str, features: List[str] = None) -> str:
        """Génère une description de produit optimisée SEO"""
        try:
            prompt = f"""
            Génère une description de produit pour "{product_name}" dans la catégorie "{category}".
            {f'Caractéristiques: {", ".join(features)}' if features else ''}
            
            La description doit:
            - Être persuasive et engageante
            - Inclure des mots-clés SEO pertinents
            - Mettre en avant les bénéfices
            - Faire environ 150-200 mots
            """
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Tu es un expert en copywriting e-commerce."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error generating description: {e}")
            return ""
    
    async def generate_hashtags(self, content: str, context: str = "music") -> List[str]:
        """Génère des hashtags pertinents pour un contenu"""
        try:
            prompt = f"""
            Génère 5 à 10 hashtags pertinents pour ce contenu {context}:
            "{content}"
            
            Retourne uniquement les hashtags sans le symbole #, séparés par des virgules.
            """
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Tu es un expert en marketing digital."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=100
            )
            
            hashtags = response.choices[0].message.content.replace(" ", "").split(",")
            return [tag for tag in hashtags if tag]
            
        except Exception as e:
            logger.error(f"Error generating hashtags: {e}")
            return []
    
    async def analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Analyse le sentiment d'un commentaire ou avis"""
        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Analyse le sentiment du texte. Retourne un JSON avec les scores positif, négatif, neutre."},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,
                max_tokens=100,
                response_format={"type": "json_object"}
            )
            
            import json
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {"positive": 0, "negative": 0, "neutral": 1}
    
    async def recommend_music(self, user_id: str, user_interests: List[str], limit: int = 10) -> List[Dict]:
        """Recommande de la musique basée sur les goûts de l'utilisateur"""
        try:
            # Récupérer les écoutes récentes de l'utilisateur
            # Cette logique sera implémentée avec les données réelles
            
            prompt = f"""
            Basé sur les genres favoris: {', '.join(user_interests)},
            recommande {limit} morceaux ou artistes similaires.
            
            Retourne une liste JSON avec les champs: type (track/artist), name, genre, reason.
            """
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Tu es un expert en recommandations musicales."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            import json
            return json.loads(response.choices[0].message.content).get("recommendations", [])
            
        except Exception as e:
            logger.error(f"Error recommending music: {e}")
            return []
    
    async def predict_viral_score(self, content: str, hashtags: List[str], content_type: str) -> float:
        """Prédit le score viral potentiel d'un contenu"""
        try:
            prompt = f"""
            Prédit le score viral (0-100) de ce contenu {content_type}:
            Contenu: "{content}"
            Hashtags: {', '.join(hashtags)}
            
            Considère: l'engagement potentiel, la tendance, l'originalité.
            Retourne uniquement un nombre.
            """
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Tu es un expert en prédiction de viralité."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=10
            )
            
            try:
                return float(response.choices[0].message.content)
            except:
                return 50.0
                
        except Exception as e:
            logger.error(f"Error predicting viral score: {e}")
            return 50.0
    
    async def translate_text(self, text: str, target_language: str) -> str:
        """Traduit du texte dans une autre langue"""
        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": f"Tu es un traducteur professionnel. Traduis le texte en {target_language}."},
                    {"role": "user", "content": text}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error translating text: {e}")
            return text
    
    async def suggest_reply(self, comment: str, context: str = "general") -> str:
        """Suggère une réponse à un commentaire"""
        try:
            prompt = f"""
            Suggère une réponse amicale et engageante à ce commentaire ({context}):
            "{comment}"
            
            La réponse doit être naturelle et courte.
            """
            
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Tu es un community manager expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=150
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error suggesting reply: {e}")
            return "Merci pour ton commentaire ! 🙏"

# Instance singleton
ai_service = AIService()
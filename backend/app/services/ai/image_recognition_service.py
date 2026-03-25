# backend/app/services/ai/image_recognition_service.py
import base64
import logging
from typing import Dict, List, Any, Optional
import aiohttp
from app.config import settings

logger = logging.getLogger(__name__)

class ImageRecognitionService:
    """Service de reconnaissance d'images avec IA"""
    
    def __init__(self):
        self.google_vision_api_key = settings.GOOGLE_VISION_API_KEY
        self.aws_rekognition_enabled = settings.AWS_REKOGNITION_ENABLED
    
    async def detect_inappropriate_content(self, image_url: str) -> Dict[str, Any]:
        """Détecte du contenu inapproprié dans une image"""
        try:
            # Utiliser Google Cloud Vision API
            result = await self._google_vision_safe_search(image_url)
            
            return {
                "is_appropriate": result["is_appropriate"],
                "adult": result["adult"],
                "violence": result["violence"],
                "racy": result["racy"],
                "medical": result["medical"],
                "spoof": result["spoof"],
                "confidence": result["confidence"]
            }
            
        except Exception as e:
            logger.error(f"Error detecting inappropriate content: {e}")
            return {
                "is_appropriate": True,
                "adult": False,
                "violence": False,
                "racy": False,
                "medical": False,
                "spoof": False,
                "confidence": 0
            }
    
    async def _google_vision_safe_search(self, image_url: str) -> Dict[str, Any]:
        """Appelle l'API Google Cloud Vision pour la détection de contenu"""
        try:
            # Télécharger l'image
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    image_data = await response.read()
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Appeler l'API
            url = f"https://vision.googleapis.com/v1/images:annotate?key={self.google_vision_api_key}"
            payload = {
                "requests": [{
                    "image": {"content": image_base64},
                    "features": [{"type": "SAFE_SEARCH_DETECTION"}]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    result = await response.json()
                    
                    safe_search = result.get('responses', [{}])[0].get('safeSearchAnnotation', {})
                    
                    # Convertir les valeurs
                    likelihood_map = {
                        'UNKNOWN': 0,
                        'VERY_UNLIKELY': 0.1,
                        'UNLIKELY': 0.25,
                        'POSSIBLE': 0.5,
                        'LIKELY': 0.75,
                        'VERY_LIKELY': 0.9
                    }
                    
                    adult = likelihood_map.get(safe_search.get('adult', 'UNKNOWN'), 0)
                    violence = likelihood_map.get(safe_search.get('violence', 'UNKNOWN'), 0)
                    racy = likelihood_map.get(safe_search.get('racy', 'UNKNOWN'), 0)
                    medical = likelihood_map.get(safe_search.get('medical', 'UNKNOWN'), 0)
                    spoof = likelihood_map.get(safe_search.get('spoof', 'UNKNOWN'), 0)
                    
                    is_appropriate = adult < 0.5 and violence < 0.5 and racy < 0.5
                    
                    return {
                        "is_appropriate": is_appropriate,
                        "adult": adult > 0.5,
                        "violence": violence > 0.5,
                        "racy": racy > 0.5,
                        "medical": medical > 0.5,
                        "spoof": spoof > 0.5,
                        "confidence": max(adult, violence, racy)
                    }
                    
        except Exception as e:
            logger.error(f"Google Vision API error: {e}")
            return {
                "is_appropriate": True,
                "adult": False,
                "violence": False,
                "racy": False,
                "medical": False,
                "spoof": False,
                "confidence": 0
            }
    
    async def detect_objects(self, image_url: str) -> List[Dict]:
        """Détecte les objets dans une image"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    image_data = await response.read()
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            url = f"https://vision.googleapis.com/v1/images:annotate?key={self.google_vision_api_key}"
            payload = {
                "requests": [{
                    "image": {"content": image_base64},
                    "features": [{"type": "OBJECT_LOCALIZATION"}]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    result = await response.json()
                    
                    objects = []
                    for obj in result.get('responses', [{}])[0].get('localizedObjectAnnotations', []):
                        objects.append({
                            "name": obj.get('name'),
                            "confidence": obj.get('score', 0),
                            "bounding_box": obj.get('boundingPoly', {}).get('normalizedVertices', [])
                        })
                    
                    return objects
                    
        except Exception as e:
            logger.error(f"Error detecting objects: {e}")
            return []
    
    async def detect_faces(self, image_url: str) -> List[Dict]:
        """Détecte les visages dans une image"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(image_url) as response:
                    image_data = await response.read()
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            url = f"https://vision.googleapis.com/v1/images:annotate?key={self.google_vision_api_key}"
            payload = {
                "requests": [{
                    "image": {"content": image_base64},
                    "features": [{"type": "FACE_DETECTION"}]
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    result = await response.json()
                    
                    faces = []
                    for face in result.get('responses', [{}])[0].get('faceAnnotations', []):
                        faces.append({
                            "confidence": face.get('detectionConfidence', 0),
                            "joy": face.get('joyLikelihood', 'UNKNOWN'),
                            "sorrow": face.get('sorrowLikelihood', 'UNKNOWN'),
                            "anger": face.get('angerLikelihood', 'UNKNOWN'),
                            "surprise": face.get('surpriseLikelihood', 'UNKNOWN')
                        })
                    
                    return faces
                    
        except Exception as e:
            logger.error(f"Error detecting faces: {e}")
            return []

# Instance singleton
image_recognition_service = ImageRecognitionService()
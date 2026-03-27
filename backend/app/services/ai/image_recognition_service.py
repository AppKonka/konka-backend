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
        self._session = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Obtient ou crée une session aiohttp"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """Ferme la session aiohttp"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    async def _download_image(self, image_url: str) -> bytes:
        """Télécharge une image depuis une URL"""
        session = await self._get_session()
        async with session.get(image_url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download image: HTTP {response.status}")
            return await response.read()
    
    async def _call_google_vision(self, image_base64: str, features: List[str]) -> Dict:
        """Appelle l'API Google Cloud Vision"""
        session = await self._get_session()
        url = f"https://vision.googleapis.com/v1/images:annotate?key={self.google_vision_api_key}"
        payload = {
            "requests": [{
                "image": {"content": image_base64},
                "features": [{"type": f} for f in features]
            }]
        }
        
        async with session.post(url, json=payload) as response:
            if response.status != 200:
                error_text = await response.text()
                logger.error(f"Google Vision API error: {response.status} - {error_text}")
                raise Exception(f"Google Vision API error: {response.status}")
            return await response.json()
    
    async def detect_inappropriate_content(self, image_url: str) -> Dict[str, Any]:
        """Détecte du contenu inapproprié dans une image"""
        try:
            # Télécharger l'image
            image_data = await self._download_image(image_url)
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Appeler l'API Google Cloud Vision
            result = await self._call_google_vision(image_base64, ["SAFE_SEARCH_DETECTION"])
            
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
            
            # Log de la détection
            logger.info(f"Image analysis completed: appropriate={is_appropriate}, adult={adult}, violence={violence}")
            
            return {
                "is_appropriate": is_appropriate,
                "adult": adult > 0.5,
                "violence": violence > 0.5,
                "racy": racy > 0.5,
                "medical": medical > 0.5,
                "spoof": spoof > 0.5,
                "confidence": max(adult, violence, racy)
            }
            
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error downloading image: {e}")
            return {
                "is_appropriate": True,
                "adult": False,
                "violence": False,
                "racy": False,
                "medical": False,
                "spoof": False,
                "confidence": 0,
                "error": str(e)
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
                "confidence": 0,
                "error": str(e)
            }
    
    async def detect_objects(self, image_url: str) -> List[Dict]:
        """Détecte les objets dans une image"""
        try:
            # Télécharger l'image
            image_data = await self._download_image(image_url)
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Appeler l'API Google Cloud Vision
            result = await self._call_google_vision(image_base64, ["OBJECT_LOCALIZATION"])
            
            objects = []
            for obj in result.get('responses', [{}])[0].get('localizedObjectAnnotations', []):
                objects.append({
                    "name": obj.get('name'),
                    "confidence": obj.get('score', 0),
                    "bounding_box": obj.get('boundingPoly', {}).get('normalizedVertices', [])
                })
            
            logger.info(f"Objects detected: {len(objects)} objects found")
            return objects
            
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error detecting objects: {e}")
            return []
        except Exception as e:
            logger.error(f"Error detecting objects: {e}")
            return []
    
    async def detect_faces(self, image_url: str) -> List[Dict]:
        """Détecte les visages dans une image"""
        try:
            # Télécharger l'image
            image_data = await self._download_image(image_url)
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            
            # Appeler l'API Google Cloud Vision
            result = await self._call_google_vision(image_base64, ["FACE_DETECTION"])
            
            faces = []
            for face in result.get('responses', [{}])[0].get('faceAnnotations', []):
                faces.append({
                    "confidence": face.get('detectionConfidence', 0),
                    "joy": face.get('joyLikelihood', 'UNKNOWN'),
                    "sorrow": face.get('sorrowLikelihood', 'UNKNOWN'),
                    "anger": face.get('angerLikelihood', 'UNKNOWN'),
                    "surprise": face.get('surpriseLikelihood', 'UNKNOWN')
                })
            
            logger.info(f"Faces detected: {len(faces)} faces found")
            return faces
            
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error detecting faces: {e}")
            return []
        except Exception as e:
            logger.error(f"Error detecting faces: {e}")
            return []

# Instance singleton
image_recognition_service = ImageRecognitionService()
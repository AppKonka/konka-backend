# backend/app/services/geolocation/geolocation_service.py
import aiohttp
import logging
from typing import Dict, List, Optional, Any, Tuple
from math import radians, sin, cos, sqrt, atan2
from datetime import datetime
import json
from app.config import settings
from app.database import db

logger = logging.getLogger(__name__)

class GeolocationService:
    """Service complet de géolocalisation avec Google Maps"""
    
    def __init__(self):
        self.api_key = settings.GOOGLE_MAPS_API_KEY
        self.base_url = "https://maps.googleapis.com/maps/api"
        
        # Rayon de la Terre en km
        self.EARTH_RADIUS = 6371
    
    # ==================== GÉOCODAGE ====================
    
    async def geocode_address(self, address: str) -> Optional[Dict[str, Any]]:
        """Convertit une adresse en coordonnées GPS"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/geocode/json",
                    params={
                        "address": address,
                        "key": self.api_key
                    }
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        location = data["results"][0]["geometry"]["location"]
                        return {
                            "lat": location["lat"],
                            "lng": location["lng"],
                            "formatted_address": data["results"][0]["formatted_address"],
                            "place_id": data["results"][0]["place_id"],
                            "components": self._extract_address_components(data["results"][0])
                        }
                    
                    logger.warning(f"Geocoding failed for {address}: {data['status']}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error geocoding address: {e}")
            return None
    
    async def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """Convertit des coordonnées GPS en adresse"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/geocode/json",
                    params={
                        "latlng": f"{lat},{lng}",
                        "key": self.api_key
                    }
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        return {
                            "formatted_address": data["results"][0]["formatted_address"],
                            "place_id": data["results"][0]["place_id"],
                            "components": self._extract_address_components(data["results"][0]),
                            "plus_code": data["results"][0].get("plus_code")
                        }
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error reverse geocoding: {e}")
            return None
    
    def _extract_address_components(self, result: Dict) -> Dict[str, str]:
        """Extrait les composants d'une adresse"""
        components = {}
        for component in result.get("address_components", []):
            for comp_type in component["types"]:
                if comp_type in ["street_number", "route", "locality", "postal_code", "country", "administrative_area_level_1"]:
                    components[comp_type] = component["long_name"]
        return components
    
    # ==================== CALCUL DE DISTANCE ====================
    
    def calculate_distance(
        self,
        lat1: float,
        lng1: float,
        lat2: float,
        lng2: float,
        unit: str = "km"
    ) -> float:
        """Calcule la distance entre deux points GPS (formule de Haversine)"""
        try:
            lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
            
            dlat = lat2 - lat1
            dlng = lng2 - lng1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            
            distance = self.EARTH_RADIUS * c
            
            if unit == "m":
                return distance * 1000
            return distance
            
        except Exception as e:
            logger.error(f"Error calculating distance: {e}")
            return 0.0
    
    def calculate_bearing(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calcule l'angle entre deux points (en degrés)"""
        try:
            lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
            
            dlon = lng2 - lng1
            x = sin(dlon) * cos(lat2)
            y = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dlon)
            
            bearing = atan2(x, y)
            bearing = bearing * 180 / 3.14159
            bearing = (bearing + 360) % 360
            
            return bearing
            
        except Exception as e:
            logger.error(f"Error calculating bearing: {e}")
            return 0.0
    
    # ==================== RECHERCHE DE PROXIMITÉ ====================
    
    async def find_nearby_places(
        self,
        lat: float,
        lng: float,
        radius: int = 1000,
        type: Optional[str] = None,
        keyword: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Recherche des lieux à proximité"""
        try:
            params = {
                "location": f"{lat},{lng}",
                "radius": radius,
                "key": self.api_key
            }
            
            if type:
                params["type"] = type
            if keyword:
                params["keyword"] = keyword
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/place/nearbysearch/json",
                    params=params
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        places = []
                        for place in data["results"][:limit]:
                            places.append({
                                "place_id": place["place_id"],
                                "name": place["name"],
                                "address": place.get("vicinity"),
                                "location": place["geometry"]["location"],
                                "rating": place.get("rating"),
                                "user_ratings_total": place.get("user_ratings_total"),
                                "price_level": place.get("price_level"),
                                "types": place.get("types", []),
                                "photos": place.get("photos", [])
                            })
                        return places
                    
                    return []
                    
        except Exception as e:
            logger.error(f"Error finding nearby places: {e}")
            return []
    
    async def get_place_details(self, place_id: str) -> Optional[Dict[str, Any]]:
        """Récupère les détails d'un lieu"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/place/details/json",
                    params={
                        "place_id": place_id,
                        "fields": "name,formatted_address,geometry,rating,reviews,photos,opening_hours,website,phone_number,price_level",
                        "key": self.api_key
                    }
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        result = data["result"]
                        return {
                            "place_id": place_id,
                            "name": result.get("name"),
                            "address": result.get("formatted_address"),
                            "location": result["geometry"]["location"],
                            "rating": result.get("rating"),
                            "reviews": result.get("reviews", []),
                            "photos": result.get("photos", []),
                            "opening_hours": result.get("opening_hours"),
                            "website": result.get("website"),
                            "phone": result.get("international_phone_number"),
                            "price_level": result.get("price_level")
                        }
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting place details: {e}")
            return None
    
    # ==================== AUTOSUGGESTION ====================
    
    async def autocomplete_place(
        self,
        input_text: str,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        radius: int = 50000
    ) -> List[Dict[str, Any]]:
        """Autocomplétion de lieux"""
        try:
            params = {
                "input": input_text,
                "key": self.api_key
            }
            
            if lat and lng:
                params["location"] = f"{lat},{lng}"
                params["radius"] = radius
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/place/autocomplete/json",
                    params=params
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        return [
                            {
                                "place_id": p["place_id"],
                                "description": p["description"],
                                "types": p.get("types", [])
                            }
                            for p in data["predictions"]
                        ]
                    
                    return []
                    
        except Exception as e:
            logger.error(f"Error autocompleting place: {e}")
            return []
    
    # ==================== MATRICE DE DISTANCE ====================
    
    async def get_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]],
        mode: str = "driving"
    ) -> Optional[Dict]:
        """Calcule la matrice des distances entre plusieurs points"""
        try:
            origins_str = "|".join([f"{lat},{lng}" for lat, lng in origins])
            destinations_str = "|".join([f"{lat},{lng}" for lat, lng in destinations])
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/distancematrix/json",
                    params={
                        "origins": origins_str,
                        "destinations": destinations_str,
                        "mode": mode,
                        "key": self.api_key
                    }
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        return data
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting distance matrix: {e}")
            return None
    
    # ==================== ITINÉRAIRES ====================
    
    async def get_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        mode: str = "driving",
        alternatives: bool = False
    ) -> Optional[Dict]:
        """Calcule un itinéraire entre deux points"""
        try:
            origin_str = f"{origin[0]},{origin[1]}"
            dest_str = f"{destination[0]},{destination[1]}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/directions/json",
                    params={
                        "origin": origin_str,
                        "destination": dest_str,
                        "mode": mode,
                        "alternatives": str(alternatives).lower(),
                        "key": self.api_key
                    }
                ) as response:
                    data = await response.json()
                    
                    if data["status"] == "OK":
                        return data
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Error getting directions: {e}")
            return None
    
    # ==================== GESTION DES LIEUX ENREGISTRÉS ====================
    
    async def save_place(self, user_id: str, place_data: Dict) -> Dict:
        """Enregistre un lieu pour un utilisateur"""
        try:
            place = {
                "user_id": user_id,
                "place_id": place_data.get("place_id"),
                "name": place_data.get("name"),
                "address": place_data.get("address"),
                "lat": place_data.get("lat"),
                "lng": place_data.get("lng"),
                "type": place_data.get("type", "custom"),
                "created_at": datetime.now().isoformat()
            }
            
            result = await db.table('user_places').insert(place).execute()
            return result.data[0] if result.data else {}
            
        except Exception as e:
            logger.error(f"Error saving place: {e}")
            return {}
    
    async def get_user_places(self, user_id: str, place_type: Optional[str] = None) -> List[Dict]:
        """Récupère les lieux enregistrés d'un utilisateur"""
        try:
            query = db.table('user_places').select('*').eq('user_id', user_id)
            
            if place_type:
                query = query.eq('type', place_type)
            
            result = await query.order('created_at', desc=True).execute()
            return result.data or []
            
        except Exception as e:
            logger.error(f"Error getting user places: {e}")
            return []
    
    # ==================== STATISTIQUES ====================
    
    async def get_place_stats(self, place_id: str) -> Dict[str, Any]:
        """Récupère les statistiques d'un lieu"""
        try:
            # Compter les check-ins
            checkins = await db.table('chill_events').select('id', count='exact')\
                .eq('location_place_id', place_id)\
                .execute()
            
            # Compter les Sparks GPS
            sparks = await db.table('sparks').select('id', count='exact')\
                .eq('location_place_id', place_id)\
                .execute()
            
            return {
                "checkins": checkins.count,
                "sparks": sparks.count,
                "total_visits": checkins.count + sparks.count
            }
            
        except Exception as e:
            logger.error(f"Error getting place stats: {e}")
            return {"checkins": 0, "sparks": 0, "total_visits": 0}

# Instance singleton
geolocation_service = GeolocationService()
# backend/app/database.py
from supabase import create_client, Client
from postgrest import APIError
import logging
from typing import Optional, Dict, Any
from app.config import settings

logger = logging.getLogger(__name__)

# Initialiser le client Supabase
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

async def get_supabase_client() -> Client:
    """Retourne le client Supabase"""
    return supabase

async def check_db_connection() -> bool:
    """Vérifie la connexion à la base de données"""
    try:
        # Tenter une requête simple
        response = supabase.table('users').select('count', count='exact').limit(1).execute()
        return True
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return False

class SupabaseClient:
    """Wrapper pour les opérations Supabase avec gestion d'erreurs"""
    
    def __init__(self):
        self.client = supabase
    
    async def execute(self, query):
        """Exécute une requête avec gestion d'erreurs"""
        try:
            return await query.execute()
        except APIError as e:
            logger.error(f"Supabase API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            raise
    
    def table(self, table_name: str):
        """Retourne une référence de table"""
        return self.client.table(table_name)
    
    def rpc(self, function_name: str, params: Dict[str, Any]):
        """Appelle une fonction RPC"""
        return self.client.rpc(function_name, params)
    
    def storage(self, bucket_name: str):
        """Retourne une référence de bucket de stockage"""
        return self.client.storage.from_(bucket_name)

# Instance singleton
db = SupabaseClient()
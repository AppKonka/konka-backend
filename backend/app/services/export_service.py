# backend/app/services/export_service.py
import json
import csv
import io
from typing import Dict, List, Any
from datetime import datetime
import logging
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from app.database import db

logger = logging.getLogger(__name__)

class ExportService:
    """Service d'export de données"""
    
    async def export_user_data(self, user_id: str, format: str = 'json') -> bytes:
        """Exporte toutes les données d'un utilisateur"""
        try:
            data = await self._collect_user_data(user_id)
            
            if format == 'json':
                return self._export_json(data)
            elif format == 'csv':
                return self._export_csv(data)
            elif format == 'pdf':
                return self._export_pdf(data)
            else:
                return self._export_json(data)
                
        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            raise
    
    async def _collect_user_data(self, user_id: str) -> Dict:
        """Collecte toutes les données de l'utilisateur"""
        try:
            # Profil utilisateur
            user = db.table('users').select('*').eq('id', user_id).execute()
            
            # Posts
            posts = db.table('posts').select('*').eq('user_id', user_id).execute()
            
            # Vidéos
            videos = db.table('videos').select('*').eq('user_id', user_id).execute()
            
            # Sparks
            sparks = db.table('sparks').select('*').eq('user_id', user_id).execute()
            
            # Tracks (si artiste)
            tracks = db.table('tracks').select('*').eq('artist_id', user_id).execute()
            
            # Produits (si vendeur)
            products = db.table('products').select('*').eq('seller_id', user_id).execute()
            
            # Commandes
            orders = db.table('orders').select('*').eq('buyer_id', user_id).execute()
            
            # Followers / Following
            followers = db.table('follows').select('follower_id').eq('following_id', user_id).execute()
            following = db.table('follows').select('following_id').eq('follower_id', user_id).execute()
            
            # Messages
            messages = await self._get_user_messages(user_id)
            
            return {
                "export_date": datetime.now().isoformat(),
                "user_id": user_id,
                "profile": user.data[0] if user.data else {},
                "posts": posts.data,
                "videos": videos.data,
                "sparks": sparks.data,
                "tracks": tracks.data,
                "products": products.data,
                "orders": orders.data,
                "followers": [f['follower_id'] for f in followers.data],
                "following": [f['following_id'] for f in following.data],
                "messages": messages
            }
            
        except Exception as e:
            logger.error(f"Error collecting user data: {e}")
            return {}
    
    async def _get_user_messages(self, user_id: str) -> List[Dict]:
        """Récupère tous les messages de l'utilisateur"""
        try:
            # Récupérer les matchs
            matches = db.table('matches').select('id')\
                .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
                .execute()
            
            match_ids = [m['id'] for m in matches.data]
            
            if not match_ids:
                return []
            
            # Récupérer les messages
            messages = db.table('messages').select('*')\
                .in_('match_id', match_ids)\
                .execute()
            
            return messages.data
            
        except Exception as e:
            logger.error(f"Error getting user messages: {e}")
            return []
    
    def _export_json(self, data: Dict) -> bytes:
        """Exporte en JSON"""
        return json.dumps(data, indent=2, default=str).encode('utf-8')
    
    def _export_csv(self, data: Dict) -> bytes:
        """Exporte en CSV"""
        output = io.StringIO()
        
        # Exporter chaque section en CSV
        for section_name, section_data in data.items():
            if isinstance(section_data, list) and section_data:
                output.write(f"\n# {section_name}\n")
                writer = csv.DictWriter(output, fieldnames=section_data[0].keys())
                writer.writeheader()
                writer.writerows(section_data)
        
        return output.getvalue().encode('utf-8')
    
    def _export_pdf(self, data: Dict) -> bytes:
        """Exporte en PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Titre
        story.append(Paragraph(f"KONKA - Export des données", styles['Title']))
        story.append(Paragraph(f"Date: {data.get('export_date')}", styles['Normal']))
        story.append(Paragraph(" ", styles['Normal']))
        
        # Profil utilisateur
        story.append(Paragraph("Profil utilisateur", styles['Heading2']))
        profile_data = [[k, str(v)] for k, v in data.get('profile', {}).items()]
        if profile_data:
            table = Table(profile_data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(table)
        
        story.append(Paragraph(" ", styles['Normal']))
        
        # Posts
        if data.get('posts'):
            story.append(Paragraph(f"Posts ({len(data['posts'])})", styles['Heading2']))
            # Ajouter les posts
        
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

# Instance singleton
export_service = ExportService()
# backend/app/services/reporting/reporting_service.py
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
from app.database import db
from app.services.cache.cache_service import cache_service

logger = logging.getLogger(__name__)

class ReportingService:
    """Service complet de reporting pour tableaux de bord admin"""
    
    def __init__(self):
        self.cache_ttl = 3600  # 1 heure
    
    # ==================== STATISTIQUES GLOBALES ====================
    
    async def get_platform_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques globales de la plateforme"""
        cache_key = "platform_stats"
        
        cached = await cache_service.get(cache_key)
        if cached:
            return cached
        
        try:
            stats = {}
            
            # Utilisateurs
            users = await db.table('users').select('id, role, created_at').execute()
            stats["total_users"] = len(users.data)
            stats["fans"] = len([u for u in users.data if u['role'] == 'fan'])
            stats["artists"] = len([u for u in users.data if u['role'] == 'artist'])
            stats["sellers"] = len([u for u in users.data if u['role'] == 'seller'])
            
            # Croissance quotidienne (30 derniers jours)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).date()
            daily_growth = {}
            for user in users.data:
                created_date = datetime.fromisoformat(user['created_at']).date()
                if created_date >= thirty_days_ago:
                    daily_growth[created_date.isoformat()] = daily_growth.get(created_date.isoformat(), 0) + 1
            
            stats["daily_growth"] = [{"date": d, "count": c} for d, c in sorted(daily_growth.items())]
            
            # Contenu
            tracks = await db.table('tracks').select('id', count='exact').execute()
            videos = await db.table('videos').select('id', count='exact').execute()
            posts = await db.table('posts').select('id', count='exact').execute()
            sparks = await db.table('sparks').select('id', count='exact').execute()
            
            stats["total_tracks"] = tracks.count
            stats["total_videos"] = videos.count
            stats["total_posts"] = posts.count
            stats["total_sparks"] = sparks.count
            
            # Engagement
            likes = await db.table('likes').select('id', count='exact').execute()
            comments = await db.table('comments').select('id', count='exact').execute()
            shares = await db.table('shares').select('id', count='exact').execute()
            
            stats["total_likes"] = likes.count
            stats["total_comments"] = comments.count
            stats["total_shares"] = shares.count
            
            # Interactions sociales
            matches = await db.table('matches').select('id', count='exact').eq('status', 'matched').execute()
            follows = await db.table('follows').select('id', count='exact').execute()
            messages = await db.table('messages').select('id', count='exact').execute()
            
            stats["total_matches"] = matches.count
            stats["total_follows"] = follows.count
            stats["total_messages"] = messages.count
            
            # Commerce
            orders = await db.table('orders').select('id, total_amount, status, created_at').execute()
            stats["total_orders"] = len(orders.data)
            stats["completed_orders"] = len([o for o in orders.data if o['status'] == 'delivered'])
            stats["total_revenue"] = sum(o['total_amount'] for o in orders.data if o['status'] == 'delivered')
            
            # Lives
            lives = await db.table('lives').select('id, status, viewer_count').execute()
            stats["total_lives"] = len(lives.data)
            stats["active_lives"] = len([l for l in lives.data if l['status'] == 'live'])
            stats["total_viewers"] = sum(l.get('viewer_count', 0) for l in lives.data)
            
            # Dédicaces
            dedications = await db.table('dedications').select('id, price, status').execute()
            stats["total_dedications"] = len(dedications.data)
            stats["completed_dedications"] = len([d for d in dedications.data if d['status'] == 'completed'])
            stats["dedication_revenue"] = sum(d['price'] for d in dedications.data if d['status'] == 'completed')
            
            # Sauvegarder en cache
            await cache_service.set(cache_key, stats, self.cache_ttl)
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting platform stats: {e}")
            return {}
    
    # ==================== STATISTIQUES UTILISATEURS ====================
    
    async def get_user_analytics(
        self,
        period: str = "30d",
        segment: Optional[str] = None
    ) -> Dict[str, Any]:
        """Récupère les analyses utilisateurs avancées"""
        try:
            # Définir la période
            if period == "7d":
                start_date = datetime.now() - timedelta(days=7)
            elif period == "30d":
                start_date = datetime.now() - timedelta(days=30)
            elif period == "90d":
                start_date = datetime.now() - timedelta(days=90)
            else:
                start_date = datetime.now() - timedelta(days=30)
            
            start_iso = start_date.isoformat()
            
            # Requête de base
            query = db.table('users').select('id, role, created_at, last_active_at')
            if segment and segment != "all":
                query = query.eq('role', segment)
            
            users = await query.gte('created_at', start_iso).execute()
            
            # Rétention
            retention = await self._calculate_retention(users.data)
            
            # Acquisition par source
            acquisition = await self._get_acquisition_sources(start_iso)
            
            # Activité
            activity = await self._get_user_activity(users.data)
            
            return {
                "total_users": len(users.data),
                "new_users": len([u for u in users.data if u['created_at'] >= start_iso]),
                "active_users": len([u for u in users.data if u['last_active_at'] >= start_iso]),
                "retention": retention,
                "acquisition": acquisition,
                "activity": activity,
                "segmentation": {
                    "fans": len([u for u in users.data if u['role'] == 'fan']),
                    "artists": len([u for u in users.data if u['role'] == 'artist']),
                    "sellers": len([u for u in users.data if u['role'] == 'seller'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting user analytics: {e}")
            return {}
    
    async def _calculate_retention(self, users: List[Dict]) -> Dict[str, Any]:
        """Calcule le taux de rétention"""
        try:
            retention = {
                "day1": 0,
                "day7": 0,
                "day30": 0,
                "cohorts": []
            }
            
            # Regrouper par cohorte mensuelle
            cohorts = {}
            for user in users:
                created_month = datetime.fromisoformat(user['created_at']).strftime("%Y-%m")
                if created_month not in cohorts:
                    cohorts[created_month] = {"total": 0, "active_day1": 0, "active_day7": 0, "active_day30": 0}
                cohorts[created_month]["total"] += 1
            
            # Calculer les taux
            for cohort in cohorts.values():
                if cohort["total"] > 0:
                    retention["day1"] += cohort["active_day1"] / cohort["total"]
                    retention["day7"] += cohort["active_day7"] / cohort["total"]
                    retention["day30"] += cohort["active_day30"] / cohort["total"]
            
            if len(cohorts) > 0:
                retention["day1"] /= len(cohorts)
                retention["day7"] /= len(cohorts)
                retention["day30"] /= len(cohorts)
            
            return retention
            
        except Exception as e:
            logger.error(f"Error calculating retention: {e}")
            return {"day1": 0, "day7": 0, "day30": 0, "cohorts": []}
    
    async def _get_acquisition_sources(self, start_date: str) -> List[Dict]:
        """Récupère les sources d'acquisition"""
        try:
            sources = await db.table('user_acquisition').select('source, count')\
                .gte('created_at', start_date)\
                .execute()
            
            return sources.data or []
            
        except Exception as e:
            logger.error(f"Error getting acquisition sources: {e}")
            return []
    
    async def _get_user_activity(self, users: List[Dict]) -> Dict[str, Any]:
        """Calcule l'activité des utilisateurs"""
        try:
            activity = {
                "daily_active": 0,
                "weekly_active": 0,
                "monthly_active": 0,
                "average_session_duration": 0,
                "actions_per_user": 0
            }
            
            # Compter les utilisateurs actifs
            now = datetime.now()
            daily_cutoff = (now - timedelta(days=1)).isoformat()
            weekly_cutoff = (now - timedelta(days=7)).isoformat()
            monthly_cutoff = (now - timedelta(days=30)).isoformat()
            
            for user in users:
                last_active = user.get('last_active_at')
                if last_active:
                    if last_active >= daily_cutoff:
                        activity["daily_active"] += 1
                    if last_active >= weekly_cutoff:
                        activity["weekly_active"] += 1
                    if last_active >= monthly_cutoff:
                        activity["monthly_active"] += 1
            
            return activity
            
        except Exception as e:
            logger.error(f"Error getting user activity: {e}")
            return activity
    
    # ==================== STATISTIQUES FINANCIÈRES ====================
    
    async def get_financial_report(
        self,
        period: str = "monthly",
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> Dict[str, Any]:
        """Génère un rapport financier"""
        try:
            # Définir la période
            if period == "daily":
                group_format = "%Y-%m-%d"
            elif period == "weekly":
                group_format = "%Y-W%W"
            elif period == "monthly":
                group_format = "%Y-%m"
            else:
                group_format = "%Y-%m"
            
            # Récupérer les transactions
            transactions = await db.table('transactions').select('*')\
                .eq('status', 'completed')\
                .execute()
            
            # Regrouper par période
            revenue_by_period = {}
            for tx in transactions.data:
                created = datetime.fromisoformat(tx['created_at'])
                period_key = created.strftime(group_format)
                revenue_by_period[period_key] = revenue_by_period.get(period_key, 0) + tx['amount']
            
            # Calculer les totaux
            total_revenue = sum(revenue_by_period.values())
            
            # Récupérer les commissions
            commissions = await db.table('commissions').select('*').execute()
            total_commissions = sum(c['amount'] for c in commissions.data)
            
            # Récupérer les payouts
            payouts = await db.table('transfers').select('*').execute()
            total_payouts = sum(p['amount'] for p in payouts.data)
            
            return {
                "period": period,
                "revenue_by_period": [{"period": k, "amount": v} for k, v in sorted(revenue_by_period.items())],
                "total_revenue": total_revenue,
                "total_commissions": total_commissions,
                "total_payouts": total_payouts,
                "net_revenue": total_revenue - total_commissions - total_payouts,
                "average_transaction": total_revenue / len(transactions.data) if transactions.data else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting financial report: {e}")
            return {}
    
    # ==================== STATISTIQUES DE CONTENU ====================
    
    async def get_content_report(self) -> Dict[str, Any]:
        """Génère un rapport sur le contenu"""
        try:
            # Récupérer les statistiques de contenu
            tracks = await db.table('tracks').select('id, genre, created_at, play_count').execute()
            videos = await db.table('videos').select('id, view_count, like_count').execute()
            posts = await db.table('posts').select('id, type, like_count, comment_count').execute()
            
            # Top genres
            genre_counts = {}
            for track in tracks.data:
                genre = track.get('genre', 'unknown')
                genre_counts[genre] = genre_counts.get(genre, 0) + 1
            
            # Top tracks
            top_tracks = sorted(tracks.data, key=lambda x: x.get('play_count', 0), reverse=True)[:10]
            
            # Top videos
            top_videos = sorted(videos.data, key=lambda x: x.get('view_count', 0), reverse=True)[:10]
            
            return {
                "total_tracks": len(tracks.data),
                "total_videos": len(videos.data),
                "total_posts": len(posts.data),
                "total_plays": sum(t.get('play_count', 0) for t in tracks.data),
                "total_views": sum(v.get('view_count', 0) for v in videos.data),
                "total_likes": sum(p.get('like_count', 0) for p in posts.data) + sum(v.get('like_count', 0) for v in videos.data),
                "top_genres": [{"genre": g, "count": c} for g, c in sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)[:10]],
                "top_tracks": top_tracks,
                "top_videos": top_videos
            }
            
        except Exception as e:
            logger.error(f"Error getting content report: {e}")
            return {}
    
    # ==================== STATISTIQUES DE MODÉRATION ====================
    
    async def get_moderation_report(self) -> Dict[str, Any]:
        """Génère un rapport sur la modération"""
        try:
            # Signalements
            reports = await db.table('reports').select('*').execute()
            
            # Contenu modéré
            moderated_content = {
                "posts": await db.table('posts').select('id', count='exact').eq('is_moderated', True).execute(),
                "videos": await db.table('videos').select('id', count='exact').eq('is_moderated', True).execute(),
                "comments": await db.table('comments').select('id', count='exact').eq('is_moderated', True).execute(),
                "users": await db.table('users').select('id', count='exact').eq('is_suspended', True).execute()
            }
            
            # Types de signalements
            report_types = {}
            for report in reports.data:
                report_types[report['reason']] = report_types.get(report['reason'], 0) + 1
            
            return {
                "total_reports": len(reports.data),
                "pending_reports": len([r for r in reports.data if r['status'] == 'pending']),
                "resolved_reports": len([r for r in reports.data if r['status'] == 'resolved']),
                "report_types": [{"type": t, "count": c} for t, c in sorted(report_types.items(), key=lambda x: x[1], reverse=True)],
                "moderated_content": {
                    "posts": moderated_content["posts"].count,
                    "videos": moderated_content["videos"].count,
                    "comments": moderated_content["comments"].count,
                    "users": moderated_content["users"].count
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting moderation report: {e}")
            return {}
    
    # ==================== EXPORT DE RAPPORTS ====================
    
    async def export_report(
        self,
        report_type: str,
        format: str = "csv",
        period: str = "30d"
    ) -> bytes:
        """Exporte un rapport au format CSV ou JSON"""
        try:
            if report_type == "users":
                data = await self.get_user_analytics(period)
            elif report_type == "financial":
                data = await self.get_financial_report(period)
            elif report_type == "content":
                data = await self.get_content_report()
            elif report_type == "moderation":
                data = await self.get_moderation_report()
            else:
                data = await self.get_platform_stats()
            
            if format == "csv":
                return await self._to_csv(data, report_type)
            else:
                import json
                return json.dumps(data, indent=2, default=str).encode('utf-8')
            
        except Exception as e:
            logger.error(f"Error exporting report: {e}")
            return b""
    
    async def _to_csv(self, data: Dict, report_type: str) -> bytes:
        """Convertit un dictionnaire en CSV"""
        try:
            import csv
            from io import StringIO
            
            output = StringIO()
            writer = csv.writer(output)
            
            if report_type == "users":
                writer.writerow(["Date", "Nouveaux utilisateurs"])
                for item in data.get("daily_growth", []):
                    writer.writerow([item["date"], item["count"]])
            
            elif report_type == "financial":
                writer.writerow(["Période", "Montant"])
                for item in data.get("revenue_by_period", []):
                    writer.writerow([item["period"], item["amount"]])
            
            else:
                writer.writerow(["Métrique", "Valeur"])
                for key, value in data.items():
                    if not isinstance(value, (list, dict)):
                        writer.writerow([key, value])
            
            return output.getvalue().encode('utf-8')
            
        except Exception as e:
            logger.error(f"Error converting to CSV: {e}")
            return b""

# Instance singleton
reporting_service = ReportingService()
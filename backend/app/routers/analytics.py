# backend/app/routers/analytics.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import db
from app.core.security import get_current_user, get_current_artist, get_current_seller

router = APIRouter()

# ==================== ANALYTICS GÉNÉRAUX ====================

@router.get("/platform/stats")
async def get_platform_stats(
    current_user: dict = Depends(get_current_user)
):
    """Récupère les statistiques globales de la plateforme"""
    try:
        # Nombre total d'utilisateurs
        users_count = db.table('users').select('id', count='exact').execute()
        
        # Nombre de morceaux
        tracks_count = db.table('tracks').select('id', count='exact').execute()
        
        # Nombre de matchs
        matches_count = db.table('matches').select('id', count='exact').eq('status', 'matched').execute()
        
        # Nombre de posts
        posts_count = db.table('posts').select('id', count='exact').execute()
        
        # Nombre de commandes
        orders_count = db.table('orders').select('id', count='exact').execute()
        
        # Nombre de lives
        lives_count = db.table('lives').select('id', count='exact').execute()
        
        # Total des écoutes
        tracks = db.table('tracks').select('play_count').execute()
        total_plays = sum(t.get('play_count', 0) for t in tracks.data)
        
        # Total des revenus (simplifié)
        orders = db.table('orders').select('total_amount').eq('status', 'delivered').execute()
        total_revenue = sum(o.get('total_amount', 0) for o in orders.data)
        
        return {
            "total_users": users_count.count,
            "total_tracks": tracks_count.count,
            "total_matches": matches_count.count,
            "total_posts": posts_count.count,
            "total_orders": orders_count.count,
            "total_lives": lives_count.count,
            "total_plays": total_plays,
            "total_revenue": total_revenue
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/platform/trending")
async def get_trending_stats(
    period: str = Query("7d", regex="^(24h|7d|30d)$"),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les tendances de la plateforme"""
    try:
        # Définir la période
        now = datetime.now()
        if period == "24h":
            start_date = now - timedelta(hours=24)
        elif period == "7d":
            start_date = now - timedelta(days=7)
        else:
            start_date = now - timedelta(days=30)
        
        start_iso = start_date.isoformat()
        
        # Morceaux tendances
        trending_tracks = db.table('tracks').select('*, artist:users(id, username, avatar_url)')\
            .eq('is_public', True)\
            .order('play_count', desc=True)\
            .limit(10)\
            .execute()
        
        # Artistes tendances
        trending_artists = db.table('users').select('id, username, avatar_url, tracks:artists!inner(*)')\
            .eq('role', 'artist')\
            .order('tracks.play_count', desc=True)\
            .limit(10)\
            .execute()
        
        # Hashtags tendances
        recent_posts = db.table('posts').select('hashtags')\
            .gte('created_at', start_iso)\
            .execute()
        
        hashtag_counts = {}
        for post in recent_posts.data:
            for tag in post.get('hashtags', []):
                hashtag_counts[tag] = hashtag_counts.get(tag, 0) + 1
        
        trending_hashtags = sorted(hashtag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "trending_tracks": trending_tracks.data,
            "trending_artists": trending_artists.data,
            "trending_hashtags": [{"tag": h[0], "count": h[1]} for h in trending_hashtags]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ANALYTICS UTILISATEUR ====================

@router.get("/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère les statistiques d'un utilisateur"""
    try:
        # Vérifier les permissions (profil public ou propriétaire)
        user = db.table('users').select('is_private').eq('id', user_id).execute()
        if user.data and user.data[0].get('is_private') and user_id != current_user['id']:
            raise HTTPException(status_code=403, detail="Private profile")
        
        # Nombre de posts
        posts_count = db.table('posts').select('id', count='exact').eq('user_id', user_id).execute()
        
        # Nombre de likes reçus
        posts = db.table('posts').select('id').eq('user_id', user_id).execute()
        post_ids = [p['id'] for p in posts.data]
        
        likes_received = 0
        if post_ids:
            likes_count = db.table('likes').select('id', count='exact').in_('post_id', post_ids).execute()
            likes_received = likes_count.count
        
        # Nombre d'abonnés
        followers_count = db.table('follows').select('id', count='exact').eq('following_id', user_id).execute()
        
        # Nombre d'abonnements
        following_count = db.table('follows').select('id', count='exact').eq('follower_id', user_id).execute()
        
        # Nombre de matchs
        matches_count = db.table('matches').select('id', count='exact')\
            .or_(f'user1_id.eq.{user_id},user2_id.eq.{user_id}')\
            .eq('status', 'matched')\
            .execute()
        
        return {
            "user_id": user_id,
            "posts_count": posts_count.count,
            "likes_received": likes_received,
            "followers_count": followers_count.count,
            "following_count": following_count.count,
            "matches_count": matches_count.count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Récupère l'activité récente d'un utilisateur"""
    try:
        # Récupérer les posts récents
        posts = db.table('posts').select('id, type, media_urls, caption, created_at')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        # Récupérer les likes récents
        likes = db.table('likes').select('post_id, created_at')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        # Récupérer les commentaires récents
        comments = db.table('comments').select('post_id, content, created_at')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        
        # Construire le timeline
        activities = []
        
        for post in posts.data:
            activities.append({
                "type": "post",
                "id": post['id'],
                "data": post,
                "created_at": post['created_at']
            })
        
        for like in likes.data:
            activities.append({
                "type": "like",
                "id": like['post_id'],
                "data": like,
                "created_at": like['created_at']
            })
        
        for comment in comments.data:
            activities.append({
                "type": "comment",
                "id": comment['post_id'],
                "data": comment,
                "created_at": comment['created_at']
            })
        
        # Trier par date
        activities.sort(key=lambda x: x['created_at'], reverse=True)
        
        return {
            "data": activities[:limit],
            "total": len(activities)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ANALYTICS ARTISTE ====================

@router.get("/artist/overview")
async def get_artist_overview(
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_artist)
):
    """Récupère les statistiques avancées pour un artiste"""
    try:
        user_id = current_user['id']
        
        # Définir la période
        now = datetime.now()
        if period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=90)
        
        start_iso = start_date.isoformat()
        
        # Récupérer les morceaux
        tracks = db.table('tracks').select('*').eq('artist_id', user_id).execute()
        
        # Écoutes par jour
        # En production, utiliser une table d'historique des écoutes
        # Ici simulation avec les données existantes
        plays_by_day = []
        for i in range(7):
            date = (now - timedelta(days=i)).date().isoformat()
            plays_by_day.append({
                "date": date,
                "plays": 0  # À implémenter avec historique réel
            })
        
        # Répartition géographique des fans
        followers = db.table('follows').select('follower_id').eq('following_id', user_id).execute()
        follower_ids = [f['follower_id'] for f in followers.data]
        
        geo_distribution = {}
        for fid in follower_ids:
            user = db.table('users').select('country').eq('id', fid).execute()
            if user.data and user.data[0].get('country'):
                country = user.data[0]['country']
                geo_distribution[country] = geo_distribution.get(country, 0) + 1
        
        # Démographie des fans
        age_distribution = {"18-24": 0, "25-34": 0, "35-44": 0, "45+": 0}
        gender_distribution = {"male": 0, "female": 0, "other": 0}
        
        for fid in follower_ids:
            user = db.table('users').select('date_of_birth, gender').eq('id', fid).execute()
            if user.data:
                # Âge
                if user.data[0].get('date_of_birth'):
                    from datetime import date
                    birth = date.fromisoformat(user.data[0]['date_of_birth'])
                    today = date.today()
                    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
                    
                    if age < 25:
                        age_distribution["18-24"] += 1
                    elif age < 35:
                        age_distribution["25-34"] += 1
                    elif age < 45:
                        age_distribution["35-44"] += 1
                    else:
                        age_distribution["45+"] += 1
                
                # Genre
                gender = user.data[0].get('gender')
                if gender in gender_distribution:
                    gender_distribution[gender] += 1
        
        # Heures d'activité des fans
        # En production, utiliser les données de connexion
        hourly_activity = [0] * 24
        
        return {
            "total_plays": sum(t.get('play_count', 0) for t in tracks.data),
            "total_followers": len(followers.data),
            "plays_by_day": plays_by_day,
            "geo_distribution": [{"country": c, "count": cnt} for c, cnt in geo_distribution.items()],
            "age_distribution": age_distribution,
            "gender_distribution": gender_distribution,
            "hourly_activity": hourly_activity,
            "top_tracks": sorted(tracks.data, key=lambda x: x.get('play_count', 0), reverse=True)[:5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/artist/track/{track_id}")
async def get_track_analytics(
    track_id: str,
    current_user: dict = Depends(get_current_artist)
):
    """Récupère les statistiques détaillées d'un morceau"""
    try:
        # Vérifier que le morceau appartient à l'artiste
        track = db.table('tracks').select('artist_id').eq('id', track_id).execute()
        if not track.data or track.data[0]['artist_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Récupérer le morceau complet
        track_data = db.table('tracks').select('*').eq('id', track_id).execute()
        
        # Compter les likes
        likes_count = db.table('track_likes').select('id', count='exact').eq('track_id', track_id).execute()
        
        # Compter les ajouts en playlist
        playlist_count = db.table('playlist_tracks').select('id', count='exact').eq('track_id', track_id).execute()
        
        return {
            "track": track_data.data[0],
            "plays": track_data.data[0].get('play_count', 0),
            "likes": likes_count.count,
            "added_to_playlists": playlist_count.count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== ANALYTICS VENDEUR ====================

@router.get("/seller/overview")
async def get_seller_overview(
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_seller)
):
    """Récupère les statistiques avancées pour un vendeur"""
    try:
        user_id = current_user['id']
        
        # Définir la période
        now = datetime.now()
        if period == "7d":
            start_date = now - timedelta(days=7)
        elif period == "30d":
            start_date = now - timedelta(days=30)
        else:
            start_date = now - timedelta(days=90)
        
        start_iso = start_date.isoformat()
        
        # Récupérer les produits
        products = db.table('products').select('*').eq('seller_id', user_id).execute()
        product_ids = [p['id'] for p in products.data]
        
        if not product_ids:
            return {
                "sales_by_day": [],
                "top_products": [],
                "customer_retention": 0,
                "average_order_value": 0,
                "return_rate": 0
            }
        
        # Ventes par jour
        order_items = db.table('order_items').select('*, order:orders(*)')\
            .in_('product_id', product_ids)\
            .gte('order.created_at', start_iso)\
            .execute()
        
        sales_by_day = {}
        for item in order_items.data:
            if item['order']['status'] == 'delivered':
                date = item['order']['created_at'][:10]
                if date not in sales_by_day:
                    sales_by_day[date] = 0
                sales_by_day[date] += item['quantity'] * item['price_at_time']
        
        # Top produits
        product_sales = {}
        for item in order_items.data:
            pid = item['product_id']
            if pid not in product_sales:
                product_sales[pid] = {"quantity": 0, "revenue": 0}
            product_sales[pid]["quantity"] += item['quantity']
            product_sales[pid]["revenue"] += item['quantity'] * item['price_at_time']
        
        top_products = []
        for pid, data in sorted(product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)[:10]:
            product = next((p for p in products.data if p['id'] == pid), None)
            if product:
                top_products.append({
                    "product_id": pid,
                    "name": product['name'],
                    "image": product['images'][0] if product['images'] else None,
                    "quantity_sold": data["quantity"],
                    "revenue": data["revenue"]
                })
        
        # Valeur moyenne des commandes
        orders = {}
        for item in order_items.data:
            oid = item['order_id']
            if oid not in orders:
                orders[oid] = {"total": 0, "status": item['order']['status']}
            orders[oid]["total"] += item['quantity'] * item['price_at_time']
        
        completed_orders = [o for o in orders.values() if o["status"] == "delivered"]
        avg_order_value = sum(o["total"] for o in completed_orders) / len(completed_orders) if completed_orders else 0
        
        # Taux de retour (commandes en litige)
        disputed_orders = [o for o in orders.values() if o["status"] == "disputed"]
        return_rate = len(disputed_orders) / len(orders) * 100 if orders else 0
        
        # Fidélisation client
        customer_orders = {}
        for item in order_items.data:
            buyer_id = item['order']['buyer_id']
            if buyer_id not in customer_orders:
                customer_orders[buyer_id] = []
            customer_orders[buyer_id].append(item['order_id'])
        
        repeat_customers = sum(1 for orders_list in customer_orders.values() if len(orders_list) > 1)
        customer_retention = (repeat_customers / len(customer_orders) * 100) if customer_orders else 0
        
        return {
            "sales_by_day": [{"date": d, "amount": a} for d, a in sorted(sales_by_day.items())],
            "top_products": top_products,
            "average_order_value": round(avg_order_value, 2),
            "return_rate": round(return_rate, 2),
            "customer_retention": round(customer_retention, 2)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/seller/product/{product_id}")
async def get_product_analytics(
    product_id: str,
    current_user: dict = Depends(get_current_seller)
):
    """Récupère les statistiques détaillées d'un produit"""
    try:
        # Vérifier que le produit appartient au vendeur
        product = db.table('products').select('seller_id').eq('id', product_id).execute()
        if not product.data or product.data[0]['seller_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Récupérer le produit complet
        product_data = db.table('products').select('*').eq('id', product_id).execute()
        
        # Récupérer les ventes
        order_items = db.table('order_items').select('*, order:orders(*)')\
            .eq('product_id', product_id)\
            .execute()
        
        total_sold = sum(item['quantity'] for item in order_items.data)
        total_revenue = sum(item['quantity'] * item['price_at_time'] for item in order_items.data)
        
        # Récupérer les avis
        reviews = db.table('reviews').select('rating, comment')\
            .eq('product_id', product_id)\
            .execute()
        
        avg_rating = sum(r['rating'] for r in reviews.data) / len(reviews.data) if reviews.data else 0
        review_count = len(reviews.data)
        
        return {
            "product": product_data.data[0],
            "total_sold": total_sold,
            "total_revenue": total_revenue,
            "average_rating": round(avg_rating, 1),
            "review_count": review_count,
            "reviews": reviews.data[:5]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
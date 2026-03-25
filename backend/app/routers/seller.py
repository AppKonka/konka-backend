# backend/app/routers/seller.py
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import db
from app.core.security import get_current_seller
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/dashboard/stats")
async def get_seller_stats(
    period: str = Query("30d", regex="^(7d|30d|90d)$"),
    current_user: dict = Depends(get_current_seller)
):
    """Récupère les statistiques du vendeur"""
    try:
        user_id = current_user['id']
        
        # Récupérer les produits
        products = db.table('products').select('*').eq('seller_id', user_id).execute()
        
        # Récupérer les commandes contenant ces produits
        product_ids = [p['id'] for p in products.data]
        
        if not product_ids:
            return {
                "total_revenue": 0,
                "total_orders": 0,
                "total_products": 0,
                "total_customers": 0,
                "average_rating": 0,
                "top_products": []
            }
        
        order_items = db.table('order_items').select('*, order:orders(*)')\
            .in_('product_id', product_ids)\
            .execute()
        
        # Calculer les stats
        total_revenue = 0
        orders_set = set()
        customers_set = set()
        
        for item in order_items.data:
            if item['order']['status'] == 'delivered':
                total_revenue += item['quantity'] * item['price_at_time']
                orders_set.add(item['order_id'])
                customers_set.add(item['order']['buyer_id'])
        
        # Top 5 des produits
        product_sales = {}
        for item in order_items.data:
            product_id = item['product_id']
            if product_id not in product_sales:
                product_sales[product_id] = {"quantity": 0, "revenue": 0, "name": None}
            product_sales[product_id]["quantity"] += item['quantity']
            product_sales[product_id]["revenue"] += item['quantity'] * item['price_at_time']
        
        # Associer les noms
        for product in products.data:
            if product['id'] in product_sales:
                product_sales[product['id']]["name"] = product['name']
        
        top_products = sorted(product_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)[:5]
        
        # Calculer la note moyenne
        reviews = db.table('reviews').select('rating')\
            .in_('product_id', product_ids)\
            .execute()
        
        avg_rating = sum(r['rating'] for r in reviews.data) / len(reviews.data) if reviews.data else 0
        
        # Calculer l'évolution
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        previous_orders = sum(1 for item in order_items.data if item['order']['created_at'] < week_ago)
        current_orders = sum(1 for item in order_items.data if item['order']['created_at'] >= week_ago)
        
        return {
            "total_revenue": total_revenue,
            "total_orders": len(orders_set),
            "total_products": len(products.data),
            "total_customers": len(customers_set),
            "average_rating": round(avg_rating, 1),
            "top_products": [
                {
                    "id": pid,
                    "name": data["name"],
                    "quantity": data["quantity"],
                    "revenue": data["revenue"]
                }
                for pid, data in top_products
            ],
            "weekly_growth": ((current_orders - previous_orders) / previous_orders * 100) if previous_orders > 0 else 100
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders")
async def get_seller_orders(
    status: Optional[str] = Query(None, regex="^(pending|confirmed|shipped|delivered|disputed)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_seller)
):
    """Récupère les commandes contenant les produits du vendeur"""
    try:
        user_id = current_user['id']
        
        # Récupérer les produits du vendeur
        products = db.table('products').select('id').eq('seller_id', user_id).execute()
        product_ids = [p['id'] for p in products.data]
        
        if not product_ids:
            return {"data": [], "total": 0}
        
        # Récupérer les order_items
        order_items = db.table('order_items').select('*, order:orders(*), product:products(*)')\
            .in_('product_id', product_ids)\
            .order('order.created_at', desc=True)\
            .execute()
        
        # Regrouper par order_id
        orders_map = {}
        for item in order_items.data:
            order_id = item['order_id']
            if order_id not in orders_map:
                orders_map[order_id] = {
                    "id": order_id,
                    "buyer_id": item['order']['buyer_id'],
                    "status": item['order']['status'],
                    "total_amount": item['order']['total_amount'],
                    "shipping_address": item['order']['shipping_address'],
                    "tracking_number": item['order'].get('tracking_number'),
                    "created_at": item['order']['created_at'],
                    "items": []
                }
            orders_map[order_id]["items"].append({
                "product_id": item['product_id'],
                "product_name": item['product']['name'],
                "product_image": item['product']['images'][0] if item['product']['images'] else None,
                "quantity": item['quantity'],
                "price_at_time": item['price_at_time']
            })
        
        orders = list(orders_map.values())
        
        # Filtrer par statut
        if status:
            orders = [o for o in orders if o['status'] == status]
        
        return {
            "data": orders[offset:offset + limit],
            "total": len(orders)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/orders/{order_id}/ship")
async def ship_order(
    order_id: str,
    tracking_number: Optional[str] = None,
    current_user: dict = Depends(get_current_seller)
):
    """Marque une commande comme expédiée"""
    try:
        # Vérifier que la commande contient un produit du vendeur
        user_id = current_user['id']
        
        products = db.table('products').select('id').eq('seller_id', user_id).execute()
        product_ids = [p['id'] for p in products.data]
        
        order_items = db.table('order_items').select('*').eq('order_id', order_id).in_('product_id', product_ids).execute()
        
        if not order_items.data:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Vérifier si tous les produits de la commande sont expédiés
        all_items = db.table('order_items').select('*').eq('order_id', order_id).execute()
        all_products_shipped = True
        
        for item in all_items.data:
            # Vérifier si ce produit a un vendeur
            product = db.table('products').select('seller_id').eq('id', item['product_id']).execute()
            if product.data and product.data[0]['seller_id'] != user_id:
                # Ce produit n'est pas au vendeur actuel, vérifier s'il est déjà expédié
                # En production, garder un statut par vendeur
                pass
        
        # Mettre à jour le statut de la commande
        db.table('orders').update({
            "status": "shipped",
            "tracking_number": tracking_number,
            "shipped_at": datetime.now().isoformat()
        }).eq('id', order_id).execute()
        
        # Notifier l'acheteur
        order = db.table('orders').select('buyer_id').eq('id', order_id).execute()
        if order.data:
            await notification_service.notify_order_status_change(
                buyer_id=order.data[0]['buyer_id'],
                order_id=order_id,
                status="shipped"
            )
        
        return {"message": "Order marked as shipped"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics")
async def get_seller_analytics(
    current_user: dict = Depends(get_current_seller)
):
    """Récupère les analyses avancées pour le vendeur"""
    try:
        user_id = current_user['id']
        
        # Récupérer les produits
        products = db.table('products').select('*').eq('seller_id', user_id).execute()
        product_ids = [p['id'] for p in products.data]
        
        if not product_ids:
            return {
                "daily_sales": [],
                "top_customers": [],
                "conversion_rate": 0,
                "inventory_alerts": []
            }
        
        # Ventes quotidiennes (30 derniers jours)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        order_items = db.table('order_items').select('*, order:orders(*)')\
            .in_('product_id', product_ids)\
            .gte('order.created_at', thirty_days_ago)\
            .execute()
        
        daily_sales = {}
        for item in order_items.data:
            if item['order']['status'] == 'delivered':
                date = item['order']['created_at'][:10]
                if date not in daily_sales:
                    daily_sales[date] = 0
                daily_sales[date] += item['quantity'] * item['price_at_time']
        
        # Top clients
        customer_spending = {}
        for item in order_items.data:
            if item['order']['status'] == 'delivered':
                buyer_id = item['order']['buyer_id']
                if buyer_id not in customer_spending:
                    customer_spending[buyer_id] = 0
                customer_spending[buyer_id] += item['quantity'] * item['price_at_time']
        
        top_customers = []
        for buyer_id, total in sorted(customer_spending.items(), key=lambda x: x[1], reverse=True)[:10]:
            user = db.table('users').select('username, avatar_url').eq('id', buyer_id).execute()
            if user.data:
                top_customers.append({
                    "user_id": buyer_id,
                    "username": user.data[0]['username'],
                    "avatar_url": user.data[0]['avatar_url'],
                    "total_spent": total
                })
        
        # Taux de conversion (vues produits -> ventes)
        total_views = sum(p.get('view_count', 0) for p in products.data)
        total_sales = sum(item['quantity'] for item in order_items.data if item['order']['status'] == 'delivered')
        conversion_rate = (total_sales / total_views * 100) if total_views > 0 else 0
        
        # Alertes de stock
        low_stock_products = [p for p in products.data if p['stock'] > 0 and p['stock'] < 10]
        
        return {
            "daily_sales": [{"date": d, "amount": a} for d, a in sorted(daily_sales.items())],
            "top_customers": top_customers,
            "conversion_rate": round(conversion_rate, 2),
            "inventory_alerts": [
                {
                    "product_id": p['id'],
                    "name": p['name'],
                    "stock": p['stock'],
                    "image": p['images'][0] if p['images'] else None
                }
                for p in low_stock_products
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
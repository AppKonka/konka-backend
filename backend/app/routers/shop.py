# backend/app/routers/shop.py
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from typing import List, Optional
from datetime import datetime
import uuid

from app.database import db
from app.models.shop import ProductCreate, ProductUpdate, ProductResponse, OrderCreate, OrderResponse, CartResponse
from app.core.security import get_current_user, get_current_seller
from app.services.ai_service import ai_service
from app.services.notification_service import notification_service

router = APIRouter()

# ==================== PRODUITS ====================

@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    seller_id: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les produits avec filtres"""
    try:
        query = db.table('products').select('*, seller:users(id, username, avatar_url)')
        
        if category:
            query = query.eq('category', category)
        
        if q:
            query = query.or_(f'name.ilike.%{q}%,description.ilike.%{q}%')
        
        if min_price is not None:
            query = query.gte('price', min_price)
        
        if max_price is not None:
            query = query.lte('price', max_price)
        
        if seller_id:
            query = query.eq('seller_id', seller_id)
        
        result = query.eq('is_active', True).order('created_at', desc=True).range(offset, offset + limit - 1).execute()
        
        return result.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère un produit spécifique"""
    try:
        product = db.table('products').select('*, seller:users(id, username, avatar_url)')\
            .eq('id', product_id)\
            .execute()
        
        if not product.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return product.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/products", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    category: Optional[str] = Form(None),
    stock: int = Form(0),
    tags: str = Form(""),
    promotion_price: Optional[float] = Form(None),
    promotion_ends_at: Optional[str] = Form(None),
    images: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_seller)
):
    """Crée un nouveau produit (vendeur uniquement)"""
    try:
        image_urls = []
        
        for img in images:
            img_path = f"products/{current_user['id']}/{datetime.now().timestamp()}_{img.filename}"
            img_content = await img.read()
            db.storage("media").upload(img_path, img_content)
            img_url = db.storage("media").get_public_url(img_path)
            image_urls.append(img_url)
        
        # Générer la description avec IA si non fournie
        if not description:
            description = await ai_service.generate_description(
                product_name=name,
                category=category or "general",
                features=tags.split(',') if tags else []
            )
        
        product_data = {
            "seller_id": current_user['id'],
            "name": name,
            "description": description,
            "price": price,
            "currency": "USD",
            "images": image_urls,
            "category": category,
            "tags": tags.split(',') if tags else [],
            "stock": stock,
            "is_active": True,
            "promotion_price": promotion_price,
            "promotion_ends_at": promotion_ends_at,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = db.table('products').insert(product_data).execute()
        
        return result.data[0]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    updates: ProductUpdate,
    current_user: dict = Depends(get_current_seller)
):
    """Met à jour un produit"""
    try:
        product = db.table('products').select('seller_id').eq('id', product_id).execute()
        if not product.data or product.data[0]['seller_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        update_data = updates.dict(exclude_unset=True)
        if update_data:
            update_data['updated_at'] = datetime.now().isoformat()
            result = db.table('products').update(update_data).eq('id', product_id).execute()
            return result.data[0]
        
        return product.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_seller)
):
    """Supprime un produit"""
    try:
        product = db.table('products').select('seller_id').eq('id', product_id).execute()
        if not product.data or product.data[0]['seller_id'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        db.table('products').delete().eq('id', product_id).execute()
        
        return {"message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== PANIER ====================

@router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """Récupère le panier de l'utilisateur"""
    try:
        cart_items = db.table('cart_items').select('*, product:products(*)')\
            .eq('user_id', current_user['id'])\
            .execute()
        
        items = []
        total = 0
        for item in cart_items.data:
            product = item['product']
            price = product['promotion_price'] if product.get('promotion_price') and product.get('promotion_ends_at') and product['promotion_ends_at'] > datetime.now().isoformat() else product['price']
            subtotal = price * item['quantity']
            total += subtotal
            items.append({
                "id": item['id'],
                "product_id": product['id'],
                "product_name": product['name'],
                "product_image": product['images'][0] if product['images'] else None,
                "price": price,
                "quantity": item['quantity'],
                "subtotal": subtotal
            })
        
        return {
            "items": items,
            "total": total,
            "item_count": len(items)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cart/add")
async def add_to_cart(
    product_id: str,
    quantity: int = Query(1, ge=1),
    current_user: dict = Depends(get_current_user)
):
    """Ajoute un produit au panier"""
    try:
        # Vérifier le stock
        product = db.table('products').select('stock, is_active').eq('id', product_id).execute()
        if not product.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if not product.data[0]['is_active']:
            raise HTTPException(status_code=400, detail="Product is not active")
        
        if product.data[0]['stock'] < quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        # Vérifier si déjà dans le panier
        existing = db.table('cart_items').select('id, quantity')\
            .eq('user_id', current_user['id'])\
            .eq('product_id', product_id)\
            .execute()
        
        if existing.data:
            # Mettre à jour la quantité
            new_quantity = existing.data[0]['quantity'] + quantity
            if product.data[0]['stock'] < new_quantity:
                raise HTTPException(status_code=400, detail="Insufficient stock")
            
            db.table('cart_items').update({
                "quantity": new_quantity,
                "updated_at": datetime.now().isoformat()
            }).eq('id', existing.data[0]['id']).execute()
        else:
            # Ajouter au panier
            db.table('cart_items').insert({
                "user_id": current_user['id'],
                "product_id": product_id,
                "quantity": quantity,
                "price_at_time": product.data[0]['price'],
                "created_at": datetime.now().isoformat()
            }).execute()
        
        return {"message": "Product added to cart"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/cart/update/{cart_item_id}")
async def update_cart_item(
    cart_item_id: str,
    quantity: int = Query(..., ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Met à jour la quantité d'un article dans le panier"""
    try:
        if quantity == 0:
            # Supprimer l'article
            db.table('cart_items').delete().eq('id', cart_item_id).eq('user_id', current_user['id']).execute()
            return {"message": "Item removed from cart"}
        
        # Vérifier le stock
        cart_item = db.table('cart_items').select('product_id').eq('id', cart_item_id).eq('user_id', current_user['id']).execute()
        if not cart_item.data:
            raise HTTPException(status_code=404, detail="Cart item not found")
        
        product = db.table('products').select('stock').eq('id', cart_item.data[0]['product_id']).execute()
        if product.data and product.data[0]['stock'] < quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        db.table('cart_items').update({
            "quantity": quantity,
            "updated_at": datetime.now().isoformat()
        }).eq('id', cart_item_id).eq('user_id', current_user['id']).execute()
        
        return {"message": "Cart updated"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cart/clear")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Vide le panier"""
    try:
        db.table('cart_items').delete().eq('user_id', current_user['id']).execute()
        return {"message": "Cart cleared"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== COMMANDES ====================

@router.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crée une commande à partir du panier"""
    try:
        # Récupérer le panier
        cart_items = db.table('cart_items').select('*, product:products(*)')\
            .eq('user_id', current_user['id'])\
            .execute()
        
        if not cart_items.data:
            raise HTTPException(status_code=400, detail="Cart is empty")
        
        # Calculer le total et vérifier les stocks
        total = 0
        items = []
        for item in cart_items.data:
            product = item['product']
            if product['stock'] < item['quantity']:
                raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
            
            price = product['promotion_price'] if product.get('promotion_price') and product.get('promotion_ends_at') and product['promotion_ends_at'] > datetime.now().isoformat() else product['price']
            subtotal = price * item['quantity']
            total += subtotal
            
            items.append({
                "product_id": product['id'],
                "quantity": item['quantity'],
                "price_at_time": price
            })
        
        # Créer la commande
        order_id = str(uuid.uuid4())
        order_result = db.table('orders').insert({
            "id": order_id,
            "buyer_id": current_user['id'],
            "status": "pending",
            "total_amount": total,
            "shipping_address": order_data.shipping_address,
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # Créer les items de commande
        for item in items:
            db.table('order_items').insert({
                "order_id": order_id,
                "product_id": item['product_id'],
                "quantity": item['quantity'],
                "price_at_time": item['price_at_time']
            }).execute()
            
            # Mettre à jour le stock
            product = db.table('products').select('stock').eq('id', item['product_id']).execute()
            db.table('products').update({
                "stock": product.data[0]['stock'] - item['quantity']
            }).eq('id', item['product_id']).execute()
        
        # Vider le panier
        db.table('cart_items').delete().eq('user_id', current_user['id']).execute()
        
        # Notifier le vendeur
        for item in items:
            product = db.table('products').select('seller_id').eq('id', item['product_id']).execute()
            if product.data:
                await notification_service.notify_order_status_change(
                    buyer_id=current_user['id'],
                    order_id=order_id,
                    status="pending"
                )
        
        # Récupérer la commande complète
        order = db.table('orders').select('*, items:order_items(*, product:products(*))')\
            .eq('id', order_id)\
            .execute()
        
        return order.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les commandes de l'utilisateur"""
    try:
        orders = db.table('orders').select('*, items:order_items(*, product:products(*))')\
            .eq('buyer_id', current_user['id'])\
            .order('created_at', desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return orders.data or []
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Récupère une commande spécifique"""
    try:
        order = db.table('orders').select('*, items:order_items(*, product:products(*))')\
            .eq('id', order_id)\
            .eq('buyer_id', current_user['id'])\
            .execute()
        
        if not order.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== FAVORIS ====================

@router.get("/favorites")
async def get_favorites(
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """Récupère les produits favoris de l'utilisateur"""
    try:
        favorites = db.table('favorites').select('product:products(*, seller:users(id, username))')\
            .eq('user_id', current_user['id'])\
            .range(offset, offset + limit - 1)\
            .execute()
        
        return {"data": [f['product'] for f in favorites.data]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/favorites/{product_id}")
async def add_to_favorites(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Ajoute un produit aux favoris"""
    try:
        existing = db.table('favorites').select('id')\
            .eq('user_id', current_user['id'])\
            .eq('product_id', product_id)\
            .execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Already in favorites")
        
        db.table('favorites').insert({
            "user_id": current_user['id'],
            "product_id": product_id,
            "created_at": datetime.now().isoformat()
        }).execute()
        
        return {"message": "Product added to favorites"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/favorites/{product_id}")
async def remove_from_favorites(
    product_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Supprime un produit des favoris"""
    try:
        result = db.table('favorites').delete()\
            .eq('user_id', current_user['id'])\
            .eq('product_id', product_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Favorite not found")
        
        return {"message": "Product removed from favorites"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
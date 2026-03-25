// src/modules/fan/pages/ProductDetail.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 100px;
`

const ImageGallery = styled.div`
  position: relative;
  height: 400px;
  background: ${props => props.theme.border};
`

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const Thumbnails = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const Thumbnail = styled(motion.img)`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
`

const Content = styled.div`
  padding: 16px;
`

const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  cursor: pointer;
`

const ProductName = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const ProductPrice = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 16px;
`

const OriginalPrice = styled.span`
  font-size: 16px;
  color: ${props => props.theme.textSecondary};
  text-decoration: line-through;
  margin-left: 8px;
`

const ProductDescription = styled.p`
  font-size: 15px;
  line-height: 1.5;
  color: ${props => props.theme.text};
  margin-bottom: 24px;
`

const ProductDetails = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`

const DetailLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const DetailValue = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.text};
`

const QuantitySelector = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`

const QuantityButton = styled(motion.button)`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.text};
`

const Quantity = styled.span`
  font-size: 18px;
  font-weight: 500;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
`

const FavoriteButton = styled(motion.button)`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`

const ReviewsSection = styled.div`
  margin-top: 24px;
`

const ReviewsTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const ReviewItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid ${props => props.theme.border};
`

const ReviewContent = styled.div`
  flex: 1;
`

const ReviewHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
`

const ReviewUsername = styled.span`
  font-weight: 600;
  font-size: 14px;
`

const ReviewRating = styled.div`
  display: flex;
  gap: 2px;
  margin-left: auto;
  color: #FFD700;
`

const ReviewComment = styled.p`
  font-size: 14px;
  line-height: 1.4;
  margin-top: 4px;
  color: ${props => props.theme.text};
`

const ProductDetail = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [seller, setSeller] = useState(null)
  const [reviews, setReviews] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [inCart, setInCart] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProduct()
    loadReviews()
    checkCart()
    checkFavorite()
  }, [productId])

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, seller:users(id, username, avatar_url)')
        .eq('id', productId)
        .single()
      
      if (error) throw error
      setProduct(data)
      setSeller(data.seller)
    } catch (error) {
      console.error('Error loading product:', error)
      navigate('/fan/shopping')
    }
  }

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*, user:users(id, username, avatar_url)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setReviews(data || [])
    } catch (error) {
      console.error('Error loading reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkCart = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
      
      if (error) throw error
      setInCart(data && data.length > 0)
    } catch (error) {
      console.error('Error checking cart:', error)
    }
  }

  const checkFavorite = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
      
      if (error) throw error
      setIsFavorite(data && data.length > 0)
    } catch (error) {
      console.error('Error checking favorite:', error)
    }
  }

  const handleAddToCart = async () => {
    try {
      if (inCart) {
        // Mettre à jour la quantité
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity })
          .eq('user_id', user.id)
          .eq('product_id', productId)
        
        if (error) throw error
        toast.success('Panier mis à jour')
      } else {
        // Ajouter au panier
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
            price_at_time: product.promotion_price || product.price
          })
        
        if (error) throw error
        setInCart(true)
        toast.success('Ajouté au panier')
      }
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Erreur lors de l\'ajout')
    }
  }

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId)
        
        if (error) throw error
        setIsFavorite(false)
        toast.success('Retiré des favoris')
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          })
        
        if (error) throw error
        setIsFavorite(true)
        toast.success('Ajouté aux favoris')
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleBuyNow = async () => {
    await handleAddToCart()
    navigate('/fan/shopping/cart')
  }

  if (!product) return null

  const currentPrice = product.promotion_price || product.price
  const hasPromotion = product.promotion_price && product.promotion_ends_at && new Date(product.promotion_ends_at) > new Date()

  return (
    <Container>
      <Header title="Détail produit" showBack />
      
      <ImageGallery>
        <MainImage src={product.images?.[selectedImage] || '/images/default-product.jpg'} alt={product.name} />
      </ImageGallery>
      
      {product.images && product.images.length > 1 && (
        <Thumbnails>
          {product.images.map((img, idx) => (
            <Thumbnail
              key={idx}
              src={img}
              active={selectedImage === idx}
              onClick={() => setSelectedImage(idx)}
              whileTap={{ scale: 0.95 }}
            />
          ))}
        </Thumbnails>
      )}
      
      <Content>
        <SellerInfo onClick={() => navigate(`/fan/seller/${seller?.id}`)}>
          <Avatar src={seller?.avatar_url} name={seller?.username} size={40} />
          <div>
            <div style={{ fontWeight: 500 }}>@{seller?.username}</div>
            <div style={{ fontSize: 12, color: '#888' }}>Vendeur</div>
          </div>
        </SellerInfo>
        
        <ProductName>{product.name}</ProductName>
        <ProductPrice>
          {currentPrice}€
          {hasPromotion && <OriginalPrice>{product.price}€</OriginalPrice>}
        </ProductPrice>
        
        <ProductDescription>{product.description}</ProductDescription>
        
        <ProductDetails>
          <DetailRow>
            <DetailLabel>Catégorie</DetailLabel>
            <DetailValue>{product.category || 'Non spécifiée'}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Stock</DetailLabel>
            <DetailValue>{product.stock > 0 ? `${product.stock} unités` : 'Rupture'}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Livraison</DetailLabel>
            <DetailValue>3-5 jours ouvrés</DetailValue>
          </DetailRow>
        </ProductDetails>
        
        {product.stock > 0 && (
          <>
            <QuantitySelector>
              <QuantityButton
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                whileTap={{ scale: 0.9 }}
                disabled={quantity <= 1}
              >
                -
              </QuantityButton>
              <Quantity>{quantity}</Quantity>
              <QuantityButton
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                whileTap={{ scale: 0.9 }}
                disabled={quantity >= product.stock}
              >
                +
              </QuantityButton>
            </QuantitySelector>
            
            <ActionButtons>
              <FavoriteButton onClick={handleToggleFavorite} whileTap={{ scale: 0.9 }}>
                {isFavorite ? '❤️' : '🤍'}
              </FavoriteButton>
              <Button
                variant="outline"
                onClick={handleAddToCart}
                fullWidth
              >
                {inCart ? 'Mettre à jour le panier' : 'Ajouter au panier'}
              </Button>
              <Button onClick={handleBuyNow} fullWidth>
                Acheter maintenant
              </Button>
            </ActionButtons>
          </>
        )}
        
        <ReviewsSection>
          <ReviewsTitle>⭐ Avis ({reviews.length})</ReviewsTitle>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
              Aucun avis pour le moment
            </div>
          ) : (
            reviews.map(review => (
              <ReviewItem key={review.id}>
                <Avatar src={review.user?.avatar_url} name={review.user?.username} size={32} />
                <ReviewContent>
                  <ReviewHeader>
                    <ReviewUsername>@{review.user?.username}</ReviewUsername>
                    <ReviewRating>
                      {[...Array(5)].map((_, i) => (
                        <span key={i}>{i < review.rating ? '⭐' : '☆'}</span>
                      ))}
                    </ReviewRating>
                  </ReviewHeader>
                  <ReviewComment>{review.comment}</ReviewComment>
                </ReviewContent>
              </ReviewItem>
            ))
          )}
        </ReviewsSection>
      </Content>
    </Container>
  )
}

export default ProductDetail
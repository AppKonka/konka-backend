// src/modules/fan/pages/SellerPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const CoverImage = styled.div`
  height: 150px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  position: relative;
`

const ProfileHeader = styled.div`
  position: relative;
  padding: 0 16px;
`

const AvatarWrapper = styled.div`
  position: absolute;
  top: -50px;
  left: 16px;
  border: 4px solid ${props => props.theme.background};
  border-radius: 50%;
`

const ProfileInfo = styled.div`
  margin-top: 60px;
  margin-bottom: 20px;
`

const StoreName = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const Username = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const Description = styled.p`
  font-size: 14px;
  color: ${props => props.theme.text};
  line-height: 1.4;
  margin-bottom: 16px;
`

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px 0;
  border-top: 1px solid ${props => props.theme.border};
  border-bottom: 1px solid ${props => props.theme.border};
`

const StatItem = styled.div`
  flex: 1;
  text-align: center;
`

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 20px 16px 12px;
  color: ${props => props.theme.text};
`

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px;
`

const ProductCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
`

const ProductImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`

const ProductInfo = styled.div`
  padding: 8px;
`

const ProductName = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ProductPrice = styled.div`
  font-size: 14px;
  color: ${props => props.theme.primary};
  font-weight: 600;
`

const ReviewItem = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.theme.surface};
  margin-bottom: 8px;
  border-radius: 12px;
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
  color: ${props => props.theme.text};
`

const ReviewRating = styled.div`
  display: flex;
  gap: 2px;
  color: #FFD700;
`

const ReviewComment = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const FollowButton = styled(motion.button)`
  position: absolute;
  top: 10px;
  right: 16px;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${props => props.following ? props.theme.surface : props.theme.primary};
  color: ${props => props.following ? props.theme.text : 'white'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
`

const SellerPage = () => {
  const { sellerId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [seller, setSeller] = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [stats, setStats] = useState({
    products: 0,
    sales: 0,
    rating: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSellerData()
    checkFollowStatus()
  }, [sellerId])

  const loadSellerData = async () => {
    setLoading(true)
    try {
      // Charger les infos du vendeur
      const { data: sellerData, error: sellerError } = await supabase
        .from('users')
        .select(`
          *,
          sellers:sellers(*)
        `)
        .eq('id', sellerId)
        .single()
      
      if (sellerError) throw sellerError
      setSeller(sellerData)
      
      // Charger les produits
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      
      setProducts(productsData || [])
      
      // Charger les avis
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('*, user:users(id, username, avatar_url)')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10)
      
      setReviews(reviewsData || [])
      
      // Calculer les stats
      const totalSales = productsData?.reduce((sum, p) => sum + (p.sold_count || 0), 0) || 0
      const avgRating = reviewsData?.reduce((sum, r) => sum + (r.rating || 0), 0) / (reviewsData?.length || 1) || 0
      
      setStats({
        products: productsData?.length || 0,
        sales: totalSales,
        rating: avgRating
      })
      
    } catch (error) {
      console.error('Error loading seller:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', sellerId)
      
      if (error) throw error
      setIsFollowing(data && data.length > 0)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', sellerId)
        setIsFollowing(false)
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: sellerId
          })
        setIsFollowing(true)
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <span key={i}>{i < Math.floor(rating) ? '⭐' : '☆'}</span>
    ))
  }

  if (loading) {
    return (
      <Container>
        <Header title="Boutique" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  if (!seller) {
    return (
      <Container>
        <Header title="Boutique" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Boutique non trouvée</div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Boutique" showBack />
      
      <CoverImage />
      
      <ProfileHeader>
        <AvatarWrapper>
          <Avatar
            src={seller.avatar_url}
            name={seller.sellers?.store_name || seller.display_name}
            size={80}
          />
        </AvatarWrapper>
        
        <FollowButton
          following={isFollowing}
          onClick={handleFollow}
          whileTap={{ scale: 0.95 }}
        >
          {isFollowing ? "Abonné" : "S'abonner"}
        </FollowButton>
        
        <ProfileInfo>
          <StoreName>{seller.sellers?.store_name || seller.display_name}</StoreName>
          <Username>@{seller.username}</Username>
          {seller.sellers?.store_description && (
            <Description>{seller.sellers.store_description}</Description>
          )}
        </ProfileInfo>
        
        <StatsContainer>
          <StatItem>
            <StatValue>{stats.products}</StatValue>
            <StatLabel>Produits</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.sales}</StatValue>
            <StatLabel>Ventes</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.rating.toFixed(1)}</StatValue>
            <StatLabel>Note</StatLabel>
          </StatItem>
        </StatsContainer>
      </ProfileHeader>
      
      {products.length > 0 && (
        <>
          <SectionTitle>Produits</SectionTitle>
          <ProductsGrid>
            {products.map(product => (
              <ProductCard
                key={product.id}
                onClick={() => navigate(`/fan/shopping/product/${product.id}`)}
                whileTap={{ scale: 0.98 }}
              >
                <ProductImage src={product.images?.[0] || '/images/default-product.jpg'} />
                <ProductInfo>
                  <ProductName>{product.name}</ProductName>
                  <ProductPrice>{product.price}€</ProductPrice>
                </ProductInfo>
              </ProductCard>
            ))}
          </ProductsGrid>
        </>
      )}
      
      {reviews.length > 0 && (
        <>
          <SectionTitle>Avis clients</SectionTitle>
          {reviews.map(review => (
            <ReviewItem key={review.id}>
              <Avatar
                src={review.user?.avatar_url}
                name={review.user?.username}
                size={40}
              />
              <ReviewContent>
                <ReviewHeader>
                  <ReviewUsername>@{review.user?.username}</ReviewUsername>
                  <ReviewRating>{renderStars(review.rating)}</ReviewRating>
                </ReviewHeader>
                <ReviewComment>{review.comment}</ReviewComment>
              </ReviewContent>
            </ReviewItem>
          ))}
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerPage
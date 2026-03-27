// frontend/src/modules/fan/pages/Wishlist.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderSection = styled.div`
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const Tab = styled(motion.button)`
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  cursor: pointer;
`

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
`

const ProductCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
`

const ProductImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: cover;
`

const ProductInfo = styled.div`
  padding: 12px;
`

const ProductName = styled.h3`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ProductPrice = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const RemoveButton = styled(motion.button)`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6);
  border: none;
  border-radius: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 18px;
  backdrop-filter: blur(4px);
  
  &:hover {
    background: rgba(0,0,0,0.8);
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
`

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin: 0 16px 16px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  justify-content: space-around;
`

const StatItem = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const Wishlist = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  const loadWishlist = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'products') {
        const { data, error } = await supabase
          .from('favorites')
          .select('*, product:products(*, seller:users(id, username))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        const productList = data?.map(f => f.product) || []
        setProducts(productList)
        
        console.log('🛍️ Produits favoris chargés:', productList.length)
      } else {
        const { data, error } = await supabase
          .from('track_likes')
          .select('*, track:tracks(*, artist:users(id, username))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        const trackList = data?.map(l => l.track) || []
        setTracks(trackList)
        
        console.log('🎵 Morceaux favoris chargés:', trackList.length)
      }
    } catch (error) {
      console.error('Error loading wishlist:', error)
      toast.error('Erreur lors du chargement de la wishlist')
    } finally {
      setLoading(false)
    }
  }, [activeTab, user.id])

  useEffect(() => {
    loadWishlist()
  }, [loadWishlist])

  const handleRemoveProduct = async (productId) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
      
      if (error) throw error
      
      setProducts(prev => prev.filter(p => p.id !== productId))
      toast.success('Produit retiré des favoris')
      console.log('🛍️ Produit retiré des favoris:', productId)
    } catch (error) {
      console.error('Error removing product:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleRemoveTrack = async (trackId) => {
    try {
      const { error } = await supabase
        .from('track_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId)
      
      if (error) throw error
      
      setTracks(prev => prev.filter(t => t.id !== trackId))
      toast.success('Morceau retiré des favoris')
      console.log('🎵 Morceau retiré des favoris:', trackId)
    } catch (error) {
      console.error('Error removing track:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const totalItems = activeTab === 'products' ? products.length : tracks.length
  const totalValue = activeTab === 'products' 
    ? products.reduce((sum, p) => sum + (p.price || 0), 0)
    : 0

  if (loading) {
    return (
      <Container>
        <Header title="Mes favoris" showBack />
        <LoadingSpinner>
          <div>Chargement de votre wishlist...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Mes favoris" showBack />
      
      <HeaderSection>
        <Title>Ma wishlist</Title>
      </HeaderSection>
      
      {totalItems > 0 && (
        <StatsBar>
          <StatItem>
            <StatValue>{totalItems}</StatValue>
            <StatLabel>Articles</StatLabel>
          </StatItem>
          {activeTab === 'products' && totalValue > 0 && (
            <StatItem>
              <StatValue>{totalValue}€</StatValue>
              <StatLabel>Valeur totale</StatLabel>
            </StatItem>
          )}
        </StatsBar>
      )}
      
      <TabsContainer>
        <Tab
          active={activeTab === 'products'}
          onClick={() => setActiveTab('products')}
        >
          Produits ({products.length})
        </Tab>
        <Tab
          active={activeTab === 'music'}
          onClick={() => setActiveTab('music')}
        >
          Musique ({tracks.length})
        </Tab>
      </TabsContainer>
      
      {activeTab === 'products' ? (
        products.length === 0 ? (
          <EmptyState>
            <div className="icon">🛍️</div>
            <div>Votre wishlist est vide</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Ajoutez des produits que vous aimez pour les retrouver ici
            </div>
            <Button onClick={() => navigate('/fan/shopping')} style={{ marginTop: 20 }}>
              Découvrir des produits
            </Button>
          </EmptyState>
        ) : (
          <ProductsGrid>
            {products.map(product => (
              <ProductCard
                key={product.id}
                onClick={() => navigate(`/fan/shopping/product/${product.id}`)}
                whileTap={{ scale: 0.98 }}
              >
                <ProductImage src={product.images?.[0] || '/images/default-product.jpg'} />
                <RemoveButton
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveProduct(product.id)
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </RemoveButton>
                <ProductInfo>
                  <ProductName>{product.name}</ProductName>
                  <ProductPrice>{product.price}€</ProductPrice>
                  {product.seller && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      par @{product.seller.username}
                    </div>
                  )}
                </ProductInfo>
              </ProductCard>
            ))}
          </ProductsGrid>
        )
      ) : (
        tracks.length === 0 ? (
          <EmptyState>
            <div className="icon">🎵</div>
            <div>Votre playlist est vide</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Aimez des morceaux pour les retrouver ici
            </div>
            <Button onClick={() => navigate('/fan/music')} style={{ marginTop: 20 }}>
              Découvrir de la musique
            </Button>
          </EmptyState>
        ) : (
          <ProductsGrid>
            {tracks.map(track => (
              <ProductCard
                key={track.id}
                onClick={() => navigate(`/fan/music/track/${track.id}`)}
                whileTap={{ scale: 0.98 }}
              >
                <ProductImage src={track.cover_url || '/images/default-album.jpg'} />
                <RemoveButton
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveTrack(track.id)
                  }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </RemoveButton>
                <ProductInfo>
                  <ProductName>{track.title}</ProductName>
                  <ProductPrice>{track.artist?.username}</ProductPrice>
                  {track.duration && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </ProductInfo>
              </ProductCard>
            ))}
          </ProductsGrid>
        )
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Wishlist
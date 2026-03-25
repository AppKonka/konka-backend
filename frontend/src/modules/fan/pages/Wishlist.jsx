// frontend/src/modules/fan/pages/Wishlist.jsx
import React, { useState, useEffect } from 'react'
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

const Wishlist = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWishlist()
  }, [activeTab])

  const loadWishlist = async () => {
    setLoading(true)
    try {
      if (activeTab === 'products') {
        const { data, error } = await supabase
          .from('favorites')
          .select('*, product:products(*, seller:users(id, username))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setProducts(data?.map(f => f.product) || [])
      } else {
        const { data, error } = await supabase
          .from('track_likes')
          .select('*, track:tracks(*, artist:users(id, username))')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (error) throw error
        setTracks(data?.map(l => l.track) || [])
      }
    } catch (error) {
      console.error('Error loading wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveProduct = async (productId) => {
    try {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
      
      setProducts(prev => prev.filter(p => p.id !== productId))
      toast.success('Produit retiré des favoris')
    } catch (error) {
      console.error('Error removing product:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleRemoveTrack = async (trackId) => {
    try {
      await supabase
        .from('track_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('track_id', trackId)
      
      setTracks(prev => prev.filter(t => t.id !== trackId))
      toast.success('Morceau retiré des favoris')
    } catch (error) {
      console.error('Error removing track:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <Container>
      <Header title="Mes favoris" showBack />
      
      <HeaderSection>
        <Title>Ma wishlist</Title>
      </HeaderSection>
      
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
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      ) : activeTab === 'products' ? (
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
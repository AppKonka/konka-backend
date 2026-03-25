// src/modules/fan/pages/Shopping.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const SearchSection = styled.div`
  padding: 16px;
  display: flex;
  gap: 12px;
`

const SearchInput = styled.div`
  flex: 1;
  position: relative;
  
  input {
    width: 100%;
    padding: 12px 16px 12px 44px;
    border-radius: 28px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
  
  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 18px;
  }
`

const VoiceButton = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.listening {
    background: ${props => props.theme.primary};
    color: white;
    border-color: ${props => props.theme.primary};
  }
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const Tab = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 24px;
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  border: none;
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
`

const ProductsGrid = styled.div`
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`

const ProductCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadow.sm};
`

const ProductImage = styled.div`
  height: 150px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: ${props => props.theme.primary};
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
  }
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

const ProductSeller = styled.p`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

const ProductPrice = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 8px;
`

const ProductActions = styled.div`
  display: flex;
  gap: 8px;
`

const LikeButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: ${props => props.liked ? '#FF4444' : props.theme.textSecondary};
`

const AddToCartButton = styled(motion.button)`
  flex: 1;
  padding: 6px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.primary};
  background: transparent;
  color: ${props => props.theme.primary};
  font-size: 12px;
  cursor: pointer;
`

const VoiceModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const VoiceWave = styled(motion.div)`
  width: 200px;
  height: 200px;
  border-radius: 100px;
  background: ${props => props.theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
  
  .mic {
    font-size: 80px;
    color: white;
  }
`

const VoiceText = styled.p`
  color: white;
  font-size: 18px;
  text-align: center;
  padding: 0 40px;
`

const VoiceClose = styled.button`
  position: absolute;
  top: 40px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const GPSButton = styled(motion.button)`
  position: fixed;
  bottom: 90px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 28px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadow.lg};
  z-index: 20;
`

const categories = [
  { id: 'all', label: 'Tous' },
  { id: 'clothing', label: 'Vêtements' },
  { id: 'music', label: 'Musique' },
  { id: 'instruments', label: 'Instruments' },
  { id: 'merch', label: 'Merch' },
  { id: 'art', label: 'Artisanat' },
]

const Shopping = () => {
  const [activeCategory, setActiveCategory] = useState('all')
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuth()

  useEffect(() => {
    loadProducts()
    loadCart()
    loadFavorites()
  }, [activeCategory, searchQuery])

  const loadProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:users(id, username, avatar_url)
        `)
        .eq('is_active', true)
      
      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory)
      }
      
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false }).limit(20)
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCart = async () => {
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
      
      if (error) throw error
      setCart(data || [])
    } catch (error) {
      console.error('Error loading cart:', error)
    }
  }

  const loadFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id)
      
      if (error) throw error
      setFavorites(data?.map(f => f.product_id) || [])
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  const handleAddToCart = async (product) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: product.id,
          quantity: 1,
          price: product.price,
        })
      
      if (error) throw error
      
      loadCart()
    } catch (error) {
      console.error('Error adding to cart:', error)
    }
  }

  const handleToggleFavorite = async (product) => {
    try {
      const isFavorite = favorites.includes(product.id)
      
      if (isFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id)
        
        if (error) throw error
        setFavorites(favorites.filter(id => id !== product.id))
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: product.id,
          })
        
        if (error) throw error
        setFavorites([...favorites, product.id])
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const startVoiceSearch = () => {
    setIsListening(true)
    
    // Vérifier si le navigateur supporte la reconnaissance vocale
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognition = new SpeechRecognition()
      recognition.lang = 'fr-FR'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript
        setVoiceText(text)
        setSearchQuery(text)
        setTimeout(() => {
          setIsListening(false)
          setVoiceText('')
        }, 2000)
      }
      
      recognition.onerror = () => {
        setIsListening(false)
        setVoiceText('')
      }
      
      recognition.start()
    } else {
      // Fallback: afficher un message
      alert('La reconnaissance vocale n\'est pas supportée par votre navigateur')
      setIsListening(false)
    }
  }

  const handleGPS = () => {
    // Naviguer vers la carte GPS Shopping
    console.log('Open GPS Shopping')
  }

  return (
    <Container>
      <Header title="Shopping" showProfile />
      
      <SearchSection>
        <SearchInput>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchInput>
        <VoiceButton
          onClick={startVoiceSearch}
          className={isListening ? 'listening' : ''}
          whileTap={{ scale: 0.95 }}
        >
          🎙️
        </VoiceButton>
      </SearchSection>
      
      <TabsContainer>
        {categories.map(cat => (
          <Tab
            key={cat.id}
            active={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            whileTap={{ scale: 0.95 }}
          >
            {cat.label}
          </Tab>
        ))}
      </TabsContainer>
      
      <ProductsGrid>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, gridColumn: 'span 2' }}>
            Chargement...
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', gridColumn: 'span 2' }}>
            Aucun produit trouvé
          </div>
        ) : (
          products.map(product => (
            <ProductCard
              key={product.id}
              whileTap={{ scale: 0.98 }}
            >
              <ProductImage>
                <img src={product.images?.[0] || '/images/default-product.jpg'} alt={product.name} />
                {product.promotion_price && (
                  <span className="badge">Promo</span>
                )}
              </ProductImage>
              <ProductInfo>
                <ProductName>{product.name}</ProductName>
                <ProductSeller>@{product.seller?.username}</ProductSeller>
                <ProductPrice>
                  {product.promotion_price ? (
                    <>
                      <span style={{ textDecoration: 'line-through', fontSize: 12, color: '#888' }}>
                        {product.price}€
                      </span>
                      {' '}{product.promotion_price}€
                    </>
                  ) : (
                    `${product.price}€`
                  )}
                </ProductPrice>
                <ProductActions>
                  <LikeButton
                    liked={favorites.includes(product.id)}
                    onClick={() => handleToggleFavorite(product)}
                    whileTap={{ scale: 0.9 }}
                  >
                    {favorites.includes(product.id) ? '❤️' : '🤍'}
                  </LikeButton>
                  <AddToCartButton
                    onClick={() => handleAddToCart(product)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Ajouter
                  </AddToCartButton>
                </ProductActions>
              </ProductInfo>
            </ProductCard>
          ))
        )}
      </ProductsGrid>
      
      <GPSButton
        onClick={handleGPS}
        whileTap={{ scale: 0.9 }}
      >
        🗺️
      </GPSButton>
      
      <BottomNavigation />
      
      {isListening && (
        <VoiceModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <VoiceClose onClick={() => setIsListening(false)}>✕</VoiceClose>
          <VoiceWave
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          >
            <div className="mic">🎙️</div>
          </VoiceWave>
          <VoiceText>
            {voiceText || "Parlez maintenant..."}
          </VoiceText>
        </VoiceModal>
      )}
    </Container>
  )
}

export default Shopping
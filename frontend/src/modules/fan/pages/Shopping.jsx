// src/modules/fan/pages/Shopping.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

// Import Leaflet pour OpenStreetMap
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Correction des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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

// Styles pour la carte GPS
const GPSModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
`

const GPSHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
`

const GPSTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.text};
`

const GPSCloseButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.text};
`

const GPSMapContainer = styled.div`
  flex: 1;
  width: 100%;
  background: #f0f0f0;
`

const GPSControls = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
`

const GPSLocationButton = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: ${props => props.theme.surface};
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`

const GPSInfo = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  right: 80px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 12px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
`

const GPSAddress = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const GPSButtonStyled = styled(motion.button)`
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
  box-shadow: 0 10px 15px rgba(0,0,0,0.1);
  z-index: 20;
`

const CartIndicator = styled(motion.div)`
  position: fixed;
  bottom: 90px;
  left: 20px;
  background: ${props => props.theme.primary};
  color: white;
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
  z-index: 20;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
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
  const [cartCount, setCartCount] = useState(0)
  const [favorites, setFavorites] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [loading, setLoading] = useState(true)
  
  // États pour le GPS
  const [showGPSModal, setShowGPSModal] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [locationAddress, setLocationAddress] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  
  const { user } = useAuth()

  const loadProducts = useCallback(async () => {
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
      console.log('🛍️ Produits chargés:', data?.length)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }, [activeCategory, searchQuery])

  const loadCart = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*, product:products(*)')
        .eq('user_id', user.id)
      
      if (error) throw error
      setCart(data || [])
      
      const totalItems = data?.reduce((sum, item) => sum + item.quantity, 0) || 0
      setCartCount(totalItems)
      
      console.log('🛒 Panier chargé:', totalItems, 'articles')
    } catch (error) {
      console.error('Error loading cart:', error)
    }
  }, [user])

  const loadFavorites = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id)
      
      if (error) throw error
      setFavorites(data?.map(f => f.product_id) || [])
      
      console.log('❤️ Favoris chargés:', data?.length)
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }, [user])

  useEffect(() => {
    loadProducts()
    loadCart()
    loadFavorites()
  }, [loadProducts, loadCart, loadFavorites])

  const handleAddToCart = async (product) => {
    if (!user) {
      toast.error('Connectez-vous pour ajouter au panier')
      return
    }
    
    try {
      const existingItem = cart.find(item => item.product_id === product.id)
      
      if (existingItem) {
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id)
        
        if (error) throw error
        toast.success(`Quantité augmentée pour "${product.name}"`)
        console.log('🛒 Quantité augmentée:', product.id)
      } else {
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
            price: product.price,
            created_at: new Date().toISOString()
          })
          .select()
        
        if (error) throw error
        toast.success(`"${product.name}" ajouté au panier`)
        console.log('🛒 Produit ajouté au panier:', {
          productId: product.id,
          cartId: data?.[0]?.id
        })
      }
      
      loadCart()
    } catch (error) {
      console.error('Error adding to cart:', error)
      toast.error('Erreur lors de l\'ajout au panier')
    }
  }

  const handleToggleFavorite = async (product) => {
    if (!user) {
      toast.error('Connectez-vous pour ajouter aux favoris')
      return
    }
    
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
        toast.success(`"${product.name}" retiré des favoris`)
        console.log('❤️ Produit retiré des favoris:', product.id)
      } else {
        const { data, error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: product.id,
            created_at: new Date().toISOString()
          })
          .select()
        
        if (error) throw error
        setFavorites([...favorites, product.id])
        toast.success(`"${product.name}" ajouté aux favoris`)
        console.log('❤️ Produit ajouté aux favoris:', {
          productId: product.id,
          favoriteId: data?.[0]?.id
        })
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Erreur lors de l\'opération')
    }
  }

  const startVoiceSearch = () => {
    setIsListening(true)
    
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
        toast(`Recherche: "${text}"`)
        console.log('🎤 Recherche vocale:', text)
        setTimeout(() => {
          setIsListening(false)
          setVoiceText('')
        }, 2000)
      }
      
      recognition.onerror = () => {
        setIsListening(false)
        setVoiceText('')
        toast.error('Erreur de reconnaissance vocale')
      }
      
      recognition.start()
    } else {
      toast.error('Reconnaissance vocale non supportée')
      setIsListening(false)
    }
  }

  // Fonction pour obtenir la position GPS
  const getCurrentLocation = () => {
    setIsLocating(true)
    setLocationError(null)
    
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur')
      setIsLocating(false)
      toast.error('Géolocalisation non supportée')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        const location = { lat: latitude, lng: longitude }
        setUserLocation(location)
        setIsLocating(false)
        
        // Centrer la carte sur la position
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 15)
          
          // Ajouter ou mettre à jour le marqueur
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude])
          } else {
            const customIcon = L.divIcon({
              html: '<div style="background-color: #FF6B35; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
              className: 'custom-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })
            markerRef.current = L.marker([latitude, longitude], { icon: customIcon })
              .addTo(mapInstanceRef.current)
              .bindPopup('Vous êtes ici')
              .openPopup()
          }
        }
        
        // Obtenir l'adresse via reverse geocoding (simulé)
        setLocationAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        
        toast.success('Position obtenue avec succès')
        console.log('📍 Position GPS:', { latitude, longitude })
      },
      (error) => {
        setIsLocating(false)
        let message = 'Erreur de géolocalisation'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Vous avez refusé l\'accès à la localisation'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Position indisponible'
            break
          case error.TIMEOUT:
            message = 'Délai d\'attente dépassé'
            break
        }
        setLocationError(message)
        toast.error(message)
        console.error('Geolocation error:', error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  // Initialiser la carte GPS
  const initGPSMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return
    
    const defaultLocation = userLocation || { lat: 48.8566, lng: 2.3522 } // Paris par défaut
    
    const map = L.map(mapRef.current).setView([defaultLocation.lat, defaultLocation.lng], 13)
    mapInstanceRef.current = map
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    
    if (userLocation) {
      const customIcon = L.divIcon({
        html: '<div style="background-color: #FF6B35; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
        className: 'custom-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
      markerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup('Vous êtes ici')
        .openPopup()
    }
  }

  // Effet pour initialiser la carte quand le modal s'ouvre
  useEffect(() => {
    if (showGPSModal && mapRef.current && !mapInstanceRef.current) {
      setTimeout(() => {
        initGPSMap()
      }, 100)
    }
    
    return () => {
      if (mapInstanceRef.current && !showGPSModal) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [showGPSModal, userLocation])

  const handleOpenGPS = () => {
    setShowGPSModal(true)
    getCurrentLocation()
  }

  const handleCenterOnUser = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15)
      if (markerRef.current) {
        markerRef.current.openPopup()
      }
      toast('Centrage sur votre position')
      console.log('🎯 Centrage sur la position utilisateur')
    } else {
      getCurrentLocation()
    }
  }

  const handleViewCart = () => {
    console.log('🛒 Affichage du panier')
    toast('Fonctionnalité de panier à venir')
  }

  if (loading && products.length === 0) {
    return (
      <Container>
        <Header title="Shopping" showProfile />
        <LoadingSpinner>
          <div>Chargement des produits...</div>
        </LoadingSpinner>
        <BottomNavigation />
      </Container>
    )
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
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888', gridColumn: 'span 2' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🛍️</div>
            <div>Aucun produit trouvé</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {searchQuery ? 'Essayez une autre recherche' : 'Découvrez nos nouveautés'}
            </div>
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
      
      {cartCount > 0 && (
        <CartIndicator
          onClick={handleViewCart}
          whileTap={{ scale: 0.95 }}
        >
          🛒 {cartCount} article{cartCount > 1 ? 's' : ''}
        </CartIndicator>
      )}
      
      <GPSButtonStyled
        onClick={handleOpenGPS}
        whileTap={{ scale: 0.9 }}
      >
        🗺️
      </GPSButtonStyled>
      
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
      
      {showGPSModal && (
        <GPSModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <GPSHeader>
            <GPSTitle>Magasins à proximité</GPSTitle>
            <GPSCloseButton onClick={() => setShowGPSModal(false)} whileTap={{ scale: 0.9 }}>
              ✕
            </GPSCloseButton>
          </GPSHeader>
          
          <GPSMapContainer ref={mapRef} />
          
          <GPSControls>
            <GPSLocationButton onClick={handleCenterOnUser} whileTap={{ scale: 0.9 }}>
              📍
            </GPSLocationButton>
          </GPSControls>
          
          <GPSInfo>
            {isLocating ? (
              <div>Recherche de votre position...</div>
            ) : locationError ? (
              <div style={{ color: '#FF4444' }}>{locationError}</div>
            ) : userLocation ? (
              <>
                <div style={{ fontWeight: 600 }}>📍 Votre position</div>
                <GPSAddress>Lat: {userLocation.lat.toFixed(4)} | Lng: {userLocation.lng.toFixed(4)}</GPSAddress>
                {locationAddress && <GPSAddress>{locationAddress}</GPSAddress>}
                <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
                  Magasins à proximité bientôt disponibles
                </div>
              </>
            ) : (
              <div>Cliquez sur le bouton 📍 pour obtenir votre position</div>
            )}
          </GPSInfo>
        </GPSModal>
      )}
    </Container>
  )
}

export default Shopping
// src/modules/artist/pages/StoreManagement.jsx
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

const AddButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 24px;
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
  box-shadow: ${props => props.theme.shadow.sm};
`

const ProductImage = styled.img`
  width: 100%;
  height: 120px;
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
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.theme.primary};
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

const StoreManagement = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = () => {
    navigate('/seller/products')
  }

  if (loading) {
    return (
      <Container>
        <Header title="Ma boutique" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Ma boutique" showBack />
      
      <HeaderSection>
        <Title>Mes produits</Title>
        <AddButton onClick={handleAddProduct} whileTap={{ scale: 0.95 }}>
          +
        </AddButton>
      </HeaderSection>
      
      {products.length === 0 ? (
        <EmptyState>
          <div className="icon">🛍️</div>
          <div>Aucun produit dans votre boutique</div>
          <Button onClick={handleAddProduct} style={{ marginTop: 20 }}>
            Ajouter un produit
          </Button>
        </EmptyState>
      ) : (
        <ProductsGrid>
          {products.map(product => (
            <ProductCard
              key={product.id}
              onClick={() => navigate(`/seller/products/${product.id}`)}
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
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default StoreManagement
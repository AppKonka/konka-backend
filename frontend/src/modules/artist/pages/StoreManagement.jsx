// src/modules/artist/pages/StoreManagement.jsx
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
  }
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

const ProductStats = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
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

const StoreManagement = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    totalSales: 0
  })

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setProducts(data || [])
      
      // Calculer les statistiques
      const totalValue = (data || []).reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0)
      const totalSales = (data || []).reduce((sum, p) => sum + (p.sold_count || 0), 0)
      
      setStats({
        totalProducts: data?.length || 0,
        totalValue: totalValue,
        totalSales: totalSales
      })
      
      console.log('✅ Produits chargés:', {
        count: data?.length || 0,
        totalValue: totalValue,
        totalSales: totalSales,
        timestamp: new Date().toISOString()
      })
      
      toast.success(`${data?.length || 0} produit(s) chargé(s)`)
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Erreur lors du chargement des produits')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleAddProduct = () => {
    console.log('➕ Ajout d\'un nouveau produit')
    navigate('/seller/products')
  }

  const handleProductClick = (product) => {
    console.log('🛍️ Affichage du produit:', {
      id: product.id,
      name: product.name,
      price: product.price
    })
    navigate(`/seller/products/${product.id}`)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

  if (loading) {
    return (
      <Container>
        <Header title="Ma boutique" showBack />
        <LoadingSpinner>
          <div>Chargement de votre boutique...</div>
        </LoadingSpinner>
        <MusicPlayer />
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
      
      {products.length > 0 && (
        <StatsBar>
          <StatItem>
            <StatValue>{stats.totalProducts}</StatValue>
            <StatLabel>Produits</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{formatNumber(stats.totalValue)}€</StatValue>
            <StatLabel>Valeur stock</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{formatNumber(stats.totalSales)}</StatValue>
            <StatLabel>Ventes totales</StatLabel>
          </StatItem>
        </StatsBar>
      )}
      
      {products.length === 0 ? (
        <EmptyState>
          <div className="icon">🛍️</div>
          <div>Aucun produit dans votre boutique</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Cliquez sur le bouton "+" pour ajouter votre premier produit
          </div>
          <Button onClick={handleAddProduct} style={{ marginTop: 20 }}>
            Ajouter un produit
          </Button>
        </EmptyState>
      ) : (
        <ProductsGrid>
          {products.map(product => (
            <ProductCard
              key={product.id}
              onClick={() => handleProductClick(product)}
              whileTap={{ scale: 0.98 }}
            >
              <ProductImage src={product.images?.[0] || '/images/default-product.jpg'} />
              <ProductInfo>
                <ProductName>{product.name}</ProductName>
                <ProductPrice>{product.price}€</ProductPrice>
                <ProductStats>
                  {product.stock > 0 ? (
                    <span>📦 Stock: {product.stock}</span>
                  ) : (
                    <span style={{ color: '#FF4444' }}>⚠️ Rupture</span>
                  )}
                  {product.sold_count > 0 && (
                    <span>📈 Vendus: {product.sold_count}</span>
                  )}
                </ProductStats>
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
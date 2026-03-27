// src/modules/seller/pages/SellerDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
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

const WelcomeSection = styled.div`
  padding: 20px 16px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  color: white;
`

const WelcomeTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
`

const WelcomeSubtitle = styled.p`
  font-size: 14px;
  opacity: 0.9;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
`

const StatCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 4px;
`

const StatLabel = styled.div`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  padding: 0 16px;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const QuickActions = styled.div`
  display: flex;
  gap: 12px;
  padding: 0 16px;
  margin-bottom: 24px;
`

const QuickActionButton = styled(motion.button)`
  flex: 1;
  padding: 12px;
  border-radius: 28px;
  border: none;
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const OrdersList = styled.div`
  padding: 0 16px;
`

const OrderCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const OrderId = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const OrderStatus = styled.span`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB44420';
      case 'confirmed': return '#33B5E520';
      case 'shipped': return '#FF6B3520';
      case 'delivered': return '#00C85120';
      case 'disputed': return '#FF444420';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB444';
      case 'confirmed': return '#33B5E5';
      case 'shipped': return '#FF6B35';
      case 'delivered': return '#00C851';
      case 'disputed': return '#FF4444';
      default: return '#888888';
    }
  }};
`

const OrderProducts = styled.div`
  margin-bottom: 12px;
`

const OrderProduct = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
`

const ProductImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
`

const ProductInfo = styled.div`
  flex: 1;
`

const ProductName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.text};
`

const ProductQuantity = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const OrderTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.border};
`

const TotalLabel = styled.span`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const TotalAmount = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const OrderActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 8px;
  border-radius: 20px;
  border: none;
  background: ${props => props.primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.primary ? 'white' : props.theme.text};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadow.sm};
`

const LowStockList = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 16px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const LowStockCard = styled(motion.div)`
  min-width: 120px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 12px;
  text-align: center;
`

const LowStockImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 8px;
`

const LowStockName = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const LowStockCount = styled.span`
  font-size: 12px;
  color: #FF4444;
  font-weight: 500;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const SellerDashboard = () => {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    customers: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // Charger les produits
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
      
      if (productsError) throw productsError
      
      setStats(prev => ({ ...prev, products: productsData?.length || 0 }))
      
      // Filtrer les produits en stock faible
      const lowStock = productsData?.filter(p => p.stock > 0 && p.stock < 10) || []
      setLowStockProducts(lowStock)
      
      // Charger les commandes
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*)
          )
        `)
        .in('id', supabase
          .from('order_items')
          .select('order_id')
          .in('product_id', productsData?.map(p => p.id) || [])
        )
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (ordersError) throw ordersError
      
      setRecentOrders(ordersData || [])
      
      // Calculer les stats
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0
      const uniqueCustomers = new Set(ordersData?.map(o => o.buyer_id)).size
      
      setStats(prev => ({
        ...prev,
        revenue: totalRevenue,
        orders: ordersData?.length || 0,
        customers: uniqueCustomers,
      }))
      
      setLastUpdate(new Date().toISOString())
      
      console.log('📊 Tableau de bord chargé:', {
        products: productsData?.length,
        orders: ordersData?.length,
        revenue: totalRevenue,
        lowStock: lowStock.length
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'confirmed': return 'Confirmée'
      case 'shipped': return 'Expédiée'
      case 'delivered': return 'Livrée'
      case 'disputed': return 'Litige'
      default: return 'Inconnu'
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Container>
        <Header title="Espace Vendeur" showProfile />
        <LoadingSpinner>
          <div>Chargement de votre tableau de bord...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Espace Vendeur" showProfile />
      
      <WelcomeSection>
        <WelcomeTitle>
          Bonjour, {userProfile?.store_name || userProfile?.display_name} 👋
        </WelcomeTitle>
        <WelcomeSubtitle>
          Gérez votre boutique et vos ventes
        </WelcomeSubtitle>
        {lastUpdate && (
          <p style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
            Dernière mise à jour: {formatDate(lastUpdate)}
          </p>
        )}
      </WelcomeSection>
      
      <StatsGrid>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{formatNumber(stats.revenue)}€</StatValue>
          <StatLabel>Chiffre d'affaires</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.orders}</StatValue>
          <StatLabel>Commandes</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.products}</StatValue>
          <StatLabel>Produits</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.customers}</StatValue>
          <StatLabel>Clients uniques</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <QuickActions>
        <QuickActionButton
          onClick={() => navigate('/seller/products')}
          whileTap={{ scale: 0.95 }}
        >
          ➕ Ajouter un produit
        </QuickActionButton>
        <QuickActionButton
          onClick={() => navigate('/seller/orders')}
          whileTap={{ scale: 0.95 }}
        >
          📦 Voir les commandes
        </QuickActionButton>
        <QuickActionButton
          onClick={() => navigate('/seller/analytics')}
          whileTap={{ scale: 0.95 }}
        >
          📊 Statistiques
        </QuickActionButton>
      </QuickActions>
      
      {recentOrders.length > 0 && (
        <>
          <SectionTitle>Commandes récentes</SectionTitle>
          <OrdersList>
            {recentOrders.map(order => (
              <OrderCard key={order.id} whileTap={{ scale: 0.98 }}>
                <OrderHeader>
                  <OrderId>#{order.id.slice(-8)}</OrderId>
                  <OrderStatus status={order.status}>
                    {getStatusText(order.status)}
                  </OrderStatus>
                </OrderHeader>
                
                <OrderProducts>
                  {order.items?.slice(0, 2).map((item, idx) => (
                    <OrderProduct key={idx}>
                      <ProductImage src={item.product?.images?.[0] || '/images/default-product.jpg'} />
                      <ProductInfo>
                        <ProductName>{item.product?.name}</ProductName>
                        <ProductQuantity>x{item.quantity}</ProductQuantity>
                      </ProductInfo>
                    </OrderProduct>
                  ))}
                  {order.items?.length > 2 && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                      +{order.items.length - 2} autre(s) produit(s)
                    </div>
                  )}
                </OrderProducts>
                
                <OrderTotal>
                  <TotalLabel>Total</TotalLabel>
                  <TotalAmount>{order.total_amount}€</TotalAmount>
                </OrderTotal>
                
                <OrderActions>
                  <ActionButton
                    primary
                    onClick={() => navigate(`/seller/orders/${order.id}`)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Voir détails
                  </ActionButton>
                  {order.status === 'confirmed' && (
                    <ActionButton
                      onClick={() => {
                        console.log('Expédier la commande:', order.id)
                        navigate(`/seller/orders/${order.id}/ship`)
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Expédier
                    </ActionButton>
                  )}
                </OrderActions>
              </OrderCard>
            ))}
          </OrdersList>
        </>
      )}
      
      {lowStockProducts.length > 0 && (
        <>
          <SectionTitle>⚠️ Stock faible</SectionTitle>
          <LowStockList>
            {lowStockProducts.map(product => (
              <LowStockCard
                key={product.id}
                onClick={() => navigate(`/seller/products/${product.id}/edit`)}
                whileTap={{ scale: 0.95 }}
              >
                <LowStockImage src={product.images?.[0] || '/images/default-product.jpg'} />
                <LowStockName>{product.name}</LowStockName>
                <LowStockCount>Stock: {product.stock}</LowStockCount>
              </LowStockCard>
            ))}
          </LowStockList>
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerDashboard
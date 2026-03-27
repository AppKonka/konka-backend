// src/modules/seller/pages/SellerAnalytics.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
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
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const PeriodSelector = styled.div`
  display: flex;
  gap: 8px;
  padding: 0 16px;
  margin-bottom: 20px;
`

const PeriodButton = styled(motion.button)`
  flex: 1;
  padding: 8px;
  border-radius: 20px;
  border: none;
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 14px;
  cursor: pointer;
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
  text-align: center;
`

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.primary};
  margin-bottom: 4px;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const StatChange = styled.div`
  font-size: 11px;
  margin-top: 4px;
  color: ${props => props.positive ? '#00C851' : '#FF4444'};
`

const ChartContainer = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin: 0 16px 16px;
`

const ChartTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const BarChart = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 200px;
`

const Bar = styled.div`
  flex: 1;
  height: ${props => props.height}%;
  background: ${props => props.theme.primary};
  border-radius: 8px 8px 0 0;
  transition: height 0.3s ease;
`

const BarLabel = styled.div`
  text-align: center;
  font-size: 10px;
  margin-top: 8px;
  color: ${props => props.theme.textSecondary};
`

const TopProductsList = styled.div`
  padding: 0 16px;
`

const ProductItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  margin-bottom: 8px;
`

const ProductRank = styled.div`
  width: 28px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const ProductImage = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`

const ProductInfo = styled.div`
  flex: 1;
`

const ProductName = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const ProductSales = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const ProductRevenue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
`

const periods = [
  { id: '7d', label: '7 jours' },
  { id: '30d', label: '30 jours' },
  { id: '90d', label: '90 jours' },
]

const SellerAnalytics = () => {
  const [period, setPeriod] = useState('30d')
  const [stats, setStats] = useState({
    revenue: 0,
    revenueChange: 0,
    orders: 0,
    ordersChange: 0,
    customers: 0,
    customersChange: 0,
    conversion: 0,
    conversionChange: 0,
  })
  const [dailyData, setDailyData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuth()

  const getDateRange = useCallback((currentPeriod) => {
    const end = new Date()
    let start = new Date()
    
    switch (currentPeriod) {
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      case '90d':
        start.setDate(end.getDate() - 90)
        break
      default:
        start.setDate(end.getDate() - 30)
    }
    
    return { start, end }
  }, [])

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(period)
      
      // Récupérer les produits du vendeur
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, images, price, sold_count')
        .eq('seller_id', user.id)
      
      if (productsError) throw productsError
      
      const productIds = products?.map(p => p.id) || []
      
      if (productIds.length === 0) {
        setStats({
          revenue: 0,
          revenueChange: 0,
          orders: 0,
          ordersChange: 0,
          customers: 0,
          customersChange: 0,
          conversion: 0,
          conversionChange: 0,
        })
        setDailyData([])
        setTopProducts([])
        setLoading(false)
        
        console.log('📊 Aucun produit trouvé pour ce vendeur')
        return
      }
      
      // Récupérer les order_items
      const { data: orderItems, error: ordersError } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(created_at, buyer_id, status)
        `)
        .in('product_id', productIds)
        .gte('order.created_at', start.toISOString())
        .lte('order.created_at', end.toISOString())
      
      if (ordersError) throw ordersError
      
      // Calculer les stats
      const completedOrders = orderItems?.filter(item => item.order.status === 'delivered') || []
      const totalRevenue = completedOrders.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)
      const uniqueCustomers = new Set(completedOrders.map(item => item.order.buyer_id)).size
      const orderCount = new Set(completedOrders.map(item => item.order_id)).size
      
      // Calculer la période précédente pour l'évolution
      const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24))
      const previousStart = new Date(start)
      const previousEnd = new Date(end)
      previousStart.setDate(previousStart.getDate() - daysDiff)
      previousEnd.setDate(previousEnd.getDate() - daysDiff)
      
      const { data: previousOrderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(created_at, buyer_id, status)
        `)
        .in('product_id', productIds)
        .gte('order.created_at', previousStart.toISOString())
        .lte('order.created_at', previousEnd.toISOString())
      
      const previousCompletedOrders = previousOrderItems?.filter(item => item.order.status === 'delivered') || []
      const previousRevenue = previousCompletedOrders.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)
      const previousOrderCount = new Set(previousCompletedOrders.map(item => item.order_id)).size
      
      const revenueChange = previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0
      const ordersChange = previousOrderCount ? ((orderCount - previousOrderCount) / previousOrderCount * 100) : 0
      
      // Calculer les données quotidiennes
      const dailyMap = new Map()
      completedOrders.forEach(item => {
        const date = new Date(item.order.created_at).toISOString().split('T')[0]
        const current = dailyMap.get(date) || { revenue: 0, orders: 0 }
        current.revenue += item.price_at_time * item.quantity
        current.orders += 1
        dailyMap.set(date, current)
      })
      
      const dailyArray = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      
      setDailyData(dailyArray)
      
      // Calculer les top produits
      const productSales = new Map()
      completedOrders.forEach(item => {
        const product = products?.find(p => p.id === item.product_id)
        const current = productSales.get(item.product_id) || { 
          quantity: 0, 
          revenue: 0, 
          name: product?.name || 'Produit inconnu', 
          image: product?.images?.[0],
          price: product?.price
        }
        current.quantity += item.quantity
        current.revenue += item.price_at_time * item.quantity
        productSales.set(item.product_id, current)
      })
      
      const topProductsArray = Array.from(productSales.entries())
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      setTopProducts(topProductsArray)
      setStats({
        revenue: totalRevenue,
        revenueChange: revenueChange,
        orders: orderCount,
        ordersChange: ordersChange,
        customers: uniqueCustomers,
        customersChange: 0,
        conversion: orderCount > 0 ? (orderCount / (products?.length || 1)) * 100 : 0,
        conversionChange: 0,
      })
      
      console.log('📊 Analytics chargés:', {
        period,
        revenue: totalRevenue,
        revenueChange: revenueChange.toFixed(1),
        orders: orderCount,
        ordersChange: ordersChange.toFixed(1),
        customers: uniqueCustomers,
        topProducts: topProductsArray.length
      })
      
    } catch (error) {
      console.error('Error loading analytics:', error)
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setLoading(false)
    }
  }, [user.id, period, getDateRange])

  // Charger les analytics quand la période change
  useEffect(() => {
    loadAnalytics()
  }, [period, loadAnalytics])

  const getMaxRevenue = () => {
    return Math.max(...dailyData.map(d => d.revenue), 1)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

  if (loading) {
    return (
      <Container>
        <Header title="Statistiques" showProfile showBack />
        <LoadingSpinner>
          <div>Chargement de vos statistiques...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  const hasData = stats.revenue > 0 || dailyData.length > 0 || topProducts.length > 0

  return (
    <Container>
      <Header title="Statistiques" showProfile showBack />
      
      <HeaderSection>
        <Title>Statistiques</Title>
        <Subtitle>Analysez vos performances</Subtitle>
      </HeaderSection>
      
      <PeriodSelector>
        {periods.map(p => (
          <PeriodButton
            key={p.id}
            active={period === p.id}
            onClick={() => setPeriod(p.id)}
            whileTap={{ scale: 0.95 }}
          >
            {p.label}
          </PeriodButton>
        ))}
      </PeriodSelector>
      
      {!hasData ? (
        <EmptyState>
          <div className="icon">📊</div>
          <div>Aucune donnée disponible pour cette période</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Commencez à vendre pour voir vos statistiques
          </div>
        </EmptyState>
      ) : (
        <>
          <StatsGrid>
            <StatCard whileTap={{ scale: 0.98 }}>
              <StatValue>{formatNumber(stats.revenue)}€</StatValue>
              <StatLabel>Chiffre d'affaires</StatLabel>
              <StatChange positive={stats.revenueChange > 0}>
                {stats.revenueChange > 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange).toFixed(1)}%
              </StatChange>
            </StatCard>
            <StatCard whileTap={{ scale: 0.98 }}>
              <StatValue>{stats.orders}</StatValue>
              <StatLabel>Commandes</StatLabel>
              <StatChange positive={stats.ordersChange > 0}>
                {stats.ordersChange > 0 ? '↑' : '↓'} {Math.abs(stats.ordersChange).toFixed(1)}%
              </StatChange>
            </StatCard>
            <StatCard whileTap={{ scale: 0.98 }}>
              <StatValue>{stats.customers}</StatValue>
              <StatLabel>Clients uniques</StatLabel>
            </StatCard>
            <StatCard whileTap={{ scale: 0.98 }}>
              <StatValue>{stats.conversion.toFixed(1)}%</StatValue>
              <StatLabel>Taux conversion</StatLabel>
            </StatCard>
          </StatsGrid>
          
          {dailyData.length > 0 && (
            <ChartContainer>
              <ChartTitle>Évolution des ventes</ChartTitle>
              <BarChart>
                {dailyData.map((day, idx) => (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Bar height={(day.revenue / getMaxRevenue()) * 100} />
                    <BarLabel>{new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</BarLabel>
                  </div>
                ))}
              </BarChart>
            </ChartContainer>
          )}
          
          {topProducts.length > 0 && (
            <>
              <ChartTitle style={{ paddingLeft: 16 }}>Top produits</ChartTitle>
              <TopProductsList>
                {topProducts.map((product, idx) => (
                  <ProductItem key={product.id}>
                    <ProductRank>#{idx + 1}</ProductRank>
                    <ProductImage src={product.image || '/images/default-product.jpg'} />
                    <ProductInfo>
                      <ProductName>{product.name}</ProductName>
                      <ProductSales>{product.quantity} vendus</ProductSales>
                    </ProductInfo>
                    <ProductRevenue>{product.revenue}€</ProductRevenue>
                  </ProductItem>
                ))}
              </TopProductsList>
            </>
          )}
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerAnalytics
// src/modules/seller/pages/SellerAnalytics.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

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

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const getDateRange = () => {
    const end = new Date()
    let start = new Date()
    
    switch (period) {
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
  }

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()
      
      // Récupérer les produits du vendeur
      const { data: products } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', user.id)
      
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
        return
      }
      
      // Récupérer les order_items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          *,
          order:orders(created_at, buyer_id, status)
        `)
        .in('product_id', productIds)
        .gte('order.created_at', start.toISOString())
        .lte('order.created_at', end.toISOString())
      
      // Calculer les stats
      const completedOrders = orderItems?.filter(item => item.order.status === 'delivered') || []
      const totalRevenue = completedOrders.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)
      const uniqueCustomers = new Set(completedOrders.map(item => item.order.buyer_id)).size
      const orderCount = new Set(completedOrders.map(item => item.order_id)).size
      
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
        const current = productSales.get(item.product_id) || { quantity: 0, revenue: 0, name: item.product?.name, image: item.product?.images?.[0] }
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
        revenueChange: 12.5,
        orders: orderCount,
        ordersChange: 8.3,
        customers: uniqueCustomers,
        customersChange: -2.1,
        conversion: 3.2,
        conversionChange: 0.5,
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMaxRevenue = () => {
    return Math.max(...dailyData.map(d => d.revenue), 1)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

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
      
      <StatsGrid>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{formatNumber(stats.revenue)}€</StatValue>
          <StatLabel>Chiffre d'affaires</StatLabel>
          <StatChange positive={stats.revenueChange > 0}>
            {stats.revenueChange > 0 ? '↑' : '↓'} {Math.abs(stats.revenueChange)}%
          </StatChange>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.orders}</StatValue>
          <StatLabel>Commandes</StatLabel>
          <StatChange positive={stats.ordersChange > 0}>
            {stats.ordersChange > 0 ? '↑' : '↓'} {Math.abs(stats.ordersChange)}%
          </StatChange>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.customers}</StatValue>
          <StatLabel>Clients uniques</StatLabel>
          <StatChange positive={stats.customersChange > 0}>
            {stats.customersChange > 0 ? '↑' : '↓'} {Math.abs(stats.customersChange)}%
          </StatChange>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.conversion}%</StatValue>
          <StatLabel>Taux conversion</StatLabel>
          <StatChange positive={stats.conversionChange > 0}>
            {stats.conversionChange > 0 ? '↑' : '↓'} {Math.abs(stats.conversionChange)}%
          </StatChange>
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
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerAnalytics
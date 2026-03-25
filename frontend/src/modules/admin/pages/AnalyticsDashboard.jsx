// src/modules/admin/pages/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Users, Music, ShoppingBag,
  Calendar, Download, Filter, BarChart3, PieChart,
  LineChart, Activity, DollarSign, Eye, Heart, MessageCircle
} from 'lucide-react'
import { supabase } from '../../../config/supabase'
import {
  LineChart as ReLineChart,
  Line,
  BarChart as ReBarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const DateSelector = styled.div`
  display: flex;
  gap: 8px;
`

const DateButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.active ? props.theme.primary : props.theme.border};
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 13px;
  cursor: pointer;
`

const ExportButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
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
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const StatChange = styled.div`
  font-size: 11px;
  margin-top: 6px;
  color: ${props => props.positive ? '#00C851' : '#FF4444'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
`

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const ChartCard = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const ChartTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
`

const ChartContainer = styled.div`
  height: 300px;
`

const COLORS = ['#FF6B35', '#33B5E5', '#00C851', '#FFB444', '#FF4444', '#AA66CC']

const periods = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
  { value: '12m', label: '12 mois' }
]

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    totalTracks: 0,
    tracksGrowth: 0,
    totalMatches: 0,
    matchesGrowth: 0,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0
    }
  })
  
  const [userGrowthData, setUserGrowthData] = useState([])
  const [revenueData, setRevenueData] = useState([])
  const [contentDistribution, setContentDistribution] = useState([])
  const [topGenres, setTopGenres] = useState([])
  const [topArtists, setTopArtists] = useState([])
  const [hourlyActivity, setHourlyActivity] = useState([])

  useEffect(() => {
    loadAnalytics()
  }, [period])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Calculer les dates
      const now = new Date()
      let startDate, previousStartDate
      
      switch (period) {
        case '7d':
          startDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now - 14 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now - 60 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now - 90 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now - 180 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
          previousStartDate = new Date(now - 60 * 24 * 60 * 60 * 1000)
      }
      
      // Croissance utilisateurs
      const { data: newUsers } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
      
      const { data: previousUsers } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString())
      
      // Croissance par jour
      const dailyGrowth = {}
      newUsers?.forEach(user => {
        const date = new Date(user.created_at).toISOString().split('T')[0]
        dailyGrowth[date] = (dailyGrowth[date] || 0) + 1
      })
      
      const growthData = Object.entries(dailyGrowth)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      setUserGrowthData(growthData)
      
      // Revenus
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .eq('status', 'delivered')
        .gte('created_at', startDate.toISOString())
      
      const dailyRevenue = {}
      orders?.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        dailyRevenue[date] = (dailyRevenue[date] || 0) + order.total_amount
      })
      
      const revenueDataArray = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      setRevenueData(revenueDataArray)
      
      // Distribution des contenus
      const [tracksCount, videosCount, postsCount] = await Promise.all([
        supabase.from('tracks').select('id', { count: 'exact' }),
        supabase.from('videos').select('id', { count: 'exact' }),
        supabase.from('posts').select('id', { count: 'exact' })
      ])
      
      setContentDistribution([
        { name: 'Morceaux', value: tracksCount.count || 0 },
        { name: 'Vidéos', value: videosCount.count || 0 },
        { name: 'Posts', value: postsCount.count || 0 }
      ])
      
      // Top genres
      const { data: tracks } = await supabase
        .from('tracks')
        .select('genre')
        .not('genre', 'is', null)
      
      const genreCount = {}
      tracks?.forEach(track => {
        genreCount[track.genre] = (genreCount[track.genre] || 0) + 1
      })
      
      const topGenresData = Object.entries(genreCount)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      
      setTopGenres(topGenresData)
      
      // Top artistes
      const { data: artists } = await supabase
        .from('tracks')
        .select('artist_id, artist:users(username)')
        .order('play_count', { ascending: false })
        .limit(5)
      
      setTopArtists(artists || [])
      
      // Activité horaire
      const { data: allUsers } = await supabase
        .from('users')
        .select('last_active_at')
        .not('last_active_at', 'is', null)
      
      const hourlyCount = Array(24).fill(0)
      allUsers?.forEach(user => {
        const hour = new Date(user.last_active_at).getHours()
        hourlyCount[hour]++
      })
      
      setHourlyActivity(hourlyCount.map((count, hour) => ({ hour, count })))
      
      // Calculer les stats principales
      const totalRevenue = orders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
      const previousRevenue = (await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'delivered')
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()))?.data?.reduce((sum, o) => sum + o.total_amount, 0) || 0
      
      const revenueGrowth = previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0
      
      // Likes, comments, shares
      const [likesCount, commentsCount, sharesCount] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact' }),
        supabase.from('comments').select('id', { count: 'exact' }),
        supabase.from('shares').select('id', { count: 'exact' })
      ])
      
      const newUsersCount = newUsers?.length || 0
      const previousNewUsers = previousUsers?.length || 0
      const newUsersGrowth = previousNewUsers ? ((newUsersCount - previousNewUsers) / previousNewUsers * 100) : 0
      
      const totalOrders = orders?.length || 0
      const previousOrders = (await supabase
        .from('orders')
        .select('id', { count: 'exact' })
        .gte('created_at', previousStartDate.toISOString())
        .lt('created_at', startDate.toISOString()))?.count || 0
      
      const ordersGrowth = previousOrders ? ((totalOrders - previousOrders) / previousOrders * 100) : 0
      
      const totalTracks = tracksCount.count || 0
      const previousTracks = (await supabase
        .from('tracks')
        .select('id', { count: 'exact' })
        .lt('created_at', startDate.toISOString()))?.count || 0
      const tracksGrowth = previousTracks ? ((totalTracks - previousTracks) / previousTracks * 100) : 0
      
      const totalMatches = (await supabase
        .from('matches')
        .select('id', { count: 'exact' })
        .eq('status', 'matched'))?.count || 0
      
      setStats({
        totalUsers: (await supabase.from('users').select('id', { count: 'exact' })).count || 0,
        newUsers: newUsersCount,
        activeUsers: (await supabase.from('users').select('id', { count: 'exact' }).gte('last_active_at', startDate.toISOString())).count || 0,
        totalRevenue,
        revenueGrowth,
        totalOrders,
        ordersGrowth,
        totalTracks,
        tracksGrowth,
        totalMatches,
        matchesGrowth: 0,
        engagement: {
          likes: likesCount.count || 0,
          comments: commentsCount.count || 0,
          shares: sharesCount.count || 0
        }
      })
      
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    // Exporter les données en CSV
    console.log('Export analytics')
  }

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement des analyses...</div>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Analytics & Statistiques</Title>
        <div style={{ display: 'flex', gap: 12 }}>
          <DateSelector>
            {periods.map(p => (
              <DateButton
                key={p.value}
                active={period === p.value}
                onClick={() => setPeriod(p.value)}
                whileTap={{ scale: 0.95 }}
              >
                {p.label}
              </DateButton>
            ))}
          </DateSelector>
          <ExportButton onClick={handleExport} whileTap={{ scale: 0.95 }}>
            <Download size={16} /> Exporter
          </ExportButton>
        </div>
      </Header>
      
      <StatsGrid>
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalUsers.toLocaleString()}</StatValue>
          <StatLabel>Utilisateurs totaux</StatLabel>
          <StatChange positive={stats.newUsers > 0}>
            <TrendingUp size={12} /> +{stats.newUsers} nouveaux
          </StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.activeUsers.toLocaleString()}</StatValue>
          <StatLabel>Utilisateurs actifs</StatLabel>
          <StatChange positive>{(stats.activeUsers / stats.totalUsers * 100).toFixed(1)}% du total</StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalRevenue.toLocaleString()}€</StatValue>
          <StatLabel>Chiffre d'affaires</StatLabel>
          <StatChange positive={stats.revenueGrowth > 0}>
            {stats.revenueGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(stats.revenueGrowth).toFixed(1)}%
          </StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalOrders.toLocaleString()}</StatValue>
          <StatLabel>Commandes</StatLabel>
          <StatChange positive={stats.ordersGrowth > 0}>
            {stats.ordersGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(stats.ordersGrowth).toFixed(1)}%
          </StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalTracks.toLocaleString()}</StatValue>
          <StatLabel>Morceaux</StatLabel>
          <StatChange positive={stats.tracksGrowth > 0}>
            {stats.tracksGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(stats.tracksGrowth).toFixed(1)}%
          </StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatValue>{stats.totalMatches.toLocaleString()}</StatValue>
          <StatLabel>Matchs</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <ChartRow>
        <ChartCard>
          <ChartTitle>
            <Users size={18} /> Croissance des utilisateurs
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#FF6B35" strokeWidth={2} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
        
        <ChartCard>
          <ChartTitle>
            <DollarSign size={18} /> Évolution des revenus
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#FF6B35" />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
      </ChartRow>
      
      <ChartRow>
        <ChartCard>
          <ChartTitle>
            <PieChart size={18} /> Distribution du contenu
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={contentDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {contentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
        
        <ChartCard>
          <ChartTitle>
            <Music size={18} /> Top genres musicaux
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={topGenres} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="genre" />
                <Tooltip />
                <Bar dataKey="count" fill="#33B5E5" />
              </ReBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
      </ChartRow>
      
      <ChartRow>
        <ChartCard>
          <ChartTitle>
            <Activity size={18} /> Activité horaire
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={hourlyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#00C851" strokeWidth={2} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
        
        <ChartCard>
          <ChartTitle>
            <Heart size={18} /> Engagement utilisateurs
          </ChartTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={[
                    { name: 'Likes', value: stats.engagement.likes },
                    { name: 'Commentaires', value: stats.engagement.comments },
                    { name: 'Partages', value: stats.engagement.shares }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#FF6B35" />
                  <Cell fill="#33B5E5" />
                  <Cell fill="#00C851" />
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ChartCard>
      </ChartRow>
    </Container>
  )
}

export default AnalyticsDashboard
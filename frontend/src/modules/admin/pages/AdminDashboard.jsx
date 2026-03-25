// src/modules/admin/pages/AdminDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { 
  Users, Music, ShoppingBag, Video, MessageCircle, 
  TrendingUp, DollarSign, Eye, Heart, AlertCircle,
  CheckCircle, XCircle, Clock, Calendar, 
  BarChart3, Activity, Globe, Zap, Shield, FileText
} from 'lucide-react'
import { supabase } from '../../../config/supabase'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`

const Header = styled.div`
  margin-bottom: 24px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`

const StatCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  padding: 20px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const StatTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.textSecondary};
`

const StatIcon = styled.div`
  font-size: 24px;
  color: ${props => props.theme.primary};
`

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.text};
  margin-bottom: 8px;
`

const StatChange = styled.div`
  font-size: 12px;
  color: ${props => props.positive ? '#00C851' : '#FF4444'};
  display: flex;
  align-items: center;
  gap: 4px;
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 24px 0 16px;
  color: ${props => props.theme.text};
`

const Table = styled.table`
  width: 100%;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  
  th, td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid ${props => props.theme.border};
  }
  
  th {
    font-weight: 600;
    color: ${props => props.theme.textSecondary};
    background: ${props => props.theme.background};
  }
  
  td {
    color: ${props => props.theme.text};
  }
`

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: ${props => {
    switch (props.status) {
      case 'active': return '#00C85120';
      case 'pending': return '#FFB44420';
      case 'blocked': return '#FF444420';
      case 'approved': return '#00C85120';
      case 'rejected': return '#FF444420';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'active': return '#00C851';
      case 'pending': return '#FFB444';
      case 'blocked': return '#FF4444';
      case 'approved': return '#00C851';
      case 'rejected': return '#FF4444';
      default: return '#888888';
    }
  }};
`

const ActionButton = styled(motion.button)`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  margin: 0 4px;
  padding: 4px;
  border-radius: 8px;
  color: ${props => props.theme.textSecondary};
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const QuickActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
`

const QuickAction = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 16px;
  flex: 1;
  min-width: 150px;
  text-align: center;
  cursor: pointer;
  
  .icon {
    font-size: 24px;
    margin-bottom: 8px;
    color: ${props => props.theme.primary};
  }
  
  .label {
    font-size: 13px;
    font-weight: 500;
    color: ${props => props.theme.text};
  }
  
  .count {
    font-size: 20px;
    font-weight: 700;
    color: ${props => props.theme.primary};
    margin-top: 8px;
  }
`

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtists: 0,
    totalSellers: 0,
    totalTracks: 0,
    totalVideos: 0,
    totalPosts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeLives: 0,
    pendingReports: 0,
    pendingVerifications: 0,
    totalMatches: 0,
    totalMessages: 0,
    totalLikes: 0,
    totalComments: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0,
    monthlyActiveUsers: 0,
    growthRate: 12.5,
    revenueGrowth: 8.3,
  })
  
  const [recentUsers, setRecentUsers] = useState([])
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [recentReports, setRecentReports] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Statistiques utilisateurs
      const [
        usersCount, artistsCount, sellersCount,
        tracksCount, videosCount, postsCount,
        ordersCount, revenueData, livesCount, reportsCount,
        verificationsCount, matchesCount, messagesCount,
        likesCount, commentsCount
      ] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'artist'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'seller'),
        supabase.from('tracks').select('id', { count: 'exact' }),
        supabase.from('videos').select('id', { count: 'exact' }),
        supabase.from('posts').select('id', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' }),
        supabase.from('orders').select('total_amount').eq('status', 'delivered'),
        supabase.from('lives').select('id', { count: 'exact' }).eq('status', 'live'),
        supabase.from('reports').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('artists').select('id', { count: 'exact' }).eq('verification_status', 'pending'),
        supabase.from('matches').select('id', { count: 'exact' }).eq('status', 'matched'),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('likes').select('id', { count: 'exact' }),
        supabase.from('comments').select('id', { count: 'exact' }),
      ])
      
      const totalRevenue = revenueData.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      
      // Utilisateurs actifs
      const now = new Date()
      const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
      const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: activeUsers } = await supabase
        .from('users')
        .select('last_active_at')
        .gte('last_active_at', dayAgo)
      
      const { data: weeklyActive } = await supabase
        .from('users')
        .select('last_active_at')
        .gte('last_active_at', weekAgo)
      
      const { data: monthlyActive } = await supabase
        .from('users')
        .select('last_active_at')
        .gte('last_active_at', monthAgo)
      
      setStats({
        totalUsers: usersCount.count || 0,
        totalArtists: artistsCount.count || 0,
        totalSellers: sellersCount.count || 0,
        totalTracks: tracksCount.count || 0,
        totalVideos: videosCount.count || 0,
        totalPosts: postsCount.count || 0,
        totalOrders: ordersCount.count || 0,
        totalRevenue: totalRevenue,
        activeLives: livesCount.count || 0,
        pendingReports: reportsCount.count || 0,
        pendingVerifications: verificationsCount.count || 0,
        totalMatches: matchesCount.count || 0,
        totalMessages: messagesCount.count || 0,
        totalLikes: likesCount.count || 0,
        totalComments: commentsCount.count || 0,
        dailyActiveUsers: activeUsers?.length || 0,
        weeklyActiveUsers: weeklyActive?.length || 0,
        monthlyActiveUsers: monthlyActive?.length || 0,
        growthRate: 12.5,
        revenueGrowth: 8.3,
      })
      
      // Utilisateurs récents
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, display_name, email, role, created_at, is_verified')
        .order('created_at', { ascending: false })
        .limit(10)
      
      setRecentUsers(usersData || [])
      
      // Vérifications en attente
      const { data: artistsPending } = await supabase
        .from('artists')
        .select('*, user:users(id, username, display_name, email, avatar_url)')
        .eq('verification_status', 'pending')
        .limit(10)
      
      const { data: sellersPending } = await supabase
        .from('sellers')
        .select('*, user:users(id, username, display_name, email, avatar_url)')
        .eq('verification_status', 'pending')
        .limit(10)
      
      setPendingVerifications([...(artistsPending || []), ...(sellersPending || [])])
      
      // Signalements récents
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*, reporter:users!reports_reporter_id_fkey(id, username), reported:users!reports_reported_id_fkey(id, username)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)
      
      setRecentReports(reportsData || [])
      
      // Commandes récentes
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*, buyer:users(id, username)')
        .order('created_at', { ascending: false })
        .limit(10)
      
      setRecentOrders(ordersData || [])
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id, type) => {
    try {
      const table = type === 'artist' ? 'artists' : 'sellers'
      await supabase
        .from(table)
        .update({ verification_status: 'approved', verified_at: new Date().toISOString() })
        .eq('id', id)
      
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', (await supabase.from(table).select('user_id').eq('id', id).single()).data.user_id)
      
      loadDashboardData()
    } catch (error) {
      console.error('Error verifying:', error)
    }
  }

  const handleReject = async (id, type) => {
    try {
      const table = type === 'artist' ? 'artists' : 'sellers'
      await supabase
        .from(table)
        .update({ verification_status: 'rejected' })
        .eq('id', id)
      
      loadDashboardData()
    } catch (error) {
      console.error('Error rejecting:', error)
    }
  }

  const handleResolveReport = async (reportId) => {
    try {
      await supabase
        .from('reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', reportId)
      
      loadDashboardData()
    } catch (error) {
      console.error('Error resolving report:', error)
    }
  }

  const handleBlockUser = async (userId) => {
    try {
      await supabase
        .from('users')
        .update({ is_blocked: true, blocked_at: new Date().toISOString() })
        .eq('id', userId)
      
      loadDashboardData()
    } catch (error) {
      console.error('Error blocking user:', error)
    }
  }

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement du tableau de bord...</div>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Tableau de bord administrateur</Title>
        <Subtitle>Vue d'ensemble de la plateforme KONKA</Subtitle>
      </Header>
      
      <QuickActions>
        <QuickAction onClick={() => navigate('/admin/users')} whileTap={{ scale: 0.98 }}>
          <div className="icon"><Users size={24} /></div>
          <div className="label">Utilisateurs</div>
          <div className="count">{stats.totalUsers}</div>
        </QuickAction>
        <QuickAction onClick={() => navigate('/admin/verifications')} whileTap={{ scale: 0.98 }}>
          <div className="icon"><Shield size={24} /></div>
          <div className="label">En attente</div>
          <div className="count">{stats.pendingVerifications}</div>
        </QuickAction>
        <QuickAction onClick={() => navigate('/admin/reports')} whileTap={{ scale: 0.98 }}>
          <div className="icon"><AlertCircle size={24} /></div>
          <div className="label">Signalements</div>
          <div className="count">{stats.pendingReports}</div>
        </QuickAction>
        <QuickAction onClick={() => navigate('/admin/analytics')} whileTap={{ scale: 0.98 }}>
          <div className="icon"><BarChart3 size={24} /></div>
          <div className="label">Analytics</div>
          <div className="count">{stats.growthRate}%</div>
        </QuickAction>
      </QuickActions>
      
      <StatsGrid>
        <StatCard whileHover={{ y: -5 }}>
          <StatHeader>
            <StatTitle>Utilisateurs actifs</StatTitle>
            <StatIcon><Users size={24} /></StatIcon>
          </StatHeader>
          <StatValue>{stats.totalUsers}</StatValue>
          <StatChange positive={stats.growthRate > 0}>
            <TrendingUp size={12} /> +{stats.growthRate}% cette semaine
          </StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatHeader>
            <StatTitle>DAU / WAU / MAU</StatTitle>
            <StatIcon><Activity size={24} /></StatIcon>
          </StatHeader>
          <StatValue>{stats.dailyActiveUsers} / {stats.weeklyActiveUsers} / {stats.monthlyActiveUsers}</StatValue>
          <StatChange positive>Ratio DAU/MAU: {((stats.dailyActiveUsers / stats.monthlyActiveUsers) * 100).toFixed(1)}%</StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatHeader>
            <StatTitle>Contenu</StatTitle>
            <StatIcon><Music size={24} /></StatIcon>
          </StatHeader>
          <StatValue>{stats.totalTracks} morceaux</StatValue>
          <StatChange>{stats.totalVideos} vidéos • {stats.totalPosts} posts</StatChange>
        </StatCard>
        
        <StatCard whileHover={{ y: -5 }}>
          <StatHeader>
            <StatTitle>Revenus</StatTitle>
            <StatIcon><DollarSign size={24} /></StatIcon>
          </StatHeader>
          <StatValue>{stats.totalRevenue.toLocaleString()}€</StatValue>
          <StatChange positive={stats.revenueGrowth > 0}>
            <TrendingUp size={12} /> +{stats.revenueGrowth}% ce mois
          </StatChange>
        </StatCard>
      </StatsGrid>
      
      <SectionTitle>Vérifications en attente ({stats.pendingVerifications})</SectionTitle>
      <Table>
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Type</th>
            <th>Email</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pendingVerifications.slice(0, 5).map(verif => (
            <tr key={verif.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={verif.user?.avatar_url} style={{ width: 32, height: 32, borderRadius: 16 }} />
                  {verif.user?.display_name || verif.user?.username}
                </div>
              </td>
              <td>{verif.user?.role === 'artist' ? '🎤 Artiste' : '🛍️ Vendeur'}</td>
              <td>{verif.user?.email}</td>
              <td>{new Date(verif.created_at).toLocaleDateString()}</td>
              <td>
                <ActionButton onClick={() => handleVerify(verif.id, verif.user?.role)} whileTap={{ scale: 0.9 }}>
                  <CheckCircle size={18} color="#00C851" />
                </ActionButton>
                <ActionButton onClick={() => handleReject(verif.id, verif.user?.role)} whileTap={{ scale: 0.9 }}>
                  <XCircle size={18} color="#FF4444" />
                </ActionButton>
              </td>
            </tr>
          ))}
          {pendingVerifications.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucune vérification en attente</td></tr>
          )}
        </tbody>
      </Table>
      
      <SectionTitle>Signalements récents ({stats.pendingReports})</SectionTitle>
      <Table>
        <thead>
          <tr>
            <th>Signaleur</th>
            <th>Signalé</th>
            <th>Raison</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recentReports.slice(0, 5).map(report => (
            <tr key={report.id}>
              <td>@{report.reporter?.username}</td>
              <td>@{report.reported?.username}</td>
              <td>{report.reason}</td>
              <td>{formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: fr })}</td>
              <td>
                <ActionButton onClick={() => handleResolveReport(report.id)} whileTap={{ scale: 0.9 }}>
                  <CheckCircle size={18} color="#00C851" />
                </ActionButton>
                <ActionButton onClick={() => handleBlockUser(report.reported_id)} whileTap={{ scale: 0.9 }}>
                  <XCircle size={18} color="#FF4444" />
                </ActionButton>
              </td>
            </tr>
          ))}
          {recentReports.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Aucun signalement en attente</td></tr>
          )}
        </tbody>
      </Table>
      
      <SectionTitle>Dernières commandes</SectionTitle>
      <Table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Client</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {recentOrders.map(order => (
            <tr key={order.id}>
              <td>#{order.id.slice(-8)}</td>
              <td>@{order.buyer?.username}</td>
              <td>{order.total_amount}€</td>
              <td><StatusBadge status={order.status}>{order.status}</StatusBadge></td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      <SectionTitle>Derniers utilisateurs</SectionTitle>
      <Table>
        <thead>
          <tr>
            <th>Pseudo</th>
            <th>Email</th>
            <th>Rôle</th>
            <th>Date</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {recentUsers.map(user => (
            <tr key={user.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={user.avatar_url} style={{ width: 32, height: 32, borderRadius: 16 }} />
                  @{user.username}
                </div>
              </td>
              <td>{user.email}</td>
              <td>{user.role === 'fan' ? 'Fan' : user.role === 'artist' ? 'Artiste' : 'Vendeur'}</td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td><StatusBadge status={user.is_verified ? 'active' : 'pending'}>
                {user.is_verified ? 'Vérifié' : 'En attente'}
              </StatusBadge></td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}

export default AdminDashboard
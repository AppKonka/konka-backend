// src/modules/artist/pages/Analytics.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'

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
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const ChartContainer = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin: 16px;
  height: 300px;
`

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 16px 12px;
  color: ${props => props.theme.text};
`

const COLORS = ['#FF6B35', '#33B5E5', '#00C851', '#FFB444']

const Analytics = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalPlays: 0,
    totalLikes: 0,
    totalFollowers: 0,
    totalTracks: 0
  })
  const [playsData, setPlaysData] = useState([])
  const [genreDistribution, setGenreDistribution] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      // Récupérer les morceaux
      const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', user.id)
      
      const totalPlays = tracks?.reduce((sum, t) => sum + (t.play_count || 0), 0) || 0
      const totalLikes = tracks?.reduce((sum, t) => sum + (t.like_count || 0), 0) || 0
      
      // Récupérer les abonnés
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)
      
      // Données d'écoutes par jour (simulation)
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        last7Days.push({
          date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          plays: Math.floor(Math.random() * 100)
        })
      }
      
      // Distribution par genre
      const genreMap = {}
      tracks?.forEach(track => {
        if (track.genre) {
          genreMap[track.genre] = (genreMap[track.genre] || 0) + 1
        }
      })
      
      const genreData = Object.entries(genreMap).map(([name, value]) => ({ name, value }))
      
      setStats({
        totalPlays,
        totalLikes,
        totalFollowers: followersCount || 0,
        totalTracks: tracks?.length || 0
      })
      setPlaysData(last7Days)
      setGenreDistribution(genreData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <Header title="Analytics" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Analytics" showBack />
      
      <HeaderSection>
        <Title>Mes statistiques</Title>
        <Subtitle>Analysez vos performances</Subtitle>
      </HeaderSection>
      
      <StatsGrid>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.totalPlays.toLocaleString()}</StatValue>
          <StatLabel>Écoutes totales</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.totalLikes.toLocaleString()}</StatValue>
          <StatLabel>Likes</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.totalFollowers.toLocaleString()}</StatValue>
          <StatLabel>Abonnés</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.totalTracks}</StatValue>
          <StatLabel>Morceaux</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <SectionTitle>Écoutes des 7 derniers jours</SectionTitle>
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={playsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="plays" stroke="#FF6B35" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
      
      {genreDistribution.length > 0 && (
        <>
          <SectionTitle>Distribution par genre</SectionTitle>
          <ChartContainer>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Analytics
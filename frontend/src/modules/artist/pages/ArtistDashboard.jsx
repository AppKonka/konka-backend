// src/modules/artist/pages/ArtistDashboard.jsx
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const TopTracksList = styled.div`
  padding: 0 16px;
`

const TrackItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const TrackRank = styled.div`
  width: 32px;
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const TrackCover = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`

const TrackInfo = styled.div`
  flex: 1;
`

const TrackTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const TrackStats = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const TrackPlays = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.primary};
`

const UpcomingLiveCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin: 0 16px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const LiveInfo = styled.div`
  flex: 1;
`

const LiveTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const LiveDate = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const LivePrice = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
`

const ReplayList = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 16px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const ReplayCard = styled(motion.div)`
  min-width: 140px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
`

const ReplayThumbnail = styled.div`
  height: 140px;
  background: ${props => props.theme.border};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ReplayInfo = styled.div`
  padding: 8px;
`

const ReplayTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const ReplayViews = styled.p`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
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
  padding: 40px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
`

const ArtistDashboard = () => {
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const [stats, setStats] = useState({
    followers: 0,
    plays: 0,
    tracks: 0,
    revenue: 0,
  })
  const [topTracks, setTopTracks] = useState([])
  const [upcomingLives, setUpcomingLives] = useState([])
  const [replays, setReplays] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      // Charger les statistiques
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id)

      const { data: tracksData } = await supabase
        .from('tracks')
        .select('id, play_count, like_count')
        .eq('artist_id', user.id)

      const totalPlays = tracksData?.reduce((sum, t) => sum + (t.play_count || 0), 0) || 0

      const { data: dedicationsData } = await supabase
        .from('dedications')
        .select('price')
        .eq('artist_id', user.id)
        .eq('status', 'completed')

      const totalRevenue = dedicationsData?.reduce((sum, d) => sum + (d.price || 0), 0) || 0

      setStats({
        followers: followersCount || 0,
        plays: totalPlays,
        tracks: tracksData?.length || 0,
        revenue: totalRevenue,
      })

      // Charger les top tracks
      const { data: topTracksData } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', user.id)
        .order('play_count', { ascending: false })
        .limit(5)

      setTopTracks(topTracksData || [])

      // Charger les lives à venir
      const { data: livesData } = await supabase
        .from('lives')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(3)

      setUpcomingLives(livesData || [])

      // Charger les replays
      const { data: replaysData } = await supabase
        .from('lives')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(5)

      setReplays(replaysData || [])
      
      console.log('📊 Tableau de bord chargé:', {
        followers: followersCount,
        plays: totalPlays,
        tracks: tracksData?.length,
        revenue: totalRevenue
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

  if (loading) {
    return (
      <Container>
        <Header title="Tableau de bord" showProfile />
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
      <Header title="Tableau de bord" showProfile />
      
      <WelcomeSection>
        <WelcomeTitle>
          Bonjour, {userProfile?.display_name || userProfile?.username} 👋
        </WelcomeTitle>
        <WelcomeSubtitle>
          Voici l'activité de votre profil artiste
        </WelcomeSubtitle>
      </WelcomeSection>
      
      <StatsGrid>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{formatNumber(stats.followers)}</StatValue>
          <StatLabel>Abonnés</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{formatNumber(stats.plays)}</StatValue>
          <StatLabel>Écoutes totales</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.tracks}</StatValue>
          <StatLabel>Morceaux publiés</StatLabel>
        </StatCard>
        <StatCard whileTap={{ scale: 0.98 }}>
          <StatValue>{stats.revenue.toLocaleString()}€</StatValue>
          <StatLabel>Revenus totaux</StatLabel>
        </StatCard>
      </StatsGrid>
      
      <QuickActions>
        <QuickActionButton
          onClick={() => navigate('/artist/music')}
          whileTap={{ scale: 0.95 }}
        >
          🎵 Publier un morceau
        </QuickActionButton>
        <QuickActionButton
          onClick={() => navigate('/artist/live')}
          whileTap={{ scale: 0.95 }}
        >
          🔴 Programmer un live
        </QuickActionButton>
        <QuickActionButton
          onClick={() => navigate('/artist/dedications')}
          whileTap={{ scale: 0.95 }}
        >
          🎬 Voir les dédicaces
        </QuickActionButton>
      </QuickActions>
      
      {topTracks.length > 0 ? (
        <>
          <SectionTitle>Top morceaux</SectionTitle>
          <TopTracksList>
            {topTracks.map((track, index) => (
              <TrackItem 
                key={track.id} 
                onClick={() => navigate(`/artist/music/edit/${track.id}`)}
                whileTap={{ scale: 0.98 }}
              >
                <TrackRank>#{index + 1}</TrackRank>
                <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
                <TrackInfo>
                  <TrackTitle>{track.title}</TrackTitle>
                  <TrackStats>
                    {formatNumber(track.play_count || 0)} écoutes • {track.like_count || 0} ❤️
                  </TrackStats>
                </TrackInfo>
                <TrackPlays>
                  {track.like_count || 0} ❤️
                </TrackPlays>
              </TrackItem>
            ))}
          </TopTracksList>
        </>
      ) : (
        <EmptyState>
          <div className="icon">🎵</div>
          <div>Aucun morceau publié</div>
          <Button onClick={() => navigate('/artist/music')} style={{ marginTop: 16 }}>
            Publier mon premier morceau
          </Button>
        </EmptyState>
      )}
      
      {upcomingLives.length > 0 ? (
        <>
          <SectionTitle>Prochains lives</SectionTitle>
          {upcomingLives.map(live => (
            <UpcomingLiveCard 
              key={live.id} 
              onClick={() => navigate(`/artist/live/edit/${live.id}`)}
              whileTap={{ scale: 0.98 }}
            >
              <LiveInfo>
                <LiveTitle>{live.title}</LiveTitle>
                <LiveDate>📅 {formatDate(live.scheduled_at)}</LiveDate>
                {live.description && (
                  <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                    {live.description.substring(0, 60)}...
                  </p>
                )}
              </LiveInfo>
              {live.price > 0 ? (
                <LivePrice>{live.price}€</LivePrice>
              ) : (
                <LivePrice>Gratuit</LivePrice>
              )}
            </UpcomingLiveCard>
          ))}
        </>
      ) : (
        <EmptyState>
          <div className="icon">🔴</div>
          <div>Aucun live programmé</div>
          <Button onClick={() => navigate('/artist/live')} style={{ marginTop: 16 }}>
            Programmer un live
          </Button>
        </EmptyState>
      )}
      
      {replays.length > 0 && (
        <>
          <SectionTitle>Replays récents</SectionTitle>
          <ReplayList>
            {replays.map(replay => (
              <ReplayCard 
                key={replay.id} 
                onClick={() => navigate(`/artist/live/replay/${replay.id}`)}
                whileTap={{ scale: 0.95 }}
              >
                <ReplayThumbnail>
                  <img src={replay.thumbnail_url || '/images/default-live.jpg'} alt={replay.title} />
                </ReplayThumbnail>
                <ReplayInfo>
                  <ReplayTitle>{replay.title}</ReplayTitle>
                  <ReplayViews>{replay.viewer_count || 0} vues</ReplayViews>
                </ReplayInfo>
              </ReplayCard>
            ))}
          </ReplayList>
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default ArtistDashboard
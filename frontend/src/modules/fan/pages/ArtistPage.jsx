// src/modules/fan/pages/ArtistPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { usePlayer } from '../../shared/context/PlayerContext'
import { supabase } from '../../../config/supabase'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const CoverImage = styled.div`
  height: 250px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  position: relative;
`

const ProfileHeader = styled.div`
  position: relative;
  padding: 0 16px;
`

const AvatarWrapper = styled.div`
  position: absolute;
  top: -60px;
  left: 16px;
  border: 4px solid ${props => props.theme.background};
  border-radius: 50%;
`

const ActionButtons = styled.div`
  position: absolute;
  top: 10px;
  right: 16px;
  display: flex;
  gap: 12px;
`

const ProfileInfo = styled.div`
  margin-top: 70px;
  margin-bottom: 20px;
`

const Name = styled.h2`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const Username = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const Bio = styled.p`
  font-size: 14px;
  color: ${props => props.theme.text};
  line-height: 1.4;
  margin-bottom: 16px;
`

const StatsContainer = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px 0;
  border-top: 1px solid ${props => props.theme.border};
  border-bottom: 1px solid ${props => props.theme.border};
`

const StatItem = styled.div`
  flex: 1;
  text-align: center;
  cursor: pointer;
`

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 20px 16px 12px;
  color: ${props => props.theme.text};
`

const TrackList = styled.div`
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

const PlayButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
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

const MerchGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 0 16px;
`

const MerchItem = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
`

const MerchImage = styled.img`
  width: 100%;
  height: 120px;
  object-fit: cover;
`

const MerchInfo = styled.div`
  padding: 8px;
`

const MerchName = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const MerchPrice = styled.div`
  font-size: 12px;
  color: ${props => props.theme.primary};
  font-weight: 600;
`

const ArtistPage = () => {
  const { artistId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playTrack, addToQueue } = usePlayer()
  
  const [artist, setArtist] = useState(null)
  const [tracks, setTracks] = useState([])
  const [upcomingLives, setUpcomingLives] = useState([])
  const [merch, setMerch] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [stats, setStats] = useState({
    followers: 0,
    tracks: 0,
    plays: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadArtistData()
    checkFollowStatus()
  }, [artistId])

  const loadArtistData = async () => {
    setLoading(true)
    try {
      // Charger les infos de l'artiste
      const { data: artistData, error: artistError } = await supabase
        .from('users')
        .select(`
          *,
          artists:artists(*)
        `)
        .eq('id', artistId)
        .single()
      
      if (artistError) throw artistError
      setArtist(artistData)
      
      // Charger les morceaux
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', artistId)
        .eq('is_public', true)
        .order('play_count', { ascending: false })
      
      setTracks(tracksData || [])
      
      // Charger les lives à venir
      const { data: livesData } = await supabase
        .from('lives')
        .select('*')
        .eq('host_id', artistId)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
      
      setUpcomingLives(livesData || [])
      
      // Charger les produits dérivés
      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', artistId)
        .eq('is_active', true)
      
      setMerch(productsData || [])
      
      // Compter les abonnés
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', artistId)
      
      setStats({
        followers: followersCount || 0,
        tracks: tracksData?.length || 0,
        plays: tracksData?.reduce((sum, t) => sum + (t.play_count || 0), 0) || 0
      })
      
    } catch (error) {
      console.error('Error loading artist:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', artistId)
      
      if (error) throw error
      setIsFollowing(data && data.length > 0)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', artistId)
        setIsFollowing(false)
        setStats(prev => ({ ...prev, followers: prev.followers - 1 }))
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: artistId
          })
        setIsFollowing(true)
        setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handlePlayTrack = (track) => {
    playTrack(track)
  }

  const handleAddToQueue = (track) => {
    addToQueue(track)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Container>
        <Header title="Artiste" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  if (!artist) {
    return (
      <Container>
        <Header title="Artiste" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Artiste non trouvé</div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Artiste" showBack />
      
      <CoverImage />
      
      <ProfileHeader>
        <AvatarWrapper>
          <Avatar
            src={artist.avatar_url}
            name={artist.display_name}
            size={100}
          />
        </AvatarWrapper>
        
        <ActionButtons>
          <Button
            variant={isFollowing ? "outline" : "primary"}
            onClick={handleFollow}
            size="small"
          >
            {isFollowing ? "Abonné" : "S'abonner"}
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/fan/dedication?artist=${artist.id}`)}
            size="small"
          >
            Dédicace
          </Button>
        </ActionButtons>
        
        <ProfileInfo>
          <Name>{artist.artists?.artist_name || artist.display_name}</Name>
          <Username>@{artist.username}</Username>
          {artist.bio && <Bio>{artist.bio}</Bio>}
        </ProfileInfo>
        
        <StatsContainer>
          <StatItem onClick={() => navigate(`/fan/artist/${artist.id}/followers`)}>
            <StatValue>{stats.followers}</StatValue>
            <StatLabel>Abonnés</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.tracks}</StatValue>
            <StatLabel>Morceaux</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.plays.toLocaleString()}</StatValue>
            <StatLabel>Écoutes</StatLabel>
          </StatItem>
        </StatsContainer>
      </ProfileHeader>
      
      {tracks.length > 0 && (
        <>
          <SectionTitle>Morceaux populaires</SectionTitle>
          <TrackList>
            {tracks.slice(0, 5).map((track, index) => (
              <TrackItem
                key={track.id}
                onClick={() => handlePlayTrack(track)}
                whileTap={{ scale: 0.98 }}
              >
                <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
                <TrackInfo>
                  <TrackTitle>{track.title}</TrackTitle>
                  <TrackStats>{track.play_count?.toLocaleString() || 0} écoutes</TrackStats>
                </TrackInfo>
                <PlayButton
                  onClick={(e) => {
                    e.stopPropagation()
                    handleAddToQueue(track)
                  }}
                >
                  ➕
                </PlayButton>
                <PlayButton>▶️</PlayButton>
              </TrackItem>
            ))}
          </TrackList>
        </>
      )}
      
      {upcomingLives.length > 0 && (
        <>
          <SectionTitle>Lives à venir</SectionTitle>
          {upcomingLives.map(live => (
            <UpcomingLiveCard key={live.id} whileTap={{ scale: 0.98 }}>
              <LiveInfo>
                <LiveTitle>{live.title}</LiveTitle>
                <LiveDate>📅 {formatDate(live.scheduled_at)}</LiveDate>
              </LiveInfo>
              <Button size="small" onClick={() => navigate(`/fan/live/${live.id}`)}>
                Rappeler
              </Button>
            </UpcomingLiveCard>
          ))}
        </>
      )}
      
      {merch.length > 0 && (
        <>
          <SectionTitle>Produits dérivés</SectionTitle>
          <MerchGrid>
            {merch.slice(0, 4).map(product => (
              <MerchItem
                key={product.id}
                onClick={() => navigate(`/fan/shopping/product/${product.id}`)}
                whileTap={{ scale: 0.98 }}
              >
                <MerchImage src={product.images?.[0] || '/images/default-product.jpg'} />
                <MerchInfo>
                  <MerchName>{product.name}</MerchName>
                  <MerchPrice>{product.price}€</MerchPrice>
                </MerchInfo>
              </MerchItem>
            ))}
          </MerchGrid>
        </>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default ArtistPage
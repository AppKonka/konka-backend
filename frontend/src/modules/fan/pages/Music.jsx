// src/modules/fan/pages/Music.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { usePlayer } from '../../shared/context/PlayerContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const Tab = styled(motion.button)`
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  cursor: pointer;
`

const ForYouSection = styled.div`
  padding: 16px;
`

const DailySuggestions = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const TrackList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const TrackItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
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

const TrackArtist = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const TrackDuration = styled.span`
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

const TrendingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px;
`

const TrendingItem = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
`

const TrendingCover = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`

const TrendingInfo = styled.div`
  padding: 8px;
`

const TrendingTitle = styled.h4`
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const TrendingArtist = styled.p`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
`

const PlaylistCard = styled(motion.div)`
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  border-radius: 16px;
  padding: 16px;
  margin: 16px;
  color: white;
`

const PlaylistTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
`

const PlaylistSubtitle = styled.p`
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 16px;
`

const ArtistGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
`

const ArtistCard = styled(motion.div)`
  text-align: center;
  cursor: pointer;
`

const ArtistAvatar = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  border-radius: 40px;
  overflow: hidden;
  background: ${props => props.theme.border};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ArtistName = styled.h4`
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const ArtistFollowers = styled.p`
  font-size: 10px;
  color: ${props => props.theme.textSecondary};
`

const Music = () => {
  const [activeTab, setActiveTab] = useState('forYou')
  const [tracks, setTracks] = useState([])
  const [trending, setTrending] = useState([])
  const [playlists, setPlaylists] = useState([])
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuth()
  const { playTrack, addToQueue, currentTrack, isPlaying, pauseTrack, resumeTrack } = usePlayer()

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'forYou') {
        await loadForYou()
      } else if (activeTab === 'trending') {
        await loadTrending()
      } else if (activeTab === 'playlists') {
        await loadPlaylists()
      } else if (activeTab === 'artists') {
        await loadArtists()
      }
    } catch (error) {
      console.error('Error loading music data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadForYou = async () => {
    // Charger les suggestions du jour
    const { data: suggestions } = await supabase
      .from('tracks')
      .select(`
        *,
        artist:users(id, username, avatar_url)
      `)
      .order('play_count', { ascending: false })
      .limit(5)
    
    // Charger les nouveautés des artistes suivis
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    
    const artistIds = follows?.map(f => f.following_id) || []
    
    const { data: newReleases } = await supabase
      .from('tracks')
      .select(`
        *,
        artist:users(id, username, avatar_url)
      `)
      .in('artist_id', artistIds)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Charger les recommandations basées sur les écoutes
    const { data: recommendations } = await supabase
      .from('tracks')
      .select(`
        *,
        artist:users(id, username, avatar_url)
      `)
      .order('like_count', { ascending: false })
      .limit(10)
    
    setTracks({
      suggestions: suggestions || [],
      newReleases: newReleases || [],
      recommendations: recommendations || [],
    })
  }

  const loadTrending = async () => {
    const { data } = await supabase
      .from('tracks')
      .select(`
        *,
        artist:users(id, username, avatar_url)
      `)
      .order('play_count', { ascending: false })
      .limit(20)
    
    setTrending(data || [])
  }

  const loadPlaylists = async () => {
    // Playlists personnelles
    const { data: userPlaylists } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', user.id)
      .limit(5)
    
    // Playlists officielles
    const { data: officialPlaylists } = await supabase
      .from('playlists')
      .select('*')
      .eq('is_official', true)
      .limit(5)
    
    setPlaylists({
      user: userPlaylists || [],
      official: officialPlaylists || [],
    })
  }

  const loadArtists = async () => {
    // Artistes favoris
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    
    const artistIds = follows?.map(f => f.following_id) || []
    
    const { data: favoriteArtists } = await supabase
      .from('users')
      .select('id, username, avatar_url')
      .in('id', artistIds)
      .limit(10)
    
    // Artistes tendance
    const { data: trendingArtists } = await supabase
      .from('users')
      .select(`
        id,
        username,
        avatar_url,
        tracks(count)
      `)
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
      .limit(10)
    
    setArtists({
      favorite: favoriteArtists || [],
      trending: trendingArtists || [],
    })
  }

  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      pauseTrack()
    } else if (currentTrack?.id === track.id && !isPlaying) {
      resumeTrack()
    } else {
      playTrack(track)
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Container>
      <Header title="Musique" showProfile />
      
      <TabsContainer>
        <Tab
          active={activeTab === 'forYou'}
          onClick={() => setActiveTab('forYou')}
        >
          Pour toi
        </Tab>
        <Tab
          active={activeTab === 'trending'}
          onClick={() => setActiveTab('trending')}
        >
          Tendances
        </Tab>
        <Tab
          active={activeTab === 'playlists'}
          onClick={() => setActiveTab('playlists')}
        >
          Playlists
        </Tab>
        <Tab
          active={activeTab === 'artists'}
          onClick={() => setActiveTab('artists')}
        >
          Artistes
        </Tab>
      </TabsContainer>
      
      <AnimatePresence mode="wait">
        {activeTab === 'forYou' && (
          <motion.div
            key="forYou"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ForYouSection>
              {!loading && tracks.suggestions && (
                <DailySuggestions>
                  <SectionTitle>Suggestions du jour</SectionTitle>
                  <TrackList>
                    {tracks.suggestions.slice(0, 5).map(track => (
                      <TrackItem
                        key={track.id}
                        onClick={() => handlePlayTrack(track)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
                        <TrackInfo>
                          <TrackTitle>{track.title}</TrackTitle>
                          <TrackArtist>{track.artist?.username}</TrackArtist>
                        </TrackInfo>
                        <TrackDuration>{formatDuration(track.duration)}</TrackDuration>
                        <PlayButton>
                          {currentTrack?.id === track.id && isPlaying ? '⏸️' : '▶️'}
                        </PlayButton>
                      </TrackItem>
                    ))}
                  </TrackList>
                </DailySuggestions>
              )}
              
              {!loading && tracks.newReleases && tracks.newReleases.length > 0 && (
                <div>
                  <SectionTitle>Nouveautés de vos artistes</SectionTitle>
                  <TrackList>
                    {tracks.newReleases.slice(0, 5).map(track => (
                      <TrackItem
                        key={track.id}
                        onClick={() => handlePlayTrack(track)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
                        <TrackInfo>
                          <TrackTitle>{track.title}</TrackTitle>
                          <TrackArtist>{track.artist?.username}</TrackArtist>
                        </TrackInfo>
                        <TrackDuration>{formatDuration(track.duration)}</TrackDuration>
                        <PlayButton>
                          {currentTrack?.id === track.id && isPlaying ? '⏸️' : '▶️'}
                        </PlayButton>
                      </TrackItem>
                    ))}
                  </TrackList>
                </div>
              )}
            </ForYouSection>
          </motion.div>
        )}
        
        {activeTab === 'trending' && (
          <motion.div
            key="trending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PlaylistCard>
              <PlaylistTitle>TOP 50 KONKA</PlaylistTitle>
              <PlaylistSubtitle>Les morceaux les plus écoutés cette semaine</PlaylistSubtitle>
              <Button variant="outline" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                Écouter
              </Button>
            </PlaylistCard>
            
            <TrendingGrid>
              {trending.slice(0, 10).map((track, index) => (
                <TrendingItem
                  key={track.id}
                  onClick={() => handlePlayTrack(track)}
                  whileTap={{ scale: 0.98 }}
                >
                  <TrendingCover src={track.cover_url || '/images/default-album.jpg'} />
                  <TrendingInfo>
                    <TrendingTitle>{index + 1}. {track.title}</TrendingTitle>
                    <TrendingArtist>{track.artist?.username}</TrendingArtist>
                  </TrendingInfo>
                </TrendingItem>
              ))}
            </TrendingGrid>
          </motion.div>
        )}
        
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {playlists.user && playlists.user.length > 0 && (
              <div>
                <SectionTitle style={{ paddingLeft: 16 }}>Vos playlists</SectionTitle>
                <TrackList style={{ padding: 16 }}>
                  {playlists.user.map(playlist => (
                    <TrackItem key={playlist.id} whileTap={{ scale: 0.98 }}>
                      <TrackCover src={playlist.cover_url || '/images/default-playlist.jpg'} />
                      <TrackInfo>
                        <TrackTitle>{playlist.name}</TrackTitle>
                        <TrackArtist>{playlist.track_count || 0} morceaux</TrackArtist>
                      </TrackInfo>
                      <PlayButton>▶️</PlayButton>
                    </TrackItem>
                  ))}
                </TrackList>
              </div>
            )}
            
            {playlists.official && playlists.official.length > 0 && (
              <div>
                <SectionTitle style={{ paddingLeft: 16 }}>Playlists Konka</SectionTitle>
                <TrackList style={{ padding: 16 }}>
                  {playlists.official.map(playlist => (
                    <TrackItem key={playlist.id} whileTap={{ scale: 0.98 }}>
                      <TrackCover src={playlist.cover_url || '/images/default-playlist.jpg'} />
                      <TrackInfo>
                        <TrackTitle>{playlist.name}</TrackTitle>
                        <TrackArtist>Konka • {playlist.track_count || 0} morceaux</TrackArtist>
                      </TrackInfo>
                      <PlayButton>▶️</PlayButton>
                    </TrackItem>
                  ))}
                </TrackList>
              </div>
            )}
          </motion.div>
        )}
        
        {activeTab === 'artists' && (
          <motion.div
            key="artists"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {artists.favorite && artists.favorite.length > 0 && (
              <div>
                <SectionTitle style={{ paddingLeft: 16 }}>Vos artistes favoris</SectionTitle>
                <ArtistGrid>
                  {artists.favorite.map(artist => (
                    <ArtistCard key={artist.id} whileTap={{ scale: 0.95 }}>
                      <ArtistAvatar>
                        <img src={artist.avatar_url || '/images/default-avatar.png'} alt={artist.username} />
                      </ArtistAvatar>
                      <ArtistName>@{artist.username}</ArtistName>
                    </ArtistCard>
                  ))}
                </ArtistGrid>
              </div>
            )}
            
            {artists.trending && artists.trending.length > 0 && (
              <div>
                <SectionTitle style={{ paddingLeft: 16 }}>Artistes tendance</SectionTitle>
                <ArtistGrid>
                  {artists.trending.map(artist => (
                    <ArtistCard key={artist.id} whileTap={{ scale: 0.95 }}>
                      <ArtistAvatar>
                        <img src={artist.avatar_url || '/images/default-avatar.png'} alt={artist.username} />
                      </ArtistAvatar>
                      <ArtistName>@{artist.username}</ArtistName>
                      <ArtistFollowers>{artist.tracks?.[0]?.count || 0} morceaux</ArtistFollowers>
                    </ArtistCard>
                  ))}
                </ArtistGrid>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Music
// src/modules/fan/pages/PlaylistDetail.jsx
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

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderImage = styled.div`
  height: 250px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const PlaylistArtwork = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 16px;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  backdrop-filter: blur(10px);
`

const PlaylistInfo = styled.div`
  padding: 20px 16px;
`

const PlaylistName = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const PlaylistCreator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const PlaylistStats = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 16px;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
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

const TrackNumber = styled.div`
  width: 32px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.textSecondary};
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
  margin-right: 12px;
`

const PlayButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.primary};
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

const PlaylistDetail = () => {
  const { playlistId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playTrack, addPlaylistToQueue, clearQueue, isPlaying, pauseTrack, resumeTrack } = usePlayer()
  
  const [playlist, setPlaylist] = useState(null)
  const [tracks, setTracks] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlaylist()
    checkFollowStatus()
    checkLikeStatus()
  }, [playlistId])

  const loadPlaylist = async () => {
    setLoading(true)
    try {
      // Charger la playlist
      const { data: playlistData, error: playlistError } = await supabase
        .from('playlists')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .eq('id', playlistId)
        .single()
      
      if (playlistError) throw playlistError
      setPlaylist(playlistData)
      
      // Charger les morceaux
      const { data: tracksData } = await supabase
        .from('playlist_tracks')
        .select(`
          *,
          track:tracks(
            *,
            artist:users(id, username, avatar_url)
          )
        `)
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true })
      
      setTracks(tracksData?.map(pt => pt.track) || [])
      
    } catch (error) {
      console.error('Error loading playlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!user || !playlist) return
    
    try {
      const { data, error } = await supabase
        .from('playlist_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('playlist_id', playlistId)
      
      if (error) throw error
      setIsFollowing(data && data.length > 0)
    } catch (error) {
      console.error('Error checking follow status:', error)
    }
  }

  const checkLikeStatus = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('playlist_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('playlist_id', playlistId)
      
      if (error) throw error
      setIsLiked(data && data.length > 0)
    } catch (error) {
      console.error('Error checking like status:', error)
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
          .from('playlist_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('playlist_id', playlistId)
        setIsFollowing(false)
        setPlaylist(prev => ({ ...prev, follower_count: prev.follower_count - 1 }))
      } else {
        await supabase
          .from('playlist_follows')
          .insert({
            user_id: user.id,
            playlist_id: playlistId
          })
        setIsFollowing(true)
        setPlaylist(prev => ({ ...prev, follower_count: prev.follower_count + 1 }))
      }
    } catch (error) {
      console.error('Error toggling follow:', error)
    }
  }

  const handleLike = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      if (isLiked) {
        await supabase
          .from('playlist_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('playlist_id', playlistId)
        setIsLiked(false)
        setPlaylist(prev => ({ ...prev, like_count: prev.like_count - 1 }))
      } else {
        await supabase
          .from('playlist_likes')
          .insert({
            user_id: user.id,
            playlist_id: playlistId
          })
        setIsLiked(true)
        setPlaylist(prev => ({ ...prev, like_count: prev.like_count + 1 }))
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const handlePlayAll = () => {
    clearQueue()
    addPlaylistToQueue(tracks)
    playTrack(tracks[0])
  }

  const handlePlayTrack = (track) => {
    playTrack(track)
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Container>
        <Header title="Playlist" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  if (!playlist) {
    return (
      <Container>
        <Header title="Playlist" showBack />
        <EmptyState>
          <div className="icon">🎵</div>
          <div>Playlist non trouvée</div>
        </EmptyState>
        <BottomNavigation />
      </Container>
    )
  }

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const totalMinutes = Math.floor(totalDuration / 60)
  const totalSeconds = totalDuration % 60

  return (
    <Container>
      <Header title="Playlist" showBack />
      
      <HeaderImage>
        <PlaylistArtwork>
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt={playlist.name} style={{ width: '100%', height: '100%', borderRadius: 16, objectFit: 'cover' }} />
          ) : (
            '🎵'
          )}
        </PlaylistArtwork>
      </HeaderImage>
      
      <PlaylistInfo>
        <PlaylistName>{playlist.name}</PlaylistName>
        <PlaylistCreator>
          <Avatar
            src={playlist.user?.avatar_url}
            name={playlist.user?.username}
            size={24}
          />
          <span>@{playlist.user?.username}</span>
        </PlaylistCreator>
        <PlaylistStats>
          {tracks.length} morceaux • {totalMinutes}:{totalSeconds.toString().padStart(2, '0')} • {playlist.follower_count || 0} abonnés
        </PlaylistStats>
        
        <ActionButtons>
          <Button onClick={handlePlayAll}>
            ▶️ Tout écouter
          </Button>
          <Button variant="outline" onClick={handleFollow}>
            {isFollowing ? '✓ Abonné' : '+ S\'abonner'}
          </Button>
          <Button variant="outline" onClick={handleLike}>
            {isLiked ? '❤️' : '🤍'}
          </Button>
        </ActionButtons>
      </PlaylistInfo>
      
      {tracks.length === 0 ? (
        <EmptyState>
          <div className="icon">🎵</div>
          <div>Aucun morceau dans cette playlist</div>
        </EmptyState>
      ) : (
        <TrackList>
          {tracks.map((track, index) => (
            <TrackItem
              key={track.id}
              onClick={() => handlePlayTrack(track)}
              whileTap={{ scale: 0.98 }}
            >
              <TrackNumber>{index + 1}</TrackNumber>
              <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
              <TrackInfo>
                <TrackTitle>{track.title}</TrackTitle>
                <TrackArtist>{track.artist?.username}</TrackArtist>
              </TrackInfo>
              <TrackDuration>{formatDuration(track.duration)}</TrackDuration>
              <PlayButton>▶️</PlayButton>
            </TrackItem>
          ))}
        </TrackList>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default PlaylistDetail
// src/modules/fan/pages/AlbumDetail.jsx
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

const AlbumHeader = styled.div`
  display: flex;
  gap: 20px;
  padding: 20px;
  background: ${props => props.theme.surface};
`

const AlbumCover = styled.img`
  width: 140px;
  height: 140px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: ${props => props.theme.shadow.lg};
`

const AlbumInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const AlbumTitle = styled.h1`
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const ArtistName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
`

const ReleaseDate = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`

const TrackList = styled.div`
  padding: 0 16px;
  margin-top: 16px;
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
  width: 40px;
  height: 40px;
  border-radius: 6px;
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

const TrackDuration = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-right: 12px;
`

const PlayButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: ${props => props.theme.primary};
`

const AlbumDetail = () => {
  const { albumId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { playTrack, addPlaylistToQueue, clearQueue } = usePlayer()
  
  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlbum()
    checkSavedStatus()
  }, [albumId])

  const loadAlbum = async () => {
    setLoading(true)
    try {
      // Charger l'album
      const { data: albumData, error: albumError } = await supabase
        .from('albums')
        .select(`
          *,
          artist:users(id, username, avatar_url)
        `)
        .eq('id', albumId)
        .single()
      
      if (albumError) throw albumError
      setAlbum(albumData)
      
      // Charger les morceaux
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .eq('album_id', albumId)
        .order('track_number', { ascending: true })
      
      setTracks(tracksData || [])
      
    } catch (error) {
      console.error('Error loading album:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSavedStatus = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('saved_albums')
        .select('id')
        .eq('user_id', user.id)
        .eq('album_id', albumId)
      
      if (error) throw error
      setIsSaved(data && data.length > 0)
    } catch (error) {
      console.error('Error checking saved status:', error)
    }
  }

  const handleSave = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    
    try {
      if (isSaved) {
        await supabase
          .from('saved_albums')
          .delete()
          .eq('user_id', user.id)
          .eq('album_id', albumId)
        setIsSaved(false)
      } else {
        await supabase
          .from('saved_albums')
          .insert({
            user_id: user.id,
            album_id: albumId
          })
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Error saving album:', error)
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Container>
        <Header title="Album" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  if (!album) {
    return (
      <Container>
        <Header title="Album" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Album non trouvé</div>
        <BottomNavigation />
      </Container>
    )
  }

  const totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0)
  const totalMinutes = Math.floor(totalDuration / 60)

  return (
    <Container>
      <Header title="Album" showBack />
      
      <AlbumHeader>
        <AlbumCover src={album.cover_url || '/images/default-album.jpg'} />
        <AlbumInfo>
          <AlbumTitle>{album.title}</AlbumTitle>
          <ArtistName onClick={() => navigate(`/fan/artist/${album.artist?.id}`)}>
            <Avatar src={album.artist?.avatar_url} name={album.artist?.username} size={24} />
            <span>@{album.artist?.username}</span>
          </ArtistName>
          <ReleaseDate>
            Sortie le {formatDate(album.release_date)} • {tracks.length} morceaux • {totalMinutes} min
          </ReleaseDate>
          <ActionButtons>
            <Button onClick={handlePlayAll}>
              ▶️ Tout écouter
            </Button>
            <Button variant="outline" onClick={handleSave}>
              {isSaved ? '✓ Enregistré' : '+ Enregistrer'}
            </Button>
          </ActionButtons>
        </AlbumInfo>
      </AlbumHeader>
      
      <TrackList>
        {tracks.map((track, index) => (
          <TrackItem
            key={track.id}
            onClick={() => handlePlayTrack(track)}
            whileTap={{ scale: 0.98 }}
          >
            <TrackNumber>{index + 1}</TrackNumber>
            <TrackCover src={track.cover_url || album.cover_url || '/images/default-album.jpg'} />
            <TrackInfo>
              <TrackTitle>{track.title}</TrackTitle>
            </TrackInfo>
            <TrackDuration>{formatDuration(track.duration)}</TrackDuration>
            <PlayButton>▶️</PlayButton>
          </TrackItem>
        ))}
      </TrackList>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default AlbumDetail
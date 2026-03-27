// src/modules/fan/pages/Feed.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { VideoFeed } from '../components/VideoFeed/VideoFeed'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled(motion.div)`
  height: 100vh;
  background: ${props => props.theme.background};
  overflow: hidden;
`

const LoadingContainer = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-direction: column;
  gap: 16px;
`

const LoadingText = styled(motion.p)`
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
`

const ErrorContainer = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  text-align: center;
`

const ErrorText = styled.p`
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
`

const RetryButton = styled(motion.button)`
  padding: 10px 20px;
  border-radius: 24px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 14px;
  cursor: pointer;
`

const Feed = () => {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadVideos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*, user:users(id, username, avatar_url)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setVideos(data || [])
      
      console.log('📺 Vidéos chargées:', {
        count: data?.length || 0,
        userId: user?.id
      })
    } catch (error) {
      console.error('Error loading videos:', error)
      setError('Impossible de charger les vidéos. Veuillez réessayer.')
      toast.error('Erreur de chargement des vidéos')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  const handleLike = async (videoId, newCount) => {
    console.log('❤️ Like sur la vidéo:', videoId, newCount)
    // Mettre à jour localement le compteur de likes
    setVideos(prev => prev.map(v => 
      v.id === videoId ? { ...v, like_count: newCount } : v
    ))
  }

  const handleComment = (videoId) => {
    console.log('💬 Commentaire sur la vidéo:', videoId)
    // Ici on pourrait ouvrir le modal de commentaires
  }

  const handleShare = (video) => {
    console.log('🔁 Partage de la vidéo:', video.id)
    // Copier le lien dans le presse-papier
    const shareUrl = `${window.location.origin}/video/${video.id}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Lien copié dans le presse-papier')
  }

  const handleMusicClick = (music) => {
    console.log('🎵 Clic sur la musique:', music)
    // Naviguer vers la page du morceau
    toast.info(`Écouter ${music.title} - ${music.artist}`)
  }

  const handleUserClick = (userId) => {
    console.log('👤 Clic sur l\'utilisateur:', userId)
    // Naviguer vers le profil de l'utilisateur
    // navigate(`/fan/profile/${userId}`)
  }

  const handleVideoEnd = () => {
    console.log('📺 Vidéo terminée')
  }

  if (loading) {
    return (
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <Header title="Feed" showProfile />
        <LoadingContainer
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: 32 }}
          >
            🎬
          </motion.div>
          <LoadingText>Chargement des vidéos...</LoadingText>
        </LoadingContainer>
        <BottomNavigation />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Header title="Feed" showProfile />
        <ErrorContainer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{ fontSize: 48 }}
          >
            ⚠️
          </motion.div>
          <ErrorText>{error}</ErrorText>
          <RetryButton
            onClick={loadVideos}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
          >
            Réessayer
          </RetryButton>
        </ErrorContainer>
        <BottomNavigation />
      </Container>
    )
  }

  if (videos.length === 0) {
    return (
      <Container>
        <Header title="Feed" showProfile />
        <ErrorContainer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{ fontSize: 48 }}
          >
            🎥
          </motion.div>
          <ErrorText>Aucune vidéo pour le moment</ErrorText>
          <ErrorText style={{ fontSize: 12 }}>
            Reviens plus tard pour découvrir du contenu
          </ErrorText>
        </ErrorContainer>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header title="Feed" showProfile />
      <VideoFeed
        videos={videos}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onMusicClick={handleMusicClick}
        onUserClick={handleUserClick}
        onVideoEnd={handleVideoEnd}
      />
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Feed
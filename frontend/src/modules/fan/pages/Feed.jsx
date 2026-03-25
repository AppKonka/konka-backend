// src/modules/fan/pages/Feed.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { VideoFeed } from '../components/VideoFeed/VideoFeed'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  height: 100vh;
  background: ${props => props.theme.background};
  overflow: hidden;
`

const Feed = () => {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*, user:users(id, username, avatar_url)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error loading videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (videoId, newCount) => {
    console.log('Like video:', videoId, newCount)
  }

  const handleComment = (videoId) => {
    console.log('Comment on video:', videoId)
  }

  const handleShare = (video) => {
    console.log('Share video:', video.id)
  }

  const handleMusicClick = (music) => {
    console.log('Music click:', music)
  }

  const handleUserClick = (userId) => {
    console.log('User click:', userId)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Feed" showProfile />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          Chargement...
        </div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Feed" showProfile />
      <VideoFeed
        videos={videos}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onMusicClick={handleMusicClick}
        onUserClick={handleUserClick}
      />
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Feed
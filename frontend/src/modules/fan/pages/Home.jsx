// src/modules/fan/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { VideoCard } from '../components/VideoFeed/VideoCard'
import { useAuth } from '../../shared/context/AuthContext'
import { usePlayer } from '../../shared/context/PlayerContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const FeedSection = styled.div`
  scroll-snap-align: start;
  position: relative;
`

const TabsContainer = styled.div`
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  z-index: 10;
  background: ${props => props.theme.background}80;
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const TabButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: ${props => props.active ? 'none' : props.theme.shadow.sm};
`

const ModeSelector = styled.div`
  position: fixed;
  top: 120px;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  background: ${props => props.theme.background}80;
  backdrop-filter: blur(10px);
`

const ModeButton = styled(motion.button)`
  padding: 6px 12px;
  border-radius: 16px;
  border: none;
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.textSecondary};
  font-size: 12px;
  cursor: pointer;
`

const InterestSlider = styled.div`
  position: fixed;
  bottom: 100px;
  left: 0;
  right: 0;
  z-index: 10;
  background: ${props => props.theme.background}CC;
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 20px;
  margin: 0 16px;
`

const SliderLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const Slider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: ${props => props.theme.border};
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.primary};
    cursor: pointer;
  }
`

const tabs = [
  { id: 'all', label: 'Pour tous' },
  { id: 'matches', label: 'Mes smatches' },
  { id: 'artists', label: 'Mes artistes' },
  { id: 'challenges', label: 'Challenges' },
]

const modes = [
  { id: 'ai', label: 'IA' },
  { id: 'friends', label: 'Amis' },
  { id: 'global', label: 'Global' },
]

const interests = [
  { id: 'music', label: '🎵 Musique' },
  { id: 'humor', label: '😂 Humour' },
  { id: 'business', label: '💼 Business' },
  { id: 'sport', label: '⚽ Sport' },
]

const Home = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [activeMode, setActiveMode] = useState('ai')
  const [interestWeights, setInterestWeights] = useState({
    music: 50,
    humor: 50,
    business: 50,
    sport: 50,
  })
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showInterestSlider, setShowInterestSlider] = useState(false)
  
  const containerRef = useRef(null)
  const { user } = useAuth()
  const { playTrack } = usePlayer()

  useEffect(() => {
    loadVideos()
  }, [activeTab, activeMode, interestWeights])

  const loadVideos = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('videos')
        .select(`
          *,
          user:users(id, username, avatar_url),
          music:music_track_id(*)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(20)

      // Filtrer selon l'onglet
      if (activeTab === 'matches') {
        // Récupérer les matchs de l'utilisateur
        const { data: matches } = await supabase
          .from('matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq('status', 'matched')
        
        const matchIds = matches?.flatMap(m => 
          m.user1_id === user.id ? m.user2_id : m.user1_id
        ) || []
        
        query = query.in('user_id', matchIds)
      } else if (activeTab === 'artists') {
        // Récupérer les artistes suivis
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)
        
        const artistIds = follows?.map(f => f.following_id) || []
        query = query.in('user_id', artistIds)
      }

      const { data, error } = await query
      
      if (error) throw error
      setVideos(data || [])
    } catch (error) {
      console.error('Error loading videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScroll = () => {
    if (!containerRef.current) return
    
    const scrollPosition = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollPosition / videoHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex)
    }
  }

  const handleVideoEnd = () => {
    // Passer à la vidéo suivante
    if (currentIndex < videos.length - 1) {
      containerRef.current.scrollTo({
        top: (currentIndex + 1) * window.innerHeight,
        behavior: 'smooth',
      })
    }
  }

  const handleLike = async (videoId, currentLikes) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ like_count: currentLikes + 1 })
        .eq('id', videoId)
      
      if (error) throw error
      
      // Mettre à jour localement
      setVideos(prev => prev.map(v => 
        v.id === videoId ? { ...v, like_count: v.like_count + 1 } : v
      ))
    } catch (error) {
      console.error('Error liking video:', error)
    }
  }

  return (
    <>
      <Header title="Accueil" showProfile />
      
      <TabsContainer>
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileTap={{ scale: 0.95 }}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabsContainer>
      
      <ModeSelector>
        {modes.map(mode => (
          <ModeButton
            key={mode.id}
            active={activeMode === mode.id}
            onClick={() => setActiveMode(mode.id)}
            whileTap={{ scale: 0.95 }}
          >
            {mode.label}
          </ModeButton>
        ))}
      </ModeSelector>
      
      {activeMode === 'ai' && (
        <InterestSlider>
          <SliderLabel>
            <span>Ajuste ton feed</span>
            <span onClick={() => setShowInterestSlider(!showInterestSlider)} style={{ cursor: 'pointer' }}>
              {showInterestSlider ? '▼' : '▲'}
            </span>
          </SliderLabel>
          {showInterestSlider && (
            <div>
              {interests.map(interest => (
                <div key={interest.id} style={{ marginBottom: 12 }}>
                  <SliderLabel>
                    <span>{interest.label}</span>
                    <span>{interestWeights[interest.id]}%</span>
                  </SliderLabel>
                  <Slider
                    type="range"
                    min="0"
                    max="100"
                    value={interestWeights[interest.id]}
                    onChange={(e) => setInterestWeights({
                      ...interestWeights,
                      [interest.id]: parseInt(e.target.value),
                    })}
                  />
                </div>
              ))}
            </div>
          )}
        </InterestSlider>
      )}
      
      <Container
        ref={containerRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            Chargement...
          </div>
        ) : (
          videos.map((video, index) => (
            <FeedSection key={video.id}>
              <VideoCard
                video={video}
                isActive={index === currentIndex}
                onLike={() => handleLike(video.id, video.like_count)}
                onShare={() => {}}
                onComment={() => {}}
                onMusicClick={() => video.music && playTrack(video.music)}
                onUserClick={() => {}}
                onEnded={handleVideoEnd}
              />
            </FeedSection>
          ))
        )}
      </Container>
      
      <BottomNavigation />
      <MusicPlayer />
    </>
  )
}

export default Home
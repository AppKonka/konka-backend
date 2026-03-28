// src/modules/fan/pages/Live.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
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

const LiveNowSection = styled.div`
  padding: 16px;
  overflow-x: auto;
  display: flex;
  gap: 16px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const LiveCard = styled(motion.div)`
  min-width: 280px;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
`

const LiveThumbnail = styled.div`
  height: 160px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .live-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: #FF4444;
    color: white;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .viewers {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0,0,0,0.7);
    color: white;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
  }
`

const LiveInfo = styled.div`
  padding: 12px;
`

const LiveTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const LiveHost = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

const UpcomingList = styled.div`
  padding: 16px;
`

const UpcomingItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
`

const UpcomingInfo = styled.div`
  flex: 1;
`

const UpcomingTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const UpcomingDate = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const RemindButton = styled(motion.button)`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.primary};
  background: transparent;
  color: ${props => props.theme.primary};
  font-size: 12px;
  cursor: pointer;
`

const LiveViewer = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
`

const LiveHeader = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`

const LiveHostInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const LiveStats = styled.div`
  display: flex;
  gap: 16px;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const LiveInteractions = styled.div`
  position: absolute;
  right: 16px;
  bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
`

const InteractionButton = styled(motion.button)`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: rgba(0,0,0,0.5);
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CommentsOverlay = styled.div`
  position: absolute;
  bottom: 80px;
  left: 16px;
  right: 100px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
`

const CommentBubble = styled.div`
  background: rgba(0,0,0,0.5);
  border-radius: 20px;
  padding: 8px 12px;
  margin-bottom: 8px;
  color: white;
  font-size: 13px;
  
  strong {
    color: ${props => props.theme.primary};
  }
`

const LiveInput = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  display: flex;
  gap: 12px;
  z-index: 10;
  
  input {
    flex: 1;
    padding: 12px;
    border-radius: 24px;
    border: none;
    background: rgba(255,255,255,0.2);
    color: white;
    
    &::placeholder {
      color: rgba(255,255,255,0.6);
    }
  }
  
  button {
    width: 44px;
    height: 44px;
    border-radius: 22px;
    border: none;
    background: ${props => props.theme.primary};
    color: white;
    font-size: 20px;
    cursor: pointer;
  }
`

const Live = () => {
  const [activeTab, setActiveTab] = useState('live')
  const [liveNow, setLiveNow] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [replays, setReplays] = useState([])
  const [selectedLive, setSelectedLive] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [viewers, setViewers] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuth()
  const playerRef = useRef(null)

  useEffect(() => {
    loadLives()
    
    // Écouter les nouveaux commentaires
    if (selectedLive) {
      const subscription = supabase
        .channel(`live:${selectedLive.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `live_id=eq.${selectedLive.id}`,
        }, (payload) => {
          setComments(prev => [...prev, payload.new])
        })
        .subscribe()
      
      return () => {
        subscription.unsubscribe()
      }
    }
  }, [selectedLive])

  const loadLives = async () => {
    setLoading(true)
    try {
      // Lives en cours
      const { data: liveData } = await supabase
        .from('lives')
        .select(`
          *,
          host:users(id, username, avatar_url)
        `)
        .eq('status', 'live')
        .order('started_at', { ascending: false })
      
      setLiveNow(liveData || [])
      
      // Lives à venir
      const { data: upcomingData } = await supabase
        .from('lives')
        .select(`
          *,
          host:users(id, username, avatar_url)
        `)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
      
      setUpcoming(upcomingData || [])
      
      // Replays
      const { data: replayData } = await supabase
        .from('lives')
        .select(`
          *,
          host:users(id, username, avatar_url)
        `)
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
        .limit(10)
      
      setReplays(replayData || [])
    } catch (error) {
      console.error('Error loading lives:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinLive = (live) => {
    setSelectedLive(live)
    setViewers(live.viewer_count || 0)
    
    // Incrémenter le compteur de viewers
    supabase
      .from('lives')
      .update({ viewer_count: (live.viewer_count || 0) + 1 })
      .eq('id', live.id)
      .then()
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    
    try {
      const { error } = await supabase
        .from('live_comments')
        .insert({
          live_id: selectedLive.id,
          user_id: user.id,
          content: commentText,
        })
      
      if (error) throw error
      setCommentText('')
    } catch (error) {
      console.error('Error sending comment:', error)
    }
  }

  const handleLike = () => {
    // Animation de cœur
    console.log('Like')
  }

  const handleDonate = () => {
    // Ouvrir modal de donation
    console.log('Donate')
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Container>
      <Header title="Live" showProfile />
      
      <TabsContainer>
        <Tab
          active={activeTab === 'live'}
          onClick={() => setActiveTab('live')}
        >
          En direct
        </Tab>
        <Tab
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
        >
          À venir
        </Tab>
        <Tab
          active={activeTab === 'replays'}
          onClick={() => setActiveTab('replays')}
        >
          Replays
        </Tab>
      </TabsContainer>
      
      {activeTab === 'live' && (
        <LiveNowSection>
          {loading ? (
            <div>Chargement...</div>
          ) : liveNow.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Aucun live en cours
            </div>
          ) : (
            liveNow.map(live => (
              <LiveCard
                key={live.id}
                onClick={() => handleJoinLive(live)}
                whileTap={{ scale: 0.98 }}
              >
                <LiveThumbnail>
                  <img src={live.thumbnail_url || '/images/default-live.jpg'} alt={live.title} />
                  <div className="live-badge">
                    <span>🔴</span> LIVE
                  </div>
                  <div className="viewers">
                    👁️ {live.viewer_count || 0}
                  </div>
                </LiveThumbnail>
                <LiveInfo>
                  <LiveTitle>{live.title}</LiveTitle>
                  <LiveHost>
                    <Avatar src={live.host?.avatar_url} name={live.host?.username} size={28} />
                    <span style={{ fontSize: 12 }}>@{live.host?.username}</span>
                  </LiveHost>
                </LiveInfo>
              </LiveCard>
            ))
          )}
        </LiveNowSection>
      )}
      
      {activeTab === 'upcoming' && (
        <UpcomingList>
          {upcoming.map(live => (
            <UpcomingItem
              key={live.id}
              whileTap={{ scale: 0.98 }}
            >
              <Avatar src={live.host?.avatar_url} name={live.host?.username} size={48} />
              <UpcomingInfo>
                <UpcomingTitle>{live.title}</UpcomingTitle>
                <UpcomingDate>
                  📅 {formatDate(live.scheduled_at)}
                  {live.price > 0 && ` • ${live.price}€`}
                </UpcomingDate>
              </UpcomingInfo>
              <RemindButton whileTap={{ scale: 0.95 }}>
                🔔 Rappeler
              </RemindButton>
            </UpcomingItem>
          ))}
          {upcoming.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Aucun live à venir
            </div>
          )}
        </UpcomingList>
      )}
      
      {activeTab === 'replays' && (
        <UpcomingList>
          {replays.map(live => (
            <UpcomingItem
              key={live.id}
              onClick={() => handleJoinLive(live)}
              whileTap={{ scale: 0.98 }}
            >
              <Avatar src={live.host?.avatar_url} name={live.host?.username} size={48} />
              <UpcomingInfo>
                <UpcomingTitle>{live.title}</UpcomingTitle>
                <UpcomingDate>
                  📅 {formatDate(live.started_at)} • {live.viewer_count || 0} vues
                </UpcomingDate>
              </UpcomingInfo>
              <RemindButton whileTap={{ scale: 0.95 }}>
                ▶️ Regarder
              </RemindButton>
            </UpcomingItem>
          ))}
          {replays.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Aucun replay disponible
            </div>
          )}
        </UpcomingList>
      )}
      
      <BottomNavigation />
      
      {selectedLive && (
        <LiveViewer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <LiveHeader>
            <LiveHostInfo>
              <Avatar src={selectedLive.host?.avatar_url} name={selectedLive.host?.username} size={40} />
              <div>
                <div style={{ fontWeight: 'bold' }}>@{selectedLive.host?.username}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{selectedLive.title}</div>
              </div>
            </LiveHostInfo>
            <LiveStats>
              <span>👁️ {viewers}</span>
              <span>❤️ {selectedLive.likes || 0}</span>
            </LiveStats>
            <CloseButton onClick={() => setSelectedLive(null)}>✕</CloseButton>
          </LiveHeader>
          
          <ReactPlayer
            ref={playerRef}
            url={selectedLive.stream_url || selectedLive.video_url}
            playing={selectedLive.status === 'live'}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{
              file: {
                attributes: {
                  playsInline: true,
                },
              },
            }}
          />
          
          <LiveInteractions>
            <InteractionButton onClick={handleLike} whileTap={{ scale: 0.9 }}>
              ❤️
            </InteractionButton>
            <InteractionButton onClick={handleDonate} whileTap={{ scale: 0.9 }}>
              🎁
            </InteractionButton>
            <InteractionButton whileTap={{ scale: 0.9 }}>
              🔗
            </InteractionButton>
          </LiveInteractions>
          
          <CommentsOverlay>
            {comments.slice(-10).map(comment => (
              <CommentBubble key={comment.id}>
                <strong>@{comment.user?.username}</strong> {comment.content}
              </CommentBubble>
            ))}
          </CommentsOverlay>
          
          <LiveInput>
            <input
              type="text"
              placeholder="Écrire un commentaire..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button onClick={handleSendComment}>➤</button>
          </LiveInput>
        </LiveViewer>
      )}
    </Container>
  )
}

export default Live
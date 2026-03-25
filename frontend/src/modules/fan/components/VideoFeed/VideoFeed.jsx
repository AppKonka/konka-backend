// src/modules/fan/components/VideoFeed/VideoFeed.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { useInView } from 'react-intersection-observer'
import { Avatar } from '../../../shared/components/ui/Avatar'
import { useAuth } from '../../../shared/context/AuthContext'
import { supabase } from '../../../../config/supabase'

const Container = styled.div`
  position: relative;
  height: 100vh;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  scroll-behavior: smooth;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const VideoContainer = styled.div`
  position: relative;
  height: 100vh;
  scroll-snap-align: start;
  background: #000;
`

const VideoWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  
  video {
    object-fit: cover;
  }
`

const Overlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 80px 16px 20px;
  color: white;
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  cursor: pointer;
`

const Username = styled.span`
  font-weight: 600;
  font-size: 16px;
`

const Description = styled.p`
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
`

const Hashtags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  
  span {
    color: #FF6B35;
    font-size: 14px;
  }
`

const MusicInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  cursor: pointer;
  
  span:first-child {
    font-size: 12px;
  }
`

const ActionsColumn = styled.div`
  position: absolute;
  right: 12px;
  bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 10;
`

const ActionButton = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  
  .icon {
    font-size: 28px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  
  .count {
    font-size: 12px;
    color: white;
    font-weight: 500;
  }
`

const HeartAnimation = styled(motion.div)`
  position: absolute;
  font-size: 80px;
  pointer-events: none;
  z-index: 20;
`

const CommentModal = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.surface};
  border-radius: 20px 20px 0 0;
  z-index: 100;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
`

const CommentHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const CommentList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`

const CommentItem = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`

const CommentContent = styled.div`
  flex: 1;
`

const CommentUsername = styled.span`
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
`

const CommentText = styled.span`
  font-size: 14px;
`

const CommentInput = styled.div`
  padding: 16px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
  
  input {
    flex: 1;
    padding: 12px;
    border-radius: 24px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.background};
    color: ${props => props.theme.text};
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
  
  button {
    padding: 12px 20px;
    border-radius: 24px;
    border: none;
    background: ${props => props.theme.primary};
    color: white;
    cursor: pointer;
  }
`

export const VideoFeed = ({ videos, onVideoEnd, onLike, onComment, onShare, onMusicClick, onUserClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [liked, setLiked] = useState({})
  const [showHeart, setShowHeart] = useState(false)
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 })
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState({})
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  
  const containerRef = useRef(null)
  const playerRefs = useRef({})
  const { user } = useAuth()

  useEffect(() => {
    // Charger les likes initiaux
    loadInitialLikes()
  }, [videos])

  const loadInitialLikes = async () => {
    if (!videos.length) return
    
    const videoIds = videos.map(v => v.id)
    const { data } = await supabase
      .from('likes')
      .select('post_id')
      .in('post_id', videoIds)
      .eq('user_id', user.id)
    
    const likedMap = {}
    data?.forEach(like => {
      likedMap[like.post_id] = true
    })
    setLiked(likedMap)
  }

  const loadComments = async (videoId) => {
    if (comments[videoId]) return
    
    setLoadingComments(true)
    try {
      const { data } = await supabase
        .from('comments')
        .select('*, user:users(id, username, avatar_url)')
        .eq('post_id', videoId)
        .order('created_at', { ascending: false })
        .limit(20)
      
      setComments(prev => ({ ...prev, [videoId]: data || [] }))
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    
    const scrollPosition = containerRef.current.scrollTop
    const videoHeight = window.innerHeight
    const newIndex = Math.round(scrollPosition / videoHeight)
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < videos.length) {
      setCurrentIndex(newIndex)
      // Pause la vidéo précédente
      if (playerRefs.current[videos[currentIndex]?.id]) {
        playerRefs.current[videos[currentIndex].id].seekTo(0)
      }
    }
  }, [currentIndex, videos])

  const handleDoubleClick = (e, video) => {
    if (!liked[video.id]) {
      setLiked(prev => ({ ...prev, [video.id]: true }))
      onLike?.(video.id, video.like_count + 1)
      
      // Position du cœur
      const rect = e.currentTarget.getBoundingClientRect()
      setHeartPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
  }

  const handleLike = (video) => {
    if (liked[video.id]) {
      setLiked(prev => ({ ...prev, [video.id]: false }))
      onLike?.(video.id, video.like_count - 1)
    } else {
      setLiked(prev => ({ ...prev, [video.id]: true }))
      onLike?.(video.id, video.like_count + 1)
    }
  }

  const handleComment = async (video) => {
    if (!newComment.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: video.id,
          user_id: user.id,
          content: newComment
        })
        .select('*, user:users(id, username, avatar_url)')
        .single()
      
      if (error) throw error
      
      setComments(prev => ({
        ...prev,
        [video.id]: [data, ...(prev[video.id] || [])]
      }))
      setNewComment('')
      onComment?.(video.id, (video.comment_count || 0) + 1)
    } catch (error) {
      console.error('Error posting comment:', error)
    }
  }

  const openComments = (video) => {
    loadComments(video.id)
    setShowComments(video.id)
  }

  if (!videos.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Aucune vidéo pour le moment
      </div>
    )
  }

  const currentVideo = videos[currentIndex]

  return (
    <>
      <Container ref={containerRef} onScroll={handleScroll}>
        {videos.map((video, index) => (
          <VideoContainer key={video.id}>
            <VideoWrapper onDoubleClick={(e) => handleDoubleClick(e, video)}>
              <ReactPlayer
                ref={ref => playerRefs.current[video.id] = ref}
                url={video.video_url}
                playing={index === currentIndex}
                loop={false}
                width="100%"
                height="100%"
                onEnded={() => index === videos.length - 1 && onVideoEnd?.()}
                config={{
                  file: {
                    attributes: {
                      controlsList: 'nodownload',
                      playsInline: true,
                    },
                  },
                }}
              />
            </VideoWrapper>
            
            <Overlay>
              <UserInfo onClick={() => onUserClick?.(video.user_id)}>
                <Avatar
                  src={video.user?.avatar_url}
                  name={video.user?.username}
                  size={40}
                />
                <Username>@{video.user?.username}</Username>
              </UserInfo>
              
              {video.description && <Description>{video.description}</Description>}
              
              {video.hashtags && video.hashtags.length > 0 && (
                <Hashtags>
                  {video.hashtags.map(tag => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </Hashtags>
              )}
              
              {video.music && (
                <MusicInfo onClick={() => onMusicClick?.(video.music)}>
                  <span>🎵</span>
                  <span>{video.music.title} - {video.music.artist}</span>
                </MusicInfo>
              )}
            </Overlay>
            
            <ActionsColumn>
              <ActionButton onClick={() => handleLike(video)} whileTap={{ scale: 0.9 }}>
                <div className="icon">{liked[video.id] ? '❤️' : '🤍'}</div>
                <div className="count">{video.like_count + (liked[video.id] ? 1 : 0)}</div>
              </ActionButton>
              
              <ActionButton onClick={() => openComments(video)} whileTap={{ scale: 0.9 }}>
                <div className="icon">💬</div>
                <div className="count">{video.comment_count || 0}</div>
              </ActionButton>
              
              <ActionButton onClick={() => onShare?.(video)} whileTap={{ scale: 0.9 }}>
                <div className="icon">🔁</div>
                <div className="count">{video.share_count || 0}</div>
              </ActionButton>
              
              <ActionButton whileTap={{ scale: 0.9 }}>
                <div className="icon">📌</div>
              </ActionButton>
            </ActionsColumn>
            
            <AnimatePresence>
              {showHeart && (
                <HeartAnimation
                  initial={{ scale: 0, opacity: 1, x: heartPosition.x, y: heartPosition.y }}
                  animate={{ scale: 1.5, opacity: 0, y: heartPosition.y - 100 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  ❤️
                </HeartAnimation>
              )}
            </AnimatePresence>
          </VideoContainer>
        ))}
      </Container>
      
      {showComments && (
        <CommentModal
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <CommentHeader>
            <h3>Commentaires ({comments[showComments]?.length || 0})</h3>
            <button onClick={() => setShowComments(false)} style={{ fontSize: 24 }}>✕</button>
          </CommentHeader>
          
          <CommentList>
            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: 20 }}>Chargement...</div>
            ) : comments[showComments]?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#888' }}>
                Aucun commentaire pour le moment
              </div>
            ) : (
              comments[showComments]?.map(comment => (
                <CommentItem key={comment.id}>
                  <Avatar
                    src={comment.user?.avatar_url}
                    name={comment.user?.username}
                    size={32}
                  />
                  <CommentContent>
                    <CommentUsername>@{comment.user?.username}</CommentUsername>
                    <CommentText>{comment.content}</CommentText>
                  </CommentContent>
                </CommentItem>
              ))
            )}
          </CommentList>
          
          <CommentInput>
            <input
              type="text"
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleComment(videos.find(v => v.id === showComments))}
            />
            <button onClick={() => handleComment(videos.find(v => v.id === showComments))}>
              Envoyer
            </button>
          </CommentInput>
        </CommentModal>
      )}
    </>
  )
}
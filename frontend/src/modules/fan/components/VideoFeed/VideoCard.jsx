// src/modules/fan/components/VideoFeed/VideoCard.jsx
import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Avatar } from '../../../shared/components/ui/Avatar'
import { useTheme } from '../../../shared/context/ThemeContext'

const Container = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
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
    color: ${props => props.theme.primary};
    font-size: 14px;
  }
`

const MusicInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  
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

export const VideoCard = ({
  video,
  isActive,
  onLike,
  onShare,
  onComment,
  onMusicClick,
  onUserClick,
  onEnded,
}) => {
  const [liked, setLiked] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 })
  const playerRef = useRef(null)
  const containerRef = useRef(null)
  const theme = useTheme()

  const handleDoubleClick = (e) => {
    if (!liked) {
      setLiked(true)
      onLike()
      
      // Position du cœur au clic
      const rect = containerRef.current.getBoundingClientRect()
      setHeartPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
  }

  const handleLikeClick = () => {
    if (!liked) {
      setLiked(true)
      onLike()
    }
  }

  return (
    <Container ref={containerRef} onDoubleClick={handleDoubleClick}>
      <VideoWrapper>
        <ReactPlayer
          ref={playerRef}
          url={video.video_url}
          playing={isActive}
          loop={false}
          width="100%"
          height="100%"
          onEnded={onEnded}
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
        <UserInfo onClick={onUserClick}>
          <Avatar
            src={video.user?.avatar_url}
            name={video.user?.username}
            size={40}
          />
          <Username>@{video.user?.username}</Username>
        </UserInfo>
        
        <Description>{video.description}</Description>
        
        {video.hashtags && (
          <Hashtags theme={theme}>
            {video.hashtags.map(tag => (
              <span key={tag}>#{tag}</span>
            ))}
          </Hashtags>
        )}
        
        {video.music && (
          <MusicInfo onClick={onMusicClick}>
            <span>🎵</span>
            <span>{video.music.title} - {video.music.artist}</span>
          </MusicInfo>
        )}
      </Overlay>
      
      <ActionsColumn>
        <ActionButton onClick={handleLikeClick} whileTap={{ scale: 0.9 }}>
          <div className="icon">{liked ? '❤️' : '🤍'}</div>
          <div className="count">{video.like_count + (liked ? 1 : 0)}</div>
        </ActionButton>
        
        <ActionButton onClick={onComment} whileTap={{ scale: 0.9 }}>
          <div className="icon">💬</div>
          <div className="count">{video.comment_count}</div>
        </ActionButton>
        
        <ActionButton onClick={onShare} whileTap={{ scale: 0.9 }}>
          <div className="icon">🔁</div>
          <div className="count">{video.share_count}</div>
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
    </Container>
  )
}
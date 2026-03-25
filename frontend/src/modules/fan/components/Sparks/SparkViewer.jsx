// src/modules/fan/components/Sparks/SparkViewer.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Avatar } from '../../../shared/components/ui/Avatar'
import { supabase } from '../../../../config/supabase'

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
`

const Header = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.5), transparent);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const ProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  z-index: 10;
`

const ProgressSegment = styled.div`
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  overflow: hidden;
`

const ProgressFill = styled(motion.div)`
  height: 100%;
  background: white;
  width: ${props => props.progress}%;
`

const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  img, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`

const ReplyButton = styled(motion.button)`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  border-radius: 30px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  z-index: 10;
`

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 20px;
  right: 16px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 10;
`

const SparkViewer = ({ sparks, initialIndex = 0, onClose, onReply, onRepost }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const timerRef = useRef(null)

  const currentSpark = sparks[currentIndex]

  useEffect(() => {
    startTimer()
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex])

  useEffect(() => {
    if (!isPaused) {
      startTimer()
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    const sparkDuration = currentSpark?.duration_minutes * 60 || 15
    setDuration(sparkDuration)
    setProgress(0)
    
    const startTime = Date.now()
    
    timerRef.current = setInterval(() => {
      if (isPaused) return
      
      const elapsed = (Date.now() - startTime) / 1000
      const newProgress = (elapsed / sparkDuration) * 100
      
      if (newProgress >= 100) {
        nextSpark()
      } else {
        setProgress(newProgress)
      }
    }, 100)
  }

  const nextSpark = () => {
    if (currentIndex < sparks.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  const prevSpark = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleTap = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    
    if (x < width / 3) {
      prevSpark()
    } else if (x > (width * 2) / 3) {
      nextSpark()
    } else {
      setIsPaused(!isPaused)
    }
  }

  const handleReply = () => {
    onReply?.(currentSpark)
    onClose()
  }

  const handleRepost = () => {
    onRepost?.(currentSpark)
    onClose()
  }

  if (!currentSpark) return null

  return (
    <Container
      ref={containerRef}
      onClick={handleTap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ProgressBar>
        {sparks.map((spark, idx) => (
          <ProgressSegment key={spark.id}>
            <ProgressFill
              progress={idx === currentIndex ? progress : idx < currentIndex ? 100 : 0}
            />
          </ProgressSegment>
        ))}
      </ProgressBar>
      
      <Header>
        <UserInfo>
          <Avatar
            src={currentSpark.user?.avatar_url}
            name={currentSpark.user?.username}
            size={40}
          />
          <div>
            <div style={{ fontWeight: 'bold', color: 'white' }}>
              @{currentSpark.user?.username}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {new Date(currentSpark.created_at).toLocaleTimeString()}
            </div>
          </div>
        </UserInfo>
        <CloseButton onClick={onClose} whileTap={{ scale: 0.9 }}>
          ✕
        </CloseButton>
      </Header>
      
      <MediaContainer>
        {currentSpark.type === 'photo' ? (
          <img src={currentSpark.media_url} alt="Spark" />
        ) : (
          <ReactPlayer
            ref={videoRef}
            url={currentSpark.media_url}
            playing={!isPaused}
            loop={false}
            width="100%"
            height="100%"
            onEnded={nextSpark}
            config={{
              file: {
                attributes: {
                  playsInline: true,
                },
              },
            }}
          />
        )}
      </MediaContainer>
      
      <ReplyButton onClick={handleReply} whileTap={{ scale: 0.95 }}>
        💬 Répondre
      </ReplyButton>
    </Container>
  )
}

export default SparkViewer
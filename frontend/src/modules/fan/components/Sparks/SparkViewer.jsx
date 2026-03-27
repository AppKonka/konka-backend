// src/modules/fan/components/Sparks/SparkViewer.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Avatar } from '../../../shared/components/ui/Avatar'
import { supabase } from '../../../../config/supabase'
import { toast } from 'react-hot-toast'

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

const RepostButton = styled(motion.button)`
  position: absolute;
  bottom: 30px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 30px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
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
  const [sparkDuration, setSparkDuration] = useState(15)
  
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const currentSpark = sparks[currentIndex]

  const nextSpark = useCallback(() => {
    if (currentIndex < sparks.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }, [currentIndex, sparks.length, onClose])

  const prevSpark = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    const duration = currentSpark?.duration_minutes * 60 || 15
    setSparkDuration(duration)
    setProgress(0)
    
    startTimeRef.current = Date.now()
    
    timerRef.current = setInterval(() => {
      if (isPaused) return
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const newProgress = (elapsed / duration) * 100
      
      if (newProgress >= 100) {
        nextSpark()
      } else {
        setProgress(newProgress)
      }
    }, 100)
  }, [currentSpark, isPaused, nextSpark])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleTap = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const width = rect.width
    
    if (x < width / 3) {
      prevSpark()
    } else if (x > (width * 2) / 3) {
      nextSpark()
    } else {
      setIsPaused(prev => !prev)
    }
  }, [prevSpark, nextSpark])

  const handleReply = useCallback(() => {
    onReply?.(currentSpark)
    onClose()
  }, [currentSpark, onReply, onClose])

  const handleRepost = useCallback(async () => {
    try {
      // Marquer le spark comme reposté
      const { data, error } = await supabase
        .from('spark_reposts')
        .insert({
          user_id: currentSpark.user_id,
          spark_id: currentSpark.id,
          reposted_by: currentSpark.user_id,
          created_at: new Date().toISOString()
        })
        .select()
      
      if (error) throw error
      
      if (data) {
        console.log('🔄 Spark reposté avec succès:', {
          sparkId: currentSpark.id,
          repostId: data[0].id
        })
      }
      
      onRepost?.(currentSpark)
      toast.success('Spark reposté avec succès !')
      onClose()
    } catch (error) {
      console.error('Error reposting spark:', error)
      toast.error('Erreur lors du repost')
    }
  }, [currentSpark, onRepost, onClose])

  useEffect(() => {
    startTimer()
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [currentIndex, startTimer])

  useEffect(() => {
    if (!isPaused) {
      // Redémarrer le timer avec le temps restant
      if (timerRef.current) clearInterval(timerRef.current)
      startTimer()
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPaused, startTimer])

  // Marquer le spark comme vu dans la base de données
  useEffect(() => {
    const markAsViewed = async () => {
      if (currentSpark && currentSpark.id) {
        try {
          const { error } = await supabase
            .from('spark_views')
            .insert({
              spark_id: currentSpark.id,
              user_id: currentSpark.user_id,
              viewed_at: new Date().toISOString()
            })
          
          if (error) throw error
          
          console.log('👁️ Spark marqué comme vu:', {
            sparkId: currentSpark.id,
            duration: sparkDuration,
            durationFormatted: formatDuration(sparkDuration)
          })
        } catch (error) {
          console.error('Error marking spark as viewed:', error)
        }
      }
    }
    
    markAsViewed()
  }, [currentSpark, sparkDuration])

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
              {new Date(currentSpark.created_at).toLocaleTimeString()} • {formatDuration(sparkDuration)}
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
      
      <RepostButton onClick={handleRepost} whileTap={{ scale: 0.95 }}>
        🔄 Reposter
      </RepostButton>
    </Container>
  )
}

export default SparkViewer
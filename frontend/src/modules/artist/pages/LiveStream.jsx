// src/modules/artist/pages/LiveStream.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Header } from '../../shared/components/layout/Header'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
`

const VideoPreview = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
`

const LocalVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 24px;
  z-index: 10;
`

const ControlButton = styled(motion.button)`
  width: 56px;
  height: 56px;
  border-radius: 28px;
  border: none;
  background: ${props => props.active ? props.theme.primary : 'rgba(255,255,255,0.2)'};
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  
  ${props => props.end && `
    background: #FF4444;
  `}
`

const StreamInfo = styled.div`
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

const StreamStats = styled.div`
  display: flex;
  gap: 16px;
  color: white;
`

const Viewers = styled.span`
  background: rgba(0,0,0,0.5);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
`

const LiveBadge = styled.span`
  background: #FF4444;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 4px;
    animation: pulse 1s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`

const CommentsOverlay = styled.div`
  position: absolute;
  bottom: 100px;
  left: 16px;
  right: 100px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const CommentBubble = styled.div`
  background: rgba(0,0,0,0.6);
  border-radius: 20px;
  padding: 8px 12px;
  color: white;
  font-size: 13px;
  max-width: 80%;
  
  strong {
    color: #FF6B35;
  }
`

const CommentInput = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
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
    background: #FF6B35;
    color: white;
    font-size: 20px;
    cursor: pointer;
  }
`

const LiveStream = () => {
  const { liveId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [isStreaming, setIsStreaming] = useState(false)
  const [viewers, setViewers] = useState(0)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [duration, setDuration] = useState(0)
  const [liveData, setLiveData] = useState(null)
  
  const localVideoRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const timerRef = useRef(null)

  // Définir initCamera avec useCallback
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      mediaStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      
      console.log('📷 Caméra initialisée avec succès')
    } catch (error) {
      console.error('Error accessing camera:', error)
      toast.error('Impossible d\'accéder à la caméra')
    }
  }, [])

  // Définir stopStream avec useCallback
  const stopStream = useCallback(async () => {
    try {
      // Arrêter la caméra
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop())
      }
      
      // Mettre à jour le statut
      const { data, error } = await supabase
        .from('lives')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          viewer_count: viewers
        })
        .eq('id', liveId)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('⏹️ Live terminé avec succès:', {
          liveId: data[0].id,
          title: data[0].title,
          endedAt: data[0].ended_at,
          totalViewers: viewers,
          duration: duration
        })
        
        // Sauvegarder les statistiques du live
        await supabase
          .from('live_stats')
          .insert({
            live_id: liveId,
            duration: duration,
            peak_viewers: viewers,
            total_comments: comments.length,
            ended_at: new Date().toISOString()
          })
      }
      
      if (timerRef.current) clearInterval(timerRef.current)
      navigate('/artist/dashboard')
      toast.success('Live terminé')
    } catch (error) {
      console.error('Error stopping stream:', error)
      toast.error('Erreur lors de l\'arrêt du live')
    }
  }, [liveId, navigate, viewers, duration, comments.length])

  // Mettre à jour les viewers en temps réel
  const updateViewers = useCallback(async () => {
    if (!liveId) return
    
    try {
      // Récupérer le nombre de spectateurs depuis la base de données
      const { data, error } = await supabase
        .from('lives')
        .select('viewer_count, title, status')
        .eq('id', liveId)
        .single()
      
      if (error) throw error
      
      if (data) {
        setViewers(data.viewer_count || 0)
        setLiveData(data)
        
        // Log des viewers
        console.log(`👁️ Viewers actuels: ${data.viewer_count} - Live: ${data.title}`)
      }
    } catch (error) {
      console.error('Error updating viewers:', error)
    }
  }, [liveId])

  // Incrémenter le compteur de viewers
  const incrementViewers = useCallback(async () => {
    if (!liveId || !isStreaming) return
    
    try {
      const { data, error } = await supabase
        .from('lives')
        .update({
          viewer_count: viewers + 1
        })
        .eq('id', liveId)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        setViewers(data[0].viewer_count)
      }
    } catch (error) {
      console.error('Error incrementing viewers:', error)
    }
  }, [liveId, isStreaming, viewers])

  useEffect(() => {
    // Initialiser la caméra
    initCamera()
    
    // Écouter les commentaires en temps réel
    if (liveId) {
      const subscription = supabase
        .channel(`live:${liveId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `live_id=eq.${liveId}`,
        }, (payload) => {
          setComments(prev => [...prev, payload.new])
          console.log('💬 Nouveau commentaire reçu:', payload.new)
        })
        .subscribe()
      
      // Mettre à jour les viewers toutes les 5 secondes
      const viewerInterval = setInterval(() => {
        updateViewers()
      }, 5000)
      
      return () => {
        subscription.unsubscribe()
        clearInterval(viewerInterval)
        stopStream()
      }
    }
  }, [liveId, initCamera, stopStream, updateViewers])

  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
      
      // Incrémenter les viewers au démarrage
      incrementViewers()
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isStreaming, incrementViewers])

  const startStream = async () => {
    try {
      // Mettre à jour le statut du live
      const { data, error } = await supabase
        .from('lives')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
          viewer_count: 1
        })
        .eq('id', liveId)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('🔴 Live démarré avec succès:', {
          liveId: data[0].id,
          title: data[0].title,
          startedAt: data[0].started_at,
          streamKey: `live_${Date.now()}`
        })
        
        setLiveData(data[0])
      }
      
      setIsStreaming(true)
      setViewers(1)
      
      toast.success('Live démarré !')
    } catch (error) {
      console.error('Error starting stream:', error)
      toast.error('Erreur lors du démarrage')
    }
  }

  const toggleMute = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
        
        console.log('🎤 Microphone:', !audioTrack.enabled ? 'désactivé' : 'activé')
      }
    }
  }

  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOn(videoTrack.enabled)
        
        console.log('📷 Caméra:', !videoTrack.enabled ? 'désactivée' : 'activée')
      }
    }
  }

  const sendComment = async () => {
    if (!commentText.trim()) return
    
    try {
      const { data, error } = await supabase
        .from('live_comments')
        .insert({
          live_id: liveId,
          user_id: user.id,
          content: commentText
        })
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('💬 Commentaire envoyé avec succès:', {
          liveId,
          commentId: data[0].id,
          content: commentText,
          userId: user.id,
          timestamp: data[0].created_at
        })
      }
      
      setCommentText('')
    } catch (error) {
      console.error('Error sending comment:', error)
      toast.error('Erreur lors de l\'envoi du commentaire')
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Container>
      <VideoPreview>
        <LocalVideo
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
        />
      </VideoPreview>
      
      <StreamInfo>
        <LiveBadge>LIVE</LiveBadge>
        <StreamStats>
          <Viewers>👁️ {viewers}</Viewers>
          <span>{formatDuration(duration)}</span>
          {liveData && liveData.title && (
            <span style={{ fontSize: 12, marginLeft: 8 }}>{liveData.title}</span>
          )}
        </StreamStats>
      </StreamInfo>
      
      <CommentsOverlay>
        {comments.slice(-10).map(comment => (
          <CommentBubble key={comment.id}>
            <strong>@{comment.user?.username}</strong> {comment.content}
          </CommentBubble>
        ))}
      </CommentsOverlay>
      
      <CommentInput>
        <input
          type="text"
          placeholder="Répondre aux commentaires..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendComment()}
        />
        <button onClick={sendComment}>➤</button>
      </CommentInput>
      
      <Controls>
        <ControlButton onClick={toggleMute} whileTap={{ scale: 0.9 }}>
          {isMuted ? '🔇' : '🎤'}
        </ControlButton>
        <ControlButton onClick={toggleCamera} whileTap={{ scale: 0.9 }}>
          {isCameraOn ? '📷' : '📷❌'}
        </ControlButton>
        {!isStreaming ? (
          <ControlButton active onClick={startStream} whileTap={{ scale: 0.9 }}>
            ▶️
          </ControlButton>
        ) : (
          <ControlButton end onClick={stopStream} whileTap={{ scale: 0.9 }}>
            ✕
          </ControlButton>
        )}
      </Controls>
    </Container>
  )
}

export default LiveStream
// src/modules/fan/components/Messages/CallView.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '../../../shared/components/ui/Avatar'

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1a1a2e;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 20px;
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
  color: white;
`

const Timer = styled.div`
  font-size: 18px;
  font-weight: 500;
  color: white;
`

const VideoContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`

const RemoteVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const LocalVideo = styled.video`
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 120px;
  height: 160px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid white;
  z-index: 10;
`

const Controls = styled.div`
  position: absolute;
  bottom: 40px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
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

const AvatarLarge = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 75px;
  background: ${props => props.theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
  margin-bottom: 24px;
`

const CallStatus = styled.div`
  text-align: center;
  color: white;
  margin-top: 24px;
`

const CallView = ({ 
  type, // 'audio' or 'video'
  user, 
  isIncoming, 
  onAccept, 
  onReject, 
  onEnd,
  onToggleMute,
  onToggleCamera
}) => {
  const [status, setStatus] = useState(isIncoming ? 'ringing' : 'connecting')
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [status])

  useEffect(() => {
    // Simuler la connexion
    if (!isIncoming && status === 'connecting') {
      setTimeout(() => {
        setStatus('connected')
      }, 2000)
    }
  }, [isIncoming, status])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAccept = () => {
    setStatus('connecting')
    onAccept?.()
    setTimeout(() => {
      setStatus('connected')
    }, 2000)
  }

  const handleReject = () => {
    onReject?.()
  }

  const handleEnd = () => {
    onEnd?.()
  }

  const handleMute = () => {
    setIsMuted(!isMuted)
    onToggleMute?.(!isMuted)
  }

  const handleCamera = () => {
    setIsCameraOn(!isCameraOn)
    onToggleCamera?.(!isCameraOn)
  }

  const handleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn)
  }

  const renderRinging = () => (
    <>
      <VideoContainer>
        <AvatarLarge>
          <Avatar src={user?.avatar_url} name={user?.username} size={150} />
        </AvatarLarge>
        <CallStatus>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{user?.username}</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Appel entrant...</div>
        </CallStatus>
      </VideoContainer>
      <Controls>
        <ControlButton onClick={handleReject} end whileTap={{ scale: 0.9 }}>
          ✕
        </ControlButton>
        <ControlButton onClick={handleAccept} active whileTap={{ scale: 0.9 }}>
          📞
        </ControlButton>
      </Controls>
    </>
  )

  const renderConnecting = () => (
    <>
      <VideoContainer>
        <AvatarLarge>
          <Avatar src={user?.avatar_url} name={user?.username} size={150} />
        </AvatarLarge>
        <CallStatus>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{user?.username}</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Connexion en cours...</div>
        </CallStatus>
      </VideoContainer>
      <Controls>
        <ControlButton onClick={handleEnd} end whileTap={{ scale: 0.9 }}>
          ✕
        </ControlButton>
      </Controls>
    </>
  )

  const renderConnected = () => (
    <>
      <VideoContainer>
        {type === 'video' ? (
          <>
            <RemoteVideo ref={remoteVideoRef} autoPlay playsInline />
            <LocalVideo ref={localVideoRef} autoPlay playsInline muted />
          </>
        ) : (
          <AvatarLarge>
            <Avatar src={user?.avatar_url} name={user?.username} size={150} />
          </AvatarLarge>
        )}
      </VideoContainer>
      
      <Header>
        <UserInfo>
          <Avatar src={user?.avatar_url} name={user?.username} size={40} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{user?.username}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{formatDuration(duration)}</div>
          </div>
        </UserInfo>
        <Timer>{formatDuration(duration)}</Timer>
      </Header>
      
      <Controls>
        <ControlButton onClick={handleMute} whileTap={{ scale: 0.9 }}>
          {isMuted ? '🔇' : '🎤'}
        </ControlButton>
        {type === 'video' && (
          <ControlButton onClick={handleCamera} whileTap={{ scale: 0.9 }}>
            {isCameraOn ? '📷' : '📷❌'}
          </ControlButton>
        )}
        <ControlButton onClick={handleSpeaker} whileTap={{ scale: 0.9 }}>
          {isSpeakerOn ? '🔊' : '🔈'}
        </ControlButton>
        <ControlButton onClick={handleEnd} end whileTap={{ scale: 0.9 }}>
          ✕
        </ControlButton>
      </Controls>
    </>
  )

  return (
    <Container
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
    >
      {status === 'ringing' && renderRinging()}
      {status === 'connecting' && renderConnecting()}
      {status === 'connected' && renderConnected()}
    </Container>
  )
}

export default CallView
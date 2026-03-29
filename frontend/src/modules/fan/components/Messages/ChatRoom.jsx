// src/modules/fan/components/Messages/ChatRoom.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Avatar } from '../../../shared/components/ui/Avatar'
import { useAuth } from '../../../shared/context/AuthContext'
import { supabase } from '../../../../config/supabase'
import { webrtcService } from "../../../../services/webrtc/webrtcService";
import CallView from './CallView'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.background};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
`

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.text};
`

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
`

const CallButtons = styled.div`
  display: flex;
  gap: 16px;
  
  button {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: ${props => props.theme.text};
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
`

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MessageBubble = styled(motion.div)`
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 20px;
  background: ${props => props.isOwn ? props.theme.primary : props.theme.surface};
  color: ${props => props.isOwn ? 'white' : props.theme.text};
  align-self: ${props => props.isOwn ? 'flex-end' : 'flex-start'};
  border-bottom-right-radius: ${props => props.isOwn ? '4px' : '20px'};
  border-bottom-left-radius: ${props => props.isOwn ? '20px' : '4px'};
`

const MessageText = styled.p`
  font-size: 15px;
  line-height: 1.4;
  margin: 0;
`

const MessageTime = styled.span`
  font-size: 10px;
  color: ${props => props.isOwn ? 'rgba(255,255,255,0.7)' : props.theme.textSecondary};
  margin-left: 8px;
`

const InputContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: ${props => props.theme.surface};
  border-top: 1px solid ${props => props.theme.border};
`

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 24px;
  background: ${props => props.theme.border};
  color: ${props => props.theme.text};
  font-size: 15px;
  
  &:focus {
    outline: none;
  }
`

const SendButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`

export const ChatRoom = ({ conversation, onBack }) => {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCallView, setShowCallView] = useState(false)
  const [callType, setCallType] = useState('audio')
  const [isCalling, setIsCalling] = useState(false)
  const [incomingCall, setIncomingCall] = useState(null)
  const messagesEndRef = useRef(null)
  const { user } = useAuth()

  // Fonction formatTime
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Écouter les appels entrants
  useEffect(() => {
    const subscription = supabase
      .channel(`calls:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'calls',
        filter: `to_user=eq.${user.id}`,
      }, (payload) => {
        if (payload.new.status === 'pending') {
          setIncomingCall(payload.new)
          toast.info(`Appel entrant de ${conversation.user?.username}`, {
            duration: 10000,
            icon: '📞',
          })
        }
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [user.id, conversation.user?.username])

  // Configurer les callbacks WebRTC
  useEffect(() => {
    webrtcService.onRemoteStream(() => {
      // Le flux distant est géré par CallView
    })
    
    webrtcService.onCallConnected(() => {
      console.log('Appel connecté')
    })
    
    webrtcService.onCallEnded(() => {
      setShowCallView(false)
      setIsCalling(false)
      setIncomingCall(null)
    })
    
    return () => {
      webrtcService.endCall()
    }
  }, [])

  const markAsRead = useCallback(async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId)
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', conversation.match_id)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setMessages(data || [])
      
      // Marquer les messages non lus comme lus
      const unreadMessages = data?.filter(m => !m.is_read && m.sender_id !== user.id) || []
      for (const msg of unreadMessages) {
        await markAsRead(msg.id)
      }
      
      scrollToBottom()
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }, [conversation.match_id, user.id, markAsRead, scrollToBottom])

  useEffect(() => {
    loadMessages()
    
    // Écouter les nouveaux messages en temps réel
    const subscription = supabase
      .channel(`match:${conversation.match_id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${conversation.match_id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
        markAsRead(payload.new.id)
        scrollToBottom()
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [conversation.match_id, loadMessages, markAsRead, scrollToBottom])

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: conversation.match_id,
          sender_id: user.id,
          content: newMessage,
          is_read: false,
        })
      
      if (error) throw error
      
      setNewMessage('')
      scrollToBottom()
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  const startCall = async (type) => {
    setCallType(type)
    setIsCalling(true)
    setShowCallView(true)
    
    try {
      await webrtcService.initLocalStream(type === 'audio', type === 'video')
      
      const callId = `${user.id}_${conversation.user.id}_${Date.now()}`
      
      // Créer l'offre
      const offer = await webrtcService.createOffer(callId, user.id, conversation.user.id)
      
      // Sauvegarder l'appel dans la base de données
      await supabase
        .from('calls')
        .insert({
          call_id: callId,
          type: type,
          from_user: user.id,
          to_user: conversation.user.id,
          data: { offer },
          status: 'pending',
          created_at: new Date().toISOString()
        })
      
      console.log('📞 Appel initié:', { callId, type })
    } catch (error) {
      console.error('Error starting call:', error)
      toast.error('Impossible de démarrer l\'appel')
      setShowCallView(false)
      setIsCalling(false)
    }
  }

  const acceptCall = async () => {
    if (!incomingCall) return
    
    setCallType(incomingCall.type)
    setShowCallView(true)
    setIncomingCall(null)
    
    try {
      await webrtcService.initLocalStream(incomingCall.type === 'audio', incomingCall.type === 'video')
      
      // Accepter l'offre
      await webrtcService.handleOffer(
        incomingCall.data.offer,
        incomingCall.call_id,
        incomingCall.from_user
      )
      
      // Mettre à jour le statut
      await supabase
        .from('calls')
        .update({ status: 'accepted' })
        .eq('call_id', incomingCall.call_id)
      
      console.log('📞 Appel accepté:', incomingCall.call_id)
    } catch (error) {
      console.error('Error accepting call:', error)
      toast.error('Impossible d\'accepter l\'appel')
      setShowCallView(false)
    }
  }

  const rejectCall = async () => {
    if (incomingCall) {
      await supabase
        .from('calls')
        .update({ status: 'rejected' })
        .eq('call_id', incomingCall.call_id)
      
      setIncomingCall(null)
      toast.info('Appel refusé')
    }
  }

  const endCall = () => {
    webrtcService.endCall()
    setShowCallView(false)
    setIsCalling(false)
    setIncomingCall(null)
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={onBack}>←</BackButton>
        <UserInfo>
          <Avatar
            src={conversation.user?.avatar_url}
            name={conversation.user?.username}
            size={40}
            status={conversation.user?.status}
          />
          <div>
            <div style={{ fontWeight: 600 }}>@{conversation.user?.username}</div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {conversation.user?.status === 'online' ? 'En ligne' : 'Hors ligne'}
            </div>
          </div>
        </UserInfo>
        <CallButtons>
          <button onClick={() => startCall('audio')} disabled={isCalling || showCallView}>
            📞
          </button>
          <button onClick={() => startCall('video')} disabled={isCalling || showCallView}>
            🎥
          </button>
        </CallButtons>
      </Header>
      
      <MessagesContainer>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              isOwn={msg.sender_id === user.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <MessageText>{msg.content}</MessageText>
              <MessageTime isOwn={msg.sender_id === user.id}>
                {formatTime(msg.created_at)}
              </MessageTime>
            </MessageBubble>
          ))
        )}
        <div ref={messagesEndRef} />
      </MessagesContainer>
      
      <InputContainer>
        <Input
          type="text"
          placeholder="Message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <SendButton
          onClick={sendMessage}
          whileTap={{ scale: 0.95 }}
          disabled={!newMessage.trim()}
        >
          ➤
        </SendButton>
      </InputContainer>
      
      {showCallView && (
        <CallView
          type={callType}
          user={conversation.user}
          isIncoming={!!incomingCall}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={(muted) => webrtcService.toggleAudio(!muted)}
          onToggleCamera={(off) => webrtcService.toggleVideo(!off)}
        />
      )}
      
      {incomingCall && !showCallView && (
        <CallView
          type={incomingCall.type}
          user={conversation.user}
          isIncoming={true}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={rejectCall}
        />
      )}
    </Container>
  )
}
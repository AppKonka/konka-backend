// src/modules/fan/pages/Messages.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { ChatRoom } from '../components/Messages/ChatRoom'
import { SparkStory } from '../components/Sparks/SparkStory'
import { SparkCreation } from '../components/Sparks/SparkCreation'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderSection = styled.div`
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const CreateButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`

const StoriesContainer = styled.div`
  padding: 16px;
  overflow-x: auto;
  display: flex;
  gap: 12px;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const StoryCircle = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`

const StoryAvatar = styled.div`
  width: 68px;
  height: 68px;
  border-radius: 34px;
  background: ${props => props.hasUnseen ? `linear-gradient(135deg, #FF6B35, #FF4D1E)` : props.theme.border};
  padding: 2px;
  
  .avatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    background: ${props => props.theme.background};
    display: flex;
    align-items: center;
    justify-content: center;
  }
`

const StoryName = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
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

const ConversationsList = styled.div`
  padding: 8px 0;
`

const ConversationItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.border}40;
  }
`

const ConversationInfo = styled.div`
  flex: 1;
`

const ConversationName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const LastMessage = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const Time = styled.span`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const UnreadBadge = styled.div`
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
`

const tabs = [
  { id: 'matches', label: 'Mes matches' },
  { id: 'artists', label: 'Mes artistes' },
  { id: 'sellers', label: 'Mes vendeurs' },
  { id: 'chill', label: 'Chill' },
]

const Messages = () => {
  const [activeTab, setActiveTab] = useState('matches')
  const [conversations, setConversations] = useState([])
  const [stories, setStories] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [showSparkCreation, setShowSparkCreation] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const { user, userProfile } = useAuth()

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      // Récupérer les matchs de l'utilisateur
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:users!matches_user1_id_fkey(id, username, avatar_url, role),
          user2:users!matches_user2_id_fkey(id, username, avatar_url, role)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'matched')
      
      if (matchesError) throw matchesError
      
      // Pour chaque match, récupérer le dernier message
      const conversationsWithMessages = await Promise.all(
        matches.map(async (match) => {
          const otherUser = match.user1_id === user.id ? match.user2 : match.user1
          
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          if (messagesError) throw messagesError
          
          const { data: unreadCount, error: unreadError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('match_id', match.id)
            .eq('is_read', false)
            .neq('sender_id', user.id)
          
          // Utiliser unreadError pour logger en cas d'erreur
          if (unreadError) {
            console.error('Error getting unread count:', unreadError)
          }
          
          return {
            match_id: match.id,
            user: otherUser,
            last_message: messages[0],
            unread_count: unreadCount?.length || 0,
          }
        })
      )
      
      // Filtrer selon l'onglet
      let filtered = conversationsWithMessages
      if (activeTab === 'artists') {
        filtered = filtered.filter(c => c.user.role === 'artist')
      } else if (activeTab === 'sellers') {
        filtered = filtered.filter(c => c.user.role === 'seller')
      } else if (activeTab === 'chill') {
        filtered = filtered.filter(c => c.user.role === 'fan')
      }
      
      setConversations(filtered)
      
      console.log('💬 Conversations chargées:', {
        total: filtered.length,
        activeTab,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Erreur lors du chargement des conversations')
    } finally {
      setLoading(false)
    }
  }, [user.id, activeTab])

  const loadStories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sparks')
        .select(`
          *,
          user:users(id, username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      setStories(data || [])
      
      console.log('✨ Stories chargées:', data?.length)
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }, [])

  const updateConversation = useCallback((newMessage) => {
    setConversations(prev => {
      const index = prev.findIndex(c => c.match_id === newMessage.match_id)
      if (index !== -1) {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          last_message: newMessage,
          unread_count: updated[index].unread_count + 1,
        }
        return updated
      }
      return prev
    })
  }, [])

  // useEffect corrigé - SANS conversations dans les dépendances
  useEffect(() => {
    loadConversations()
    loadStories()
    
    // Écouter les nouveaux messages en temps réel
    // Utiliser une variable pour stocker les IDs des conversations actuelles
    const conversationIds = conversations.map(c => c.match_id).join(',')
    
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=in.(${conversationIds})`,
      }, (payload) => {
        updateConversation(payload.new)
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [activeTab, loadConversations, loadStories, updateConversation]) // <- conversations retiré

  const formatTime = (date) => {
    const now = new Date()
    const messageDate = new Date(date)
    const diff = now - messageDate
    
    if (diff < 24 * 60 * 60 * 1000) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return messageDate.toLocaleDateString([], { weekday: 'short' })
    } else {
      return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' })
    }
  }

  if (selectedConversation) {
    return (
      <ChatRoom
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    )
  }

  return (
    <Container>
      <HeaderSection>
        <Title>Message</Title>
        <CreateButton
          onClick={() => setShowSparkCreation(true)}
          whileTap={{ scale: 0.95 }}
        >
          +
        </CreateButton>
      </HeaderSection>
      
      <StoriesContainer>
        <StoryCircle onClick={() => setShowSparkCreation(true)}>
          <StoryAvatar>
            <div className="avatar">
              <Avatar
                src={userProfile?.avatar_url}
                name={userProfile?.display_name}
                size={64}
              />
            </div>
          </StoryAvatar>
          <StoryName>Ton Spark</StoryName>
        </StoryCircle>
        
        {stories.map(story => (
          <StoryCircle key={story.id}>
            <StoryAvatar hasUnseen={!story.viewed}>
              <div className="avatar">
                <Avatar
                  src={story.user?.avatar_url}
                  name={story.user?.username}
                  size={64}
                />
              </div>
            </StoryAvatar>
            <StoryName>@{story.user?.username}</StoryName>
          </StoryCircle>
        ))}
      </StoriesContainer>
      
      <TabsContainer>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </TabsContainer>
      
      <ConversationsList>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <div>Aucune conversation pour l'instant</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {activeTab === 'matches' && "Match avec d'autres utilisateurs pour commencer à discuter"}
              {activeTab === 'artists' && "Suis des artistes pour recevoir leurs messages"}
              {activeTab === 'sellers' && "Suis des vendeurs pour recevoir leurs offres"}
              {activeTab === 'chill' && "Rejoins des sorties pour discuter avec les participants"}
            </div>
          </div>
        ) : (
          conversations.map(conv => (
            <ConversationItem
              key={conv.match_id}
              onClick={() => setSelectedConversation(conv)}
              whileTap={{ scale: 0.98 }}
            >
              <Avatar
                src={conv.user?.avatar_url}
                name={conv.user?.username}
                size={52}
                status={conv.user?.status}
              />
              <ConversationInfo>
                <ConversationName>@{conv.user?.username}</ConversationName>
                {conv.last_message && (
                  <LastMessage>
                    {conv.last_message.sender_id === user.id ? 'Moi: ' : ''}
                    {conv.last_message.content || (conv.last_message.media_type === 'image' ? '📷 Photo' : '🎵 Audio')}
                  </LastMessage>
                )}
              </ConversationInfo>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                {conv.last_message && (
                  <Time>{formatTime(conv.last_message.created_at)}</Time>
                )}
                {conv.unread_count > 0 && (
                  <UnreadBadge>{conv.unread_count}</UnreadBadge>
                )}
              </div>
            </ConversationItem>
          ))
        )}
      </ConversationsList>
      
      <BottomNavigation />
      
      {showSparkCreation && (
        <SparkCreation
          onClose={() => setShowSparkCreation(false)}
          onSuccess={() => {
            setShowSparkCreation(false)
            loadStories()
          }}
        />
      )}
    </Container>
  )
}

export default Messages
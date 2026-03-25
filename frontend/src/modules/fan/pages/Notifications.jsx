// src/modules/fan/pages/Notifications.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
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

const MarkAllButton = styled(motion.button)`
  background: none;
  border: none;
  color: ${props => props.theme.primary};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
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

const NotificationsList = styled.div`
  padding: 8px 0;
`

const NotificationItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${props => props.read ? props.theme.surface : `${props.theme.primary}10`};
  border-bottom: 1px solid ${props => props.theme.border};
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.border}40;
  }
`

const NotificationIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: ${props => props.theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`

const NotificationContent = styled.div`
  flex: 1;
`

const NotificationTitle = styled.h4`
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const NotificationMessage = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 4px;
`

const NotificationTime = styled.span`
  font-size: 11px;
  color: ${props => props.theme.textSecondary};
`

const UnreadDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: ${props => props.theme.primary};
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
`

const tabs = [
  { id: 'all', label: 'Toutes' },
  { id: 'unread', label: 'Non lues' },
]

const getNotificationIcon = (type) => {
  const icons = {
    new_match: '💘',
    new_message: '💬',
    new_follower: '👥',
    new_like: '❤️',
    new_comment: '💭',
    dedication_request: '🎬',
    dedication_completed: '✅',
    live_started: '🔴',
    order_update: '📦',
    chill_join_request: '🌴',
    chill_approved: '✅',
    product_back_in_stock: '🔄',
    price_drop: '💰',
    artist_new_track: '🎵',
    artist_new_live: '📺',
    promotion: '🎁',
    system: '⚙️',
  }
  return icons[type] || '🔔'
}

const Notifications = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
    
    // Écouter les nouvelles notifications en temps réel
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .subscribe()
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      
      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
      
      if (error) throw error
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      )
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
    
    // Rediriger selon le type
    const data = notification.data
    switch (notification.type) {
      case 'new_match':
        navigate('/fan/messages')
        break
      case 'new_message':
        navigate(`/fan/messages?match=${data?.match_id}`)
        break
      case 'new_follower':
        navigate(`/fan/profile/${data?.follower_id}`)
        break
      case 'new_like':
      case 'new_comment':
        navigate(`/fan/post/${data?.post_id}`)
        break
      case 'dedication_completed':
        navigate('/fan/dedication')
        break
      case 'live_started':
        navigate('/fan/live')
        break
      case 'order_update':
        navigate('/fan/shopping/orders')
        break
      case 'chill_approved':
        navigate('/fan/chill')
        break
      default:
        break
    }
  }

  const formatTime = (date) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diff = now - notificationDate
    
    if (diff < 60 * 1000) return 'à l\'instant'
    if (diff < 60 * 60 * 1000) return `il y a ${Math.floor(diff / 60000)} min`
    if (diff < 24 * 60 * 60 * 1000) return `il y a ${Math.floor(diff / 3600000)} h`
    if (diff < 7 * 24 * 60 * 60 * 1000) return notificationDate.toLocaleDateString('fr-FR', { weekday: 'short' })
    return notificationDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Container>
      <Header title="Notifications" showBack />
      
      <HeaderSection>
        <Title>Notifications</Title>
        {unreadCount > 0 && (
          <MarkAllButton onClick={markAllAsRead} whileTap={{ scale: 0.95 }}>
            Tout marquer comme lu
          </MarkAllButton>
        )}
      </HeaderSection>
      
      <TabsContainer>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'unread' && unreadCount > 0 && (
              <span style={{ marginLeft: 4, color: '#FF6B35' }}>({unreadCount})</span>
            )}
          </Tab>
        ))}
      </TabsContainer>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState>
          <div className="icon">🔔</div>
          <div>Aucune notification</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>
            Les notifications apparaîtront ici
          </div>
        </EmptyState>
      ) : (
        <NotificationsList>
          <AnimatePresence>
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                read={notification.is_read}
                onClick={() => handleNotificationClick(notification)}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <NotificationIcon>
                  {getNotificationIcon(notification.type)}
                </NotificationIcon>
                <NotificationContent>
                  <NotificationTitle>{notification.title}</NotificationTitle>
                  <NotificationMessage>{notification.content}</NotificationMessage>
                  <NotificationTime>{formatTime(notification.created_at)}</NotificationTime>
                </NotificationContent>
                {!notification.is_read && <UnreadDot />}
              </NotificationItem>
            ))}
          </AnimatePresence>
        </NotificationsList>
      )}
      
      <BottomNavigation />
    </Container>
  )
}

export default Notifications
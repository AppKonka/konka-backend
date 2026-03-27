// src/modules/shared/pages/BlockUser.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 40px;
`

const Content = styled.div`
  padding: 20px;
`

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 24px;
`

const BlockedList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const BlockedItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
`

const UserInfo = styled.div`
  flex: 1;
`

const UserName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const UserUsername = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const UnblockButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${props => props.theme.error}20;
  color: ${props => props.theme.error};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const BlockUser = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [blockedUsers, setBlockedUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const loadBlockedUsers = useCallback(async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select(`
          *,
          blocked:users!blocks_blocked_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setBlockedUsers(data || [])
      
      console.log('🔒 Utilisateurs bloqués chargés:', data?.length)
    } catch (error) {
      console.error('Error loading blocked users:', error)
      toast.error('Erreur lors du chargement des utilisateurs bloqués')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadBlockedUsers()
  }, [loadBlockedUsers])

  const handleUnblock = async (blockedUserId, blockedUsername) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)
      
      if (error) throw error
      
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedUserId))
      toast.success(`@${blockedUsername} a été débloqué`)
      console.log('🔓 Utilisateur débloqué:', { blockedUserId, blockedUsername })
    } catch (error) {
      console.error('Error unblocking user:', error)
      toast.error('Erreur lors du déblocage')
    }
  }

  const getBackPath = () => {
    return '/fan/settings'
  }

  if (loading) {
    return (
      <Container>
        <Header title="Utilisateurs bloqués" showBack onBack={() => navigate(getBackPath())} />
        <LoadingSpinner>
          <div>Chargement de la liste...</div>
        </LoadingSpinner>
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Utilisateurs bloqués" showBack onBack={() => navigate(getBackPath())} />
      
      <Content>
        <Title>Utilisateurs bloqués</Title>
        <Subtitle>
          Les utilisateurs bloqués ne peuvent pas vous contacter, voir votre profil ou interagir avec vous.
        </Subtitle>
        
        {blockedUsers.length === 0 ? (
          <EmptyState>
            <div className="icon">🔒</div>
            <div>Aucun utilisateur bloqué</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Les utilisateurs que vous bloquerez apparaîtront ici
            </div>
          </EmptyState>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 14, color: '#888' }}>
              {blockedUsers.length} utilisateur{blockedUsers.length > 1 ? 's' : ''} bloqué{blockedUsers.length > 1 ? 's' : ''}
            </div>
            <BlockedList>
              {blockedUsers.map(block => (
                <BlockedItem
                  key={block.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Avatar
                    src={block.blocked?.avatar_url}
                    name={block.blocked?.display_name}
                    size={48}
                  />
                  <UserInfo>
                    <UserName>{block.blocked?.display_name || block.blocked?.username}</UserName>
                    <UserUsername>@{block.blocked?.username}</UserUsername>
                  </UserInfo>
                  <UnblockButton
                    onClick={() => handleUnblock(block.blocked_id, block.blocked?.username)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Débloquer
                  </UnblockButton>
                </BlockedItem>
              ))}
            </BlockedList>
          </>
        )}
      </Content>
    </Container>
  )
}

export default BlockUser
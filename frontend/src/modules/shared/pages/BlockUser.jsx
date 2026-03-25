// src/modules/shared/pages/BlockUser.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../config/supabase'
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

const BlockUser = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [blockedUsers, setBlockedUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlockedUsers()
  }, [])

  const loadBlockedUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('blocks')
        .select(`
          *,
          blocked:users!blocks_blocked_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('blocker_id', user.id)
      
      if (error) throw error
      setBlockedUsers(data || [])
    } catch (error) {
      console.error('Error loading blocked users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (blockedUserId) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId)
      
      if (error) throw error
      
      setBlockedUsers(prev => prev.filter(b => b.blocked_id !== blockedUserId))
      toast.success('Utilisateur débloqué')
    } catch (error) {
      console.error('Error unblocking user:', error)
      toast.error('Erreur lors du déblocage')
    }
  }

  const getBackPath = () => {
    return '/fan/settings'
  }

  return (
    <Container>
      <Header title="Utilisateurs bloqués" showBack onBack={() => navigate(getBackPath())} />
      
      <Content>
        <Title>Utilisateurs bloqués</Title>
        <Subtitle>
          Les utilisateurs bloqués ne peuvent pas vous contacter, voir votre profil ou interagir avec vous.
        </Subtitle>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : blockedUsers.length === 0 ? (
          <EmptyState>
            <div className="icon">🔒</div>
            <div>Aucun utilisateur bloqué</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Les utilisateurs que vous bloquerez apparaîtront ici
            </div>
          </EmptyState>
        ) : (
          <BlockedList>
            {blockedUsers.map(block => (
              <BlockedItem key={block.id}>
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
                  onClick={() => handleUnblock(block.blocked_id)}
                  whileTap={{ scale: 0.95 }}
                >
                  Débloquer
                </UnblockButton>
              </BlockedItem>
            ))}
          </BlockedList>
        )}
      </Content>
    </Container>
  )
}

export default BlockUser
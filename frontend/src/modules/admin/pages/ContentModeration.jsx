// src/modules/admin/pages/ContentModeration.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, XCircle, Eye, Clock, AlertTriangle,
  Flag, Image as ImageIcon, Video, Music, MessageSquare
} from 'lucide-react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`

const Header = styled.div`
  margin-bottom: 24px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid ${props => props.theme.border};
  padding-bottom: 12px;
`

const Tab = styled(motion.button)`
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  background: ${props => props.active ? props.theme.primary : 'transparent'};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
`

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`

const ContentCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
`

const ContentPreview = styled.div`
  height: 200px;
  background: ${props => props.theme.border};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ContentInfo = styled.div`
  padding: 16px;
`

const ContentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`

const ContentType = styled.span`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: ${props => props.theme.border};
  display: flex;
  align-items: center;
  gap: 4px;
`

const ContentUser = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const UserAvatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 16px;
`

const UserName = styled.span`
  font-size: 14px;
  font-weight: 500;
`

const ContentText = styled.p`
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const ReportCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #FFB444;
  margin-bottom: 12px;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`

const ApproveButton = styled(motion.button)`
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #00C85120;
  color: #00C851;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
`

const RejectButton = styled(motion.button)`
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: none;
  background: #FF444420;
  color: #FF4444;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  justify-content: space-around;
`

const StatItem = styled.div`
  text-align: center;
`

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const ContentModeration = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })

  const loadContents = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reported_content')
        .select('*, user:users(id, username, avatar_url), reports(count)')
      
      if (activeTab === 'pending') {
        query = query.eq('status', 'pending')
      } else if (activeTab === 'approved') {
        query = query.eq('status', 'approved')
      } else if (activeTab === 'rejected') {
        query = query.eq('status', 'rejected')
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      setContents(data || [])
      
      // Calculer les statistiques globales
      const { data: allContents } = await supabase
        .from('reported_content')
        .select('status')
      
      const pending = allContents?.filter(c => c.status === 'pending').length || 0
      const approved = allContents?.filter(c => c.status === 'approved').length || 0
      const rejected = allContents?.filter(c => c.status === 'rejected').length || 0
      
      setStats({
        pending,
        approved,
        rejected,
        total: allContents?.length || 0
      })
      
      console.log('📋 Contenus chargés:', {
        activeTab,
        count: data?.length,
        pending,
        approved,
        rejected
      })
    } catch (error) {
      console.error('Error loading contents:', error)
      toast.error('Erreur lors du chargement des contenus')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    loadContents()
  }, [loadContents])

  const handleModerate = async (contentId, action) => {
    try {
      const { data, error } = await supabase
        .from('reported_content')
        .update({ 
          status: action,
          moderated_at: new Date().toISOString(),
          moderated_by: 'admin'
        })
        .eq('id', contentId)
        .select()
      
      if (error) throw error
      
      toast.success(`Contenu ${action === 'approved' ? 'approuvé' : 'rejeté'} avec succès`)
      console.log('🔨 Contenu modéré:', {
        contentId,
        action,
        moderatedAt: new Date().toISOString(),
        data
      })
      
      loadContents()
    } catch (error) {
      console.error('Error moderating content:', error)
      toast.error('Erreur lors de la modération')
    }
  }

  const getContentIcon = (type) => {
    switch (type) {
      case 'image': return <ImageIcon size={14} />
      case 'video': return <Video size={14} />
      case 'audio': return <Music size={14} />
      case 'comment': return <MessageSquare size={14} />
      default: return <Flag size={14} />
    }
  }

  const getContentTypeLabel = (type) => {
    switch (type) {
      case 'image': return 'Image'
      case 'video': return 'Vidéo'
      case 'audio': return 'Audio'
      case 'comment': return 'Commentaire'
      default: return 'Publication'
    }
  }

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Modération de contenu</Title>
        <Subtitle>Examinez et modérez le contenu signalé par les utilisateurs</Subtitle>
      </Header>
      
      <StatsBar>
        <StatItem>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>En attente</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.approved}</StatValue>
          <StatLabel>Approuvés</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>Rejetés</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total</StatLabel>
        </StatItem>
      </StatsBar>
      
      <Tabs>
        <Tab
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          whileTap={{ scale: 0.95 }}
        >
          En attente ({stats.pending})
        </Tab>
        <Tab
          active={activeTab === 'approved'}
          onClick={() => setActiveTab('approved')}
          whileTap={{ scale: 0.95 }}
        >
          Approuvés ({stats.approved})
        </Tab>
        <Tab
          active={activeTab === 'rejected'}
          onClick={() => setActiveTab('rejected')}
          whileTap={{ scale: 0.95 }}
        >
          Rejetés ({stats.rejected})
        </Tab>
      </Tabs>
      
      {contents.length === 0 ? (
        <EmptyState>
          <div className="icon">✅</div>
          <div>Aucun contenu à modérer</div>
          {activeTab === 'pending' && (
            <div style={{ fontSize: 13, marginTop: 8 }}>
              Tous les contenus signalés ont été traités
            </div>
          )}
        </EmptyState>
      ) : (
        <ContentGrid>
          {contents.map(content => (
            <ContentCard
              key={content.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ContentPreview>
                {content.type === 'image' && content.url && (
                  <img src={content.url} alt="Content" />
                )}
                {content.type === 'video' && content.url && (
                  <video src={content.url} controls style={{ width: '100%', height: '100%' }} />
                )}
                {content.type === 'audio' && (
                  <div style={{ textAlign: 'center' }}>
                    <Music size={48} />
                    <div>Fichier audio</div>
                  </div>
                )}
                {!content.url && (
                  <div style={{ textAlign: 'center' }}>
                    <Flag size={48} />
                    <div>{getContentTypeLabel(content.type)}</div>
                  </div>
                )}
              </ContentPreview>
              
              <ContentInfo>
                <ContentHeader>
                  <ContentType>
                    {getContentIcon(content.type)} {getContentTypeLabel(content.type)}
                  </ContentType>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    <Clock size={12} /> {new Date(content.created_at).toLocaleDateString()}
                  </span>
                </ContentHeader>
                
                <ContentUser>
                  <UserAvatar src={content.user?.avatar_url || '/images/default-avatar.png'} />
                  <UserName>@{content.user?.username}</UserName>
                </ContentUser>
                
                {content.text && (
                  <ContentText>{content.text}</ContentText>
                )}
                
                <ReportCount>
                  <Flag size={12} /> {content.reports?.[0]?.count || 0} signalement(s)
                </ReportCount>
                
                {activeTab === 'pending' && (
                  <ActionButtons>
                    <ApproveButton onClick={() => handleModerate(content.id, 'approved')} whileTap={{ scale: 0.95 }}>
                      <CheckCircle size={16} /> Approuver
                    </ApproveButton>
                    <RejectButton onClick={() => handleModerate(content.id, 'rejected')} whileTap={{ scale: 0.95 }}>
                      <XCircle size={16} /> Rejeter
                    </RejectButton>
                  </ActionButtons>
                )}
                
                {activeTab !== 'pending' && (
                  <div style={{ fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 }}>
                    <Eye size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Modéré le {new Date(content.moderated_at).toLocaleDateString()}
                  </div>
                )}
              </ContentInfo>
            </ContentCard>
          ))}
        </ContentGrid>
      )}
    </Container>
  )
}

export default ContentModeration
// src/modules/artist/pages/DedicationRequests.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
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
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
`

const Subtitle = styled.p`
  font-size: 14px;
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

const RequestsList = styled.div`
  padding: 16px;
`

const RequestCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const RequestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const FanInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const FanName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.text};
`

const RequestStatus = styled.span`
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
  background: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB44420';
      case 'accepted': return '#00C85120';
      case 'completed': return '#00C85120';
      case 'rejected': return '#FF444420';
      default: return '#88888820';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'pending': return '#FFB444';
      case 'accepted': return '#00C851';
      case 'completed': return '#00C851';
      case 'rejected': return '#FF4444';
      default: return '#888888';
    }
  }};
`

const RequestMessage = styled.p`
  font-size: 14px;
  color: ${props => props.theme.text};
  margin-bottom: 12px;
  line-height: 1.4;
`

const RequestDetails = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const RequestActions = styled.div`
  display: flex;
  gap: 12px;
`

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: 10px;
  border-radius: 24px;
  border: none;
  background: ${props => props.primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.primary ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadow.sm};
`

const Modal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
`

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
`

const ModalBody = styled.div`
  padding: 20px;
`

const VideoPreview = styled.div`
  background: ${props => props.theme.border};
  border-radius: 12px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  
  video {
    width: 100%;
    border-radius: 12px;
  }
`

const FileInput = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  margin-bottom: 16px;
`

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
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

const DedicationRequests = () => {
  const [activeTab, setActiveTab] = useState('pending')
  const [requests, setRequests] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [videoFile, setVideoFile] = useState(null)
  const [videoPreview, setVideoPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const { user } = useAuth()

  const loadRequests = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('dedications')
        .select(`
          *,
          fan:users!dedications_fan_id_fkey(id, username, avatar_url)
        `)
        .eq('artist_id', user.id)
      
      if (activeTab === 'pending') {
        query = query.eq('status', 'pending')
      } else if (activeTab === 'accepted') {
        query = query.eq('status', 'accepted')
      } else if (activeTab === 'completed') {
        query = query.eq('status', 'completed')
      }
      
      const { data, error } = await query.order('requested_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
      
      console.log('📋 Demandes chargées:', {
        activeTab,
        count: data?.length,
        pending: data?.filter(r => r.status === 'pending').length,
        accepted: data?.filter(r => r.status === 'accepted').length,
        completed: data?.filter(r => r.status === 'completed').length
      })
    } catch (error) {
      console.error('Error loading requests:', error)
      toast.error('Erreur lors du chargement des demandes')
    } finally {
      setLoading(false)
    }
  }, [activeTab, user.id])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const handleAccept = async (request) => {
    try {
      const { error } = await supabase
        .from('dedications')
        .update({ status: 'accepted' })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.success(`Dédicace acceptée pour @${request.fan?.username}`)
      console.log('✅ Dédicace acceptée:', request.id)
      loadRequests()
    } catch (error) {
      console.error('Error accepting request:', error)
      toast.error('Erreur lors de l\'acceptation')
    }
  }

  const handleReject = async (request) => {
    try {
      const { error } = await supabase
        .from('dedications')
        .update({ status: 'rejected' })
        .eq('id', request.id)
      
      if (error) throw error
      
      toast.info(`Dédicace refusée pour @${request.fan?.username}`)
      console.log('❌ Dédicace refusée:', request.id)
      loadRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast.error('Erreur lors du refus')
    }
  }

  const handleDeliver = (request) => {
    setSelectedRequest(request)
    setShowDeliveryModal(true)
    console.log('📦 Préparation de la livraison pour:', request.id)
  }

  const uploadVideo = async (file) => {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `dedications/${user.id}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file)
    
    if (error) throw error
    
    // Enregistrer les informations du fichier uploadé dans les logs
    console.log('✅ Vidéo uploadée avec succès:', {
      fileName: data.path,
      fileId: data.id,
      bucketId: data.bucket_id,
      uploadTime: new Date().toISOString()
    })
    
    // Optionnel: Sauvegarder l'ID du fichier dans la base de données pour traçabilité
    await supabase
      .from('dedications')
      .update({ 
        storage_file_id: data.id,
        storage_file_path: data.path,
        storage_file_metadata: {
          name: file.name,
          size: file.size,
          type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .eq('id', selectedRequest.id)
    
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handleSubmitDelivery = async () => {
    if (!videoFile) return
    
    setUploading(true)
    try {
      const videoUrl = await uploadVideo(videoFile)
      
      const { error } = await supabase
        .from('dedications')
        .update({
          status: 'completed',
          video_url: videoUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id)
      
      if (error) throw error
      
      // Créer une notification pour le fan
      const { data: notificationData, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: selectedRequest.fan_id,
          type: 'dedication_completed',
          title: 'Votre dédicace est prête !',
          content: `Votre dédicace de @${user?.username} est disponible`,
          data: { 
            dedication_id: selectedRequest.id,
            video_url: videoUrl,
            delivered_at: new Date().toISOString()
          },
        })
        .select()
      
      if (notifError) throw notifError
      
      console.log('✅ Notification envoyée:', notificationData)
      toast.success('Dédicace livrée avec succès !')
      
      setShowDeliveryModal(false)
      setVideoFile(null)
      setVideoPreview(null)
      loadRequests()
    } catch (error) {
      console.error('Error delivering dedication:', error)
      toast.error('Erreur lors de la livraison')
    } finally {
      setUploading(false)
    }
  }

  const handleVideoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setVideoFile(file)
      const url = URL.createObjectURL(file)
      setVideoPreview(url)
      
      // Log de la sélection du fichier
      console.log('📹 Fichier vidéo sélectionné:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString()
      })
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'accepted': return 'Acceptée'
      case 'completed': return 'Livrée'
      case 'rejected': return 'Refusée'
      default: return 'Inconnu'
    }
  }

  // Calculer les statistiques
  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    total: requests.length,
    totalRevenue: requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.price || 0), 0)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Dédicaces" showProfile showBack />
        <LoadingSpinner>
          <div>Chargement des demandes...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Dédicaces" showProfile showBack />
      
      <HeaderSection>
        <Title>Demandes de dédicace</Title>
        <Subtitle>Réponds aux demandes de tes fans</Subtitle>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ background: '#FFB44420', padding: '8px 12px', borderRadius: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FFB444' }}>{stats.pending}</div>
            <div style={{ fontSize: 12 }}>En attente</div>
          </div>
          <div style={{ background: '#00C85120', padding: '8px 12px', borderRadius: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#00C851' }}>{stats.accepted}</div>
            <div style={{ fontSize: 12 }}>Acceptées</div>
          </div>
          <div style={{ background: '#33B5E520', padding: '8px 12px', borderRadius: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#33B5E5' }}>{stats.completed}</div>
            <div style={{ fontSize: 12 }}>Livrées</div>
          </div>
          <div style={{ background: '#FF444420', padding: '8px 12px', borderRadius: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 'bold', color: '#FF4444' }}>{stats.rejected}</div>
            <div style={{ fontSize: 12 }}>Refusées</div>
          </div>
        </div>
        {stats.totalRevenue > 0 && (
          <div style={{ marginTop: 12, fontSize: 14, color: '#00C851' }}>
            💰 Revenus totaux : {stats.totalRevenue}€
          </div>
        )}
      </HeaderSection>
      
      <TabsContainer>
        <Tab
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
        >
          En attente ({stats.pending})
        </Tab>
        <Tab
          active={activeTab === 'accepted'}
          onClick={() => setActiveTab('accepted')}
        >
          Acceptées ({stats.accepted})
        </Tab>
        <Tab
          active={activeTab === 'completed'}
          onClick={() => setActiveTab('completed')}
        >
          Livrées ({stats.completed})
        </Tab>
      </TabsContainer>
      
      <RequestsList>
        {requests.length === 0 ? (
          <EmptyState>
            <div className="icon">🎬</div>
            <div>Aucune demande de dédicace</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>
              {activeTab === 'pending' && "Les demandes apparaîtront ici"}
              {activeTab === 'accepted' && "Aucune demande acceptée pour le moment"}
              {activeTab === 'completed' && "Aucune dédicace livrée pour le moment"}
            </div>
          </EmptyState>
        ) : (
          requests.map(request => (
            <RequestCard key={request.id}>
              <RequestHeader>
                <FanInfo>
                  <Avatar
                    src={request.fan?.avatar_url}
                    name={request.fan?.username}
                    size={40}
                  />
                  <FanName>@{request.fan?.username}</FanName>
                </FanInfo>
                <RequestStatus status={request.status}>
                  {getStatusText(request.status)}
                </RequestStatus>
              </RequestHeader>
              
              <RequestMessage>"{request.message}"</RequestMessage>
              
              <RequestDetails>
                <span>🎬 {request.type === 'video' ? 'Vidéo' : request.type === 'birthday' ? 'Anniversaire' : 'Message'}</span>
                <span>💰 {request.price}€</span>
                <span>📅 {formatDate(request.requested_at)}</span>
              </RequestDetails>
              
              {request.status === 'pending' && (
                <RequestActions>
                  <ActionButton
                    primary
                    onClick={() => handleAccept(request)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Accepter
                  </ActionButton>
                  <ActionButton
                    onClick={() => handleReject(request)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Refuser
                  </ActionButton>
                </RequestActions>
              )}
              
              {request.status === 'accepted' && (
                <RequestActions>
                  <ActionButton
                    primary
                    onClick={() => handleDeliver(request)}
                    whileTap={{ scale: 0.95 }}
                  >
                    Livrer la dédicace
                  </ActionButton>
                </RequestActions>
              )}
              
              {request.status === 'completed' && request.video_url && (
                <RequestActions>
                  <ActionButton
                    onClick={() => window.open(request.video_url, '_blank')}
                    whileTap={{ scale: 0.95 }}
                  >
                    Voir la vidéo
                  </ActionButton>
                  <ActionButton
                    onClick={() => window.open(`/fan/profile/${request.fan_id}`, '_blank')}
                    whileTap={{ scale: 0.95 }}
                  >
                    Voir le profil
                  </ActionButton>
                </RequestActions>
              )}
            </RequestCard>
          ))
        )}
      </RequestsList>
      
      <MusicPlayer />
      <BottomNavigation />
      
      {showDeliveryModal && selectedRequest && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowDeliveryModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>Livrer la dédicace</ModalTitle>
              <button onClick={() => setShowDeliveryModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <p style={{ marginBottom: 16, fontSize: 14 }}>
                Pour @{selectedRequest.fan?.username}
              </p>
              <p style={{ marginBottom: 16, fontStyle: 'italic', color: '#888' }}>
                "{selectedRequest.message}"
              </p>
              
              {videoPreview ? (
                <VideoPreview>
                  <video src={videoPreview} controls style={{ maxWidth: '100%' }} />
                </VideoPreview>
              ) : (
                <VideoPreview>
                  <span style={{ color: '#888' }}>Aucune vidéo sélectionnée</span>
                </VideoPreview>
              )}
              
              <FileInput
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
              />
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowDeliveryModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleSubmitDelivery}
                disabled={!videoFile || uploading}
              >
                {uploading ? 'Envoi...' : 'Livrer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default DedicationRequests
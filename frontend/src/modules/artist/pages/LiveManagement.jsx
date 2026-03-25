// src/modules/artist/pages/LiveManagement.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
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

const CreateButton = styled(motion.button)`
  padding: 10px 20px;
  border-radius: 28px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
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

const LiveList = styled.div`
  padding: 16px;
`

const LiveCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
`

const LiveThumbnail = styled.div`
  height: 180px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .live-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    background: #FF4444;
    color: white;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .viewers {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: rgba(0,0,0,0.7);
    color: white;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;
  }
`

const LiveInfo = styled.div`
  padding: 16px;
`

const LiveTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const LiveDetails = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const LiveActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
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

const FormGroup = styled.div`
  margin-bottom: 16px;
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  min-height: 80px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
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
`

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
`

const LiveStreamView = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
`

const StreamHeader = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
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

const StreamInteractions = styled.div`
  position: absolute;
  right: 16px;
  bottom: 100px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10;
`

const StreamComments = styled.div`
  position: absolute;
  bottom: 80px;
  left: 16px;
  right: 100px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
`

const CommentBubble = styled.div`
  background: rgba(0,0,0,0.5);
  border-radius: 20px;
  padding: 8px 12px;
  margin-bottom: 8px;
  color: white;
  font-size: 13px;
  
  strong {
    color: #FF6B35;
  }
`

const StreamInput = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
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

const LiveManagement = () => {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [upcomingLives, setUpcomingLives] = useState([])
  const [activeLive, setActiveLive] = useState(null)
  const [replays, setReplays] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [viewers, setViewers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_date: '',
    scheduled_time: '',
    type: 'free',
    price: '',
    visibility: 'public',
    thumbnail: null,
  })
  
  const { user } = useAuth()

  useEffect(() => {
    loadLives()
  }, [])

  const loadLives = async () => {
    setLoading(true)
    try {
      // Lives à venir
      const { data: upcomingData } = await supabase
        .from('lives')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
      
      setUpcomingLives(upcomingData || [])
      
      // Replays
      const { data: replayData } = await supabase
        .from('lives')
        .select('*')
        .eq('host_id', user.id)
        .eq('status', 'ended')
        .order('ended_at', { ascending: false })
      
      setReplays(replayData || [])
    } catch (error) {
      console.error('Error loading lives:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateLive = async () => {
    try {
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`)
      
      let thumbnailUrl = null
      if (formData.thumbnail) {
        const fileName = `${Date.now()}_${formData.thumbnail.name}`
        const filePath = `lives/${user.id}/${fileName}`
        
        const { data } = await supabase.storage
          .from('media')
          .upload(filePath, formData.thumbnail)
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)
        
        thumbnailUrl = publicUrl
      }
      
      const { error } = await supabase
        .from('lives')
        .insert({
          host_id: user.id,
          title: formData.title,
          description: formData.description,
          scheduled_at: scheduledAt.toISOString(),
          type: formData.type,
          price: formData.type === 'paid' ? parseFloat(formData.price) : 0,
          visibility: formData.visibility,
          thumbnail_url: thumbnailUrl,
          status: 'scheduled',
        })
      
      if (error) throw error
      
      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        scheduled_date: '',
        scheduled_time: '',
        type: 'free',
        price: '',
        visibility: 'public',
        thumbnail: null,
      })
      loadLives()
    } catch (error) {
      console.error('Error creating live:', error)
    }
  }

  const handleStartLive = async (live) => {
    try {
      // Mettre à jour le statut du live
      const { error } = await supabase
        .from('lives')
        .update({
          status: 'live',
          started_at: new Date().toISOString(),
          stream_key: `live_${Date.now()}`,
        })
        .eq('id', live.id)
      
      if (error) throw error
      
      setActiveLive({ ...live, status: 'live' })
      setIsStreaming(true)
      
      // Écouter les commentaires
      const subscription = supabase
        .channel(`live:${live.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_comments',
          filter: `live_id=eq.${live.id}`,
        }, (payload) => {
          setComments(prev => [...prev, payload.new])
        })
        .subscribe()
      
      return () => subscription.unsubscribe()
    } catch (error) {
      console.error('Error starting live:', error)
    }
  }

  const handleEndLive = async () => {
    try {
      const { error } = await supabase
        .from('lives')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', activeLive.id)
      
      if (error) throw error
      
      setIsStreaming(false)
      setActiveLive(null)
      loadLives()
    } catch (error) {
      console.error('Error ending live:', error)
    }
  }

  const handleSendComment = async () => {
    if (!commentText.trim()) return
    
    try {
      const { error } = await supabase
        .from('live_comments')
        .insert({
          live_id: activeLive.id,
          user_id: user.id,
          content: commentText,
        })
      
      if (error) throw error
      setCommentText('')
    } catch (error) {
      console.error('Error sending comment:', error)
    }
  }

  const handleCancelLive = async (liveId) => {
    try {
      const { error } = await supabase
        .from('lives')
        .delete()
        .eq('id', liveId)
      
      if (error) throw error
      loadLives()
    } catch (error) {
      console.error('Error canceling live:', error)
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

  return (
    <Container>
      <Header title="Mes Lives" showProfile showBack />
      
      <HeaderSection>
        <Title>Mes Lives</Title>
        <CreateButton onClick={() => setShowModal(true)} whileTap={{ scale: 0.95 }}>
          + Programmer
        </CreateButton>
      </HeaderSection>
      
      <TabsContainer>
        <Tab
          active={activeTab === 'upcoming'}
          onClick={() => setActiveTab('upcoming')}
        >
          À venir ({upcomingLives.length})
        </Tab>
        <Tab
          active={activeTab === 'replays'}
          onClick={() => setActiveTab('replays')}
        >
          Replays ({replays.length})
        </Tab>
      </TabsContainer>
      
      <LiveList>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        ) : activeTab === 'upcoming' ? (
          upcomingLives.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Aucun live programmé
            </div>
          ) : (
            upcomingLives.map(live => (
              <LiveCard key={live.id}>
                <LiveThumbnail>
                  <img src={live.thumbnail_url || '/images/default-live.jpg'} alt={live.title} />
                  <div className="live-badge">
                    <span>📅</span> Programmé
                  </div>
                </LiveThumbnail>
                <LiveInfo>
                  <LiveTitle>{live.title}</LiveTitle>
                  <LiveDetails>
                    <span>📅 {formatDate(live.scheduled_at)}</span>
                    {live.price > 0 && <span>💰 {live.price}€</span>}
                  </LiveDetails>
                  {live.description && (
                    <p style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>
                      {live.description}
                    </p>
                  )}
                  <LiveActions>
                    <ActionButton
                      primary
                      onClick={() => handleStartLive(live)}
                      whileTap={{ scale: 0.95 }}
                    >
                      Démarrer
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleCancelLive(live.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      Annuler
                    </ActionButton>
                  </LiveActions>
                </LiveInfo>
              </LiveCard>
            ))
          )
        ) : (
          replays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              Aucun replay disponible
            </div>
          ) : (
            replays.map(replay => (
              <LiveCard key={replay.id}>
                <LiveThumbnail>
                  <img src={replay.thumbnail_url || '/images/default-live.jpg'} alt={replay.title} />
                  <div className="viewers">
                    👁️ {replay.viewer_count || 0} vues
                  </div>
                </LiveThumbnail>
                <LiveInfo>
                  <LiveTitle>{replay.title}</LiveTitle>
                  <LiveDetails>
                    <span>📅 {formatDate(replay.started_at)}</span>
                    <span>⏱️ {Math.floor((new Date(replay.ended_at) - new Date(replay.started_at)) / 60000)} min</span>
                  </LiveDetails>
                  <LiveActions>
                    <ActionButton
                      primary
                      whileTap={{ scale: 0.95 }}
                    >
                      Voir replay
                    </ActionButton>
                    <ActionButton
                      whileTap={{ scale: 0.95 }}
                    >
                      Statistiques
                    </ActionButton>
                  </LiveActions>
                </LiveInfo>
              </LiveCard>
            ))
          )
        )}
      </LiveList>
      
      <MusicPlayer />
      <BottomNavigation />
      
      {showModal && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>Programmer un live</ModalTitle>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <Label>Titre du live *</Label>
                <Input
                  placeholder="Titre..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  placeholder="Décris ton live..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Date et heure *</Label>
                <Input
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                />
                <Input
                  type="time"
                  style={{ marginTop: 8 }}
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="free">Gratuit</option>
                  <option value="paid">Payant</option>
                </Select>
              </FormGroup>
              
              {formData.type === 'paid' && (
                <FormGroup>
                  <Label>Prix (€)</Label>
                  <Input
                    type="number"
                    placeholder="Prix..."
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </FormGroup>
              )}
              
              <FormGroup>
                <Label>Visibilité</Label>
                <Select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                >
                  <option value="public">Public</option>
                  <option value="subscribers">Réservé aux abonnés</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Image de couverture</Label>
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.files[0] })}
                />
              </FormGroup>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleCreateLive}
                disabled={!formData.title || !formData.scheduled_date || !formData.scheduled_time}
              >
                Programmer
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      
      {isStreaming && activeLive && (
        <LiveStreamView
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <StreamHeader>
            <div>
              <div style={{ fontWeight: 'bold', color: 'white' }}>{activeLive.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                @{user?.username}
              </div>
            </div>
            <StreamStats>
              <span>👁️ {viewers}</span>
              <span>❤️ 0</span>
              <button
                onClick={handleEndLive}
                style={{
                  background: '#FF4444',
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                }}
              >
                Finir
              </button>
            </StreamStats>
          </StreamHeader>
          
          <ReactPlayer
            url={activeLive.stream_url || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'}
            playing={true}
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            config={{
              file: {
                attributes: {
                  playsInline: true,
                },
              },
            }}
          />
          
          <StreamInteractions>
            <button style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 30, width: 48, height: 48, fontSize: 24 }}>
              ❤️
            </button>
            <button style={{ background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 30, width: 48, height: 48, fontSize: 24 }}>
              🎁
            </button>
          </StreamInteractions>
          
          <StreamComments>
            {comments.slice(-10).map(comment => (
              <CommentBubble key={comment.id}>
                <strong>@{comment.user?.username}</strong> {comment.content}
              </CommentBubble>
            ))}
          </StreamComments>
          
          <StreamInput>
            <input
              type="text"
              placeholder="Répondre aux commentaires..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
            />
            <button onClick={handleSendComment}>➤</button>
          </StreamInput>
        </LiveStreamView>
      )}
    </Container>
  )
}

export default LiveManagement
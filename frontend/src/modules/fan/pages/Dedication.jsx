// src/modules/fan/pages/Dedication.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
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

const SearchBar = styled.div`
  padding: 0 16px 16px;
  
  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 28px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
`

const ArtistsGrid = styled.div`
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`

const ArtistCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const ArtistImage = styled.div`
  height: 150px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ArtistInfo = styled.div`
  padding: 12px;
`

const ArtistName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ArtistCategory = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

const PriceTag = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.primary};
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
  min-height: 100px;
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

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
`

const OrdersList = styled.div`
  padding: 16px;
`

const OrderCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const OrderArtist = styled.h4`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.text};
`

const OrderStatus = styled.span`
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

const OrderMessage = styled.p`
  font-size: 14px;
  color: ${props => props.theme.text};
  margin-bottom: 8px;
`

const OrderDate = styled.p`
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const StatsBar = styled.div`
  display: flex;
  gap: 12px;
  margin: 0 16px 16px;
  flex-wrap: wrap;
`

const StatBadge = styled.div`
  background: ${props => props.bg || props.theme.surface};
  padding: 8px 12px;
  border-radius: 20px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => props.theme.text};
`

const Dedication = () => {
  const [activeTab, setActiveTab] = useState('artists')
  const [artists, setArtists] = useState([])
  const [orders, setOrders] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    recipient: '',
    message: '',
    type: 'video',
    duration: '30',
    date: '',
    visibility: 'private',
  })
  
  const { user } = useAuth()

  const loadArtists = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          artists!inner(artist_name, verification_status)
        `)
        .eq('role', 'artist')
        .eq('artists.verification_status', 'approved')
      
      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,artists.artist_name.ilike.%${searchQuery}%`)
      }
      
      const { data, error } = await query.limit(20)
      
      if (error) throw error
      setArtists(data || [])
      
      console.log('🎤 Artistes chargés:', data?.length)
    } catch (error) {
      console.error('Error loading artists:', error)
      toast.error('Erreur lors du chargement des artistes')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  const loadOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dedications')
        .select(`
          *,
          artist:users!dedications_artist_id_fkey(id, username, avatar_url)
        `)
        .eq('fan_id', user.id)
        .order('requested_at', { ascending: false })
      
      if (error) throw error
      setOrders(data || [])
      
      console.log('📦 Commandes chargées:', data?.length)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Erreur lors du chargement des commandes')
    }
  }, [user.id])

  useEffect(() => {
    loadArtists()
    loadOrders()
  }, [loadArtists, loadOrders])

  const handleArtistClick = (artist) => {
    setSelectedArtist(artist)
    setShowModal(true)
    console.log('🎨 Artiste sélectionné:', artist.username)
  }

  const handleSubmit = async () => {
    if (!formData.message.trim()) {
      toast.error('Veuillez écrire un message')
      return
    }
    
    if (!formData.recipient.trim()) {
      toast.error('Veuillez indiquer le destinataire')
      return
    }
    
    setSubmitting(true)
    
    try {
      const { data, error } = await supabase
        .from('dedications')
        .insert({
          artist_id: selectedArtist.id,
          fan_id: user.id,
          message: formData.message,
          recipient: formData.recipient,
          type: formData.type,
          duration: parseInt(formData.duration),
          scheduled_date: formData.date || null,
          visibility: formData.visibility,
          price: 29.99, // Prix par défaut, à définir par l'artiste
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
      
      if (error) throw error
      
      toast.success('Demande de dédicace envoyée !')
      console.log('✨ Dédicace commandée:', {
        artistId: selectedArtist.id,
        dedicationId: data?.[0]?.id,
        type: formData.type
      })
      
      setShowModal(false)
      setFormData({
        recipient: '',
        message: '',
        type: 'video',
        duration: '30',
        date: '',
        visibility: 'private',
      })
      loadOrders()
    } catch (error) {
      console.error('Error creating dedication:', error)
      toast.error('Erreur lors de la commande')
    } finally {
      setSubmitting(false)
    }
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'accepted': return '✅'
      case 'completed': return '🎬'
      case 'rejected': return '❌'
      default: return '❓'
    }
  }

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    accepted: orders.filter(o => o.status === 'accepted').length,
    completed: orders.filter(o => o.status === 'completed').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
    total: orders.length
  }

  if (loading && activeTab === 'artists') {
    return (
      <Container>
        <Header title="Dédicace" showProfile />
        <LoadingSpinner>
          <div>Chargement des artistes...</div>
        </LoadingSpinner>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Dédicace" showProfile />
      
      <HeaderSection>
        <Title>Dédicace</Title>
        <Subtitle>Fais-toi dédicacer par tes artistes préférés</Subtitle>
      </HeaderSection>
      
      {activeTab === 'orders' && orders.length > 0 && (
        <StatsBar>
          <StatBadge bg="#FFB44420">
            {getStatusIcon('pending')} En attente: {stats.pending}
          </StatBadge>
          <StatBadge bg="#00C85120">
            {getStatusIcon('accepted')} Acceptées: {stats.accepted}
          </StatBadge>
          <StatBadge bg="#33B5E520">
            {getStatusIcon('completed')} Livrées: {stats.completed}
          </StatBadge>
          <StatBadge bg="#FF444420">
            {getStatusIcon('rejected')} Refusées: {stats.rejected}
          </StatBadge>
        </StatsBar>
      )}
      
      <TabsContainer>
        <Tab
          active={activeTab === 'artists'}
          onClick={() => setActiveTab('artists')}
        >
          Artistes
        </Tab>
        <Tab
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        >
          Mes commandes ({orders.length})
        </Tab>
      </TabsContainer>
      
      {activeTab === 'artists' && (
        <>
          <SearchBar>
            <input
              type="text"
              placeholder="Rechercher un artiste..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </SearchBar>
          
          <ArtistsGrid>
            {artists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888', gridColumn: 'span 2' }}>
                {searchQuery ? 'Aucun artiste trouvé' : 'Aucun artiste disponible'}
              </div>
            ) : (
              artists.map(artist => (
                <ArtistCard
                  key={artist.id}
                  onClick={() => handleArtistClick(artist)}
                  whileTap={{ scale: 0.98 }}
                >
                  <ArtistImage>
                    <img src={artist.avatar_url || '/images/default-avatar.png'} alt={artist.display_name} />
                  </ArtistImage>
                  <ArtistInfo>
                    <ArtistName>{artist.artists?.artist_name || artist.display_name}</ArtistName>
                    <ArtistCategory>@{artist.username}</ArtistCategory>
                    <PriceTag>À partir de 29,99€</PriceTag>
                  </ArtistInfo>
                </ArtistCard>
              ))
            )}
          </ArtistsGrid>
        </>
      )}
      
      {activeTab === 'orders' && (
        <OrdersList>
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <div>Aucune commande de dédicace</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>
                Commandez votre première dédicace en cliquant sur "Artistes"
              </div>
            </div>
          ) : (
            orders.map(order => (
              <OrderCard key={order.id}>
                <OrderHeader>
                  <OrderArtist>
                    <Avatar
                      src={order.artist?.avatar_url}
                      name={order.artist?.username}
                      size={32}
                    />
                    <span style={{ marginLeft: 8 }}>@{order.artist?.username}</span>
                  </OrderArtist>
                  <OrderStatus status={order.status}>
                    {getStatusIcon(order.status)} {getStatusText(order.status)}
                  </OrderStatus>
                </OrderHeader>
                <OrderMessage>"{order.message}"</OrderMessage>
                <OrderDate>
                  📅 Demandé le {new Date(order.requested_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </OrderDate>
                {order.completed_at && (
                  <OrderDate>
                    ✅ Livré le {new Date(order.completed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </OrderDate>
                )}
                {order.video_url && (
                  <Button
                    variant="outline"
                    style={{ marginTop: 12 }}
                    onClick={() => window.open(order.video_url, '_blank')}
                  >
                    🎬 Voir la dédicace
                  </Button>
                )}
              </OrderCard>
            ))
          )}
        </OrdersList>
      )}
      
      <BottomNavigation />
      
      {showModal && selectedArtist && (
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
              <ModalTitle>
                Dédicace pour @{selectedArtist.username}
              </ModalTitle>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <Label>Destinataire *</Label>
                <Input
                  placeholder="Nom de la personne"
                  value={formData.recipient}
                  onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Message personnalisé *</Label>
                <TextArea
                  placeholder="Écris ton message pour l'artiste..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  maxLength={500}
                />
                <div style={{ fontSize: 12, textAlign: 'right', marginTop: 4, color: '#888' }}>
                  {formData.message.length}/500
                </div>
              </FormGroup>
              
              <FormGroup>
                <Label>Type de dédicace</Label>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="video">Vidéo personnalisée</option>
                  <option value="message">Message audio</option>
                  <option value="birthday">Message d'anniversaire</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Durée souhaitée</Label>
                <Select
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                >
                  <option value="30">30 secondes</option>
                  <option value="60">1 minute</option>
                  <option value="120">2 minutes</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Date souhaitée</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Visibilité</Label>
                <Select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                >
                  <option value="private">Privée (seulement moi)</option>
                  <option value="public">Publique (partagée sur mon profil)</option>
                </Select>
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
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Commande en cours...' : 'Commander - 29,99€'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default Dedication
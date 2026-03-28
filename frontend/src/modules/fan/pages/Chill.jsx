// src/modules/fan/pages/Chill.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Avatar } from '../../shared/components/ui/Avatar'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { ChillMap } from '../components/Chill/ChillMap'
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

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
`

const ActionButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 24px;
  border: none;
  background: ${props => props.primary ? props.theme.primary : props.theme.surface};
  color: ${props => props.primary ? 'white' : props.theme.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
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

const EventsList = styled.div`
  padding: 16px;
`

const EventCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const EventImage = styled.div`
  height: 150px;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const EventContent = styled.div`
  padding: 16px;
`

const EventHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`

const EventTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const EventLocation = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

const EventDateTime = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`

const EventParticipants = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
`

const ParticipantAvatars = styled.div`
  display: flex;
  
  & > * {
    margin-left: -8px;
    
    &:first-child {
      margin-left: 0;
    }
  }
`

const EventFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${props => props.theme.border};
`

const PlacesLeft = styled.span`
  font-size: 13px;
  color: ${props => props.theme.primary};
  font-weight: 500;
`

const JoinButton = styled(motion.button)`
  padding: 8px 20px;
  border-radius: 24px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
`

const AvailableUsers = styled.div`
  padding: 16px;
`

const UserCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  margin-bottom: 12px;
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

const UserDetails = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const ContactButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 13px;
  cursor: pointer;
`

const CreateModal = styled(motion.div)`
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

const Chill = () => {
  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    date: '',
    time: '',
    ageMin: '',
    ageMax: '',
    participants: '',
    fee: '',
    dressCode: '',
    description: '',
  })
  
  const { user } = useAuth()

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chill_events')
        .select(`
          *,
          organizer:users(id, username, avatar_url),
          participants:chill_participants(user_id, status, user:users(id, username, avatar_url))
        `)
        .eq('status', 'active')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(20)
      
      if (error) throw error
      setEvents(data || [])
      
      console.log('🌴 Événements chargés:', data?.length)
    } catch (error) {
      console.error('Error loading events:', error)
      toast.error('Erreur lors du chargement des sorties')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAvailableUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, bio, city')
        .eq('role', 'fan')
        .neq('id', user.id)
        .limit(20)
      
      if (error) throw error
      setAvailableUsers(data || [])
      
      console.log('👥 Utilisateurs disponibles:', data?.length)
    } catch (error) {
      console.error('Error loading available users:', error)
    }
  }, [user.id])

  useEffect(() => {
    loadEvents()
    loadAvailableUsers()
  }, [loadEvents, loadAvailableUsers])

  const handleCreateEvent = async () => {
    try {
      const eventDate = new Date(`${formData.date}T${formData.time}`)
      
      const { data, error } = await supabase
        .from('chill_events')
        .insert({
          organizer_id: user.id,
          name: formData.name,
          location_name: formData.location,
          event_date: eventDate.toISOString(),
          age_min: formData.ageMin ? parseInt(formData.ageMin) : null,
          age_max: formData.ageMax ? parseInt(formData.ageMax) : null,
          participant_limit: formData.participants ? parseInt(formData.participants) : null,
          fee: formData.fee ? parseFloat(formData.fee) : null,
          dress_code: formData.dressCode,
          description: formData.description,
        })
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('✅ Sortie créée avec succès:', {
          eventId: data[0].id,
          name: data[0].name,
          date: data[0].event_date
        })
        toast.success('Sortie créée avec succès !')
      }
      
      setShowCreateModal(false)
      setFormData({
        name: '',
        location: '',
        date: '',
        time: '',
        ageMin: '',
        ageMax: '',
        participants: '',
        fee: '',
        dressCode: '',
        description: '',
      })
      loadEvents()
    } catch (error) {
      console.error('Error creating event:', error)
      toast.error('Erreur lors de la création de la sortie')
    }
  }

  const handleJoinEvent = async (eventId) => {
    try {
      const { data, error } = await supabase
        .from('chill_participants')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'pending',
        })
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('📝 Demande de participation envoyée:', {
          eventId,
          participantId: data[0].id
        })
        toast.success('Demande de participation envoyée !')
      }
      
      loadEvents()
    } catch (error) {
      console.error('Error joining event:', error)
      toast.error('Erreur lors de la participation')
    }
  }

  const handleContactUser = (userId) => {
    console.log('📞 Contacter l\'utilisateur:', userId)
    toast.info(`Ouverture du chat avec l'utilisateur`)
    // Naviguer vers le chat
    // navigate(`/fan/messages?user=${userId}`)
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getParticipantCount = (event) => {
    return event.participants?.filter(p => p.status === 'approved').length || 0
  }

  const getPlacesLeft = (event) => {
    if (!event.participant_limit) return 'Illimité'
    const count = getParticipantCount(event)
    const left = event.participant_limit - count
    return `${left} place${left > 1 ? 's' : ''}`
  }

  if (loading && events.length === 0) {
    return (
      <Container>
        <Header title="Chill" showBack />
        <LoadingSpinner>
          <div>Chargement des sorties...</div>
        </LoadingSpinner>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Chill" showBack />
      
      <HeaderSection>
        <Title>CHILL</Title>
        <ActionButtons>
          <ActionButton
            onClick={() => setShowCreateModal(true)}
            whileTap={{ scale: 0.95 }}
          >
            Créer une sortie
          </ActionButton>
          <ActionButton
            primary
            onClick={() => setActiveTab('available')}
            whileTap={{ scale: 0.95 }}
          >
            Disponible
          </ActionButton>
        </ActionButtons>
      </HeaderSection>
      
      <SearchBar>
        <input type="text" placeholder="Rechercher une sortie, un lieu..." />
      </SearchBar>
      
      <TabsContainer>
        <Tab
          active={activeTab === 'events'}
          onClick={() => setActiveTab('events')}
        >
          Sorties ({events.length})
        </Tab>
        <Tab
          active={activeTab === 'available'}
          onClick={() => setActiveTab('available')}
        >
          Disponibles ({availableUsers.length})
        </Tab>
      </TabsContainer>
      
      <AnimatePresence mode="wait">
        {activeTab === 'events' ? (
          <motion.div
            key="events"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EventsList>
              {events.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🌴</div>
                  <div>Aucune sortie pour le moment</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    Créez une sortie pour commencer
                  </div>
                </div>
              ) : (
                events.map(event => (
                  <EventCard
                    key={event.id}
                    whileTap={{ scale: 0.98 }}
                  >
                    <EventImage>
                      <img src={event.image_url || '/images/default-event.jpg'} alt={event.name} />
                    </EventImage>
                    <EventContent>
                      <EventHeader>
                        <div>
                          <EventTitle>{event.name}</EventTitle>
                          <EventLocation>📍 {event.location_name}</EventLocation>
                        </div>
                        <Avatar
                          src={event.organizer?.avatar_url}
                          name={event.organizer?.username}
                          size={40}
                        />
                      </EventHeader>
                      
                      <EventDateTime>
                        <span>📅 {formatDate(event.event_date)}</span>
                      </EventDateTime>
                      
                      {event.dress_code && (
                        <EventDateTime>
                          <span>👔 Dress code: {event.dress_code}</span>
                        </EventDateTime>
                      )}
                      
                      {event.fee > 0 && (
                        <EventDateTime>
                          <span>💰 {event.fee}€ par personne</span>
                        </EventDateTime>
                      )}
                      
                      {event.description && (
                        <p style={{ fontSize: 14, marginBottom: 12, color: '#888' }}>
                          {event.description}
                        </p>
                      )}
                      
                      <EventParticipants>
                        <ParticipantAvatars>
                          {event.participants?.filter(p => p.status === 'approved').slice(0, 3).map((p) => (
                            <Avatar
                              key={p.user_id}
                              src={p.user?.avatar_url}
                              name={p.user?.username}
                              size={32}
                            />
                          ))}
                        </ParticipantAvatars>
                        <span style={{ fontSize: 13 }}>
                          {getParticipantCount(event)} participant(s)
                        </span>
                      </EventParticipants>
                      
                      <EventFooter>
                        <PlacesLeft>
                          {getPlacesLeft(event)} restantes
                        </PlacesLeft>
                        <JoinButton
                          onClick={() => handleJoinEvent(event.id)}
                          whileTap={{ scale: 0.95 }}
                        >
                          Participer
                        </JoinButton>
                      </EventFooter>
                    </EventContent>
                  </EventCard>
                ))
              )}
            </EventsList>
          </motion.div>
        ) : (
          <motion.div
            key="available"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AvailableUsers>
              {availableUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                  <div>Aucun utilisateur disponible</div>
                </div>
              ) : (
                availableUsers.map(user => (
                  <UserCard
                    key={user.id}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Avatar
                      src={user.avatar_url}
                      name={user.username}
                      size={52}
                      status={user.status}
                    />
                    <UserInfo>
                      <UserName>@{user.username}</UserName>
                      <UserDetails>
                        {user.city && `📍 ${user.city} • `}
                        {user.status === 'online' ? 'En ligne' : 'Hors ligne'}
                        {user.bio && (
                          <span style={{ fontSize: 11, color: '#888', display: 'block', marginTop: 2 }}>
                            {user.bio.substring(0, 50)}...
                          </span>
                        )}
                      </UserDetails>
                    </UserInfo>
                    <ContactButton
                      onClick={() => handleContactUser(user.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      Contacter
                    </ContactButton>
                  </UserCard>
                ))
              )}
            </AvailableUsers>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BottomNavigation />
      
      {showCreateModal && (
        <CreateModal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowCreateModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>Créer une sortie</ModalTitle>
              <button onClick={() => setShowCreateModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <Label>Nom de la sortie *</Label>
                <Input
                  placeholder="Soirée chill, Concert, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Lieu *</Label>
                <Input
                  placeholder="Nom du lieu ou adresse"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Date et heure *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
                <Input
                  type="time"
                  style={{ marginTop: 8 }}
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Tranche d'âge</Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={formData.ageMin}
                    onChange={(e) => setFormData({ ...formData, ageMin: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={formData.ageMax}
                    onChange={(e) => setFormData({ ...formData, ageMax: e.target.value })}
                  />
                </div>
              </FormGroup>
              
              <FormGroup>
                <Label>Nombre de participants</Label>
                <Input
                  type="number"
                  placeholder="Illimité si vide"
                  value={formData.participants}
                  onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Droit de participation (€)</Label>
                <Input
                  type="number"
                  placeholder="Gratuit si vide"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Dress code</Label>
                <Select
                  value={formData.dressCode}
                  onChange={(e) => setFormData({ ...formData, dressCode: e.target.value })}
                >
                  <option value="">Aucun</option>
                  <option value="Casual">Casual</option>
                  <option value="Chic">Chic</option>
                  <option value="Sport">Sport</option>
                  <option value="Soirée">Soirée</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Description</Label>
                <TextArea
                  placeholder="Décris ta sortie..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </FormGroup>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowCreateModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleCreateEvent}
              >
                Créer
              </Button>
            </ModalFooter>
          </ModalContent>
        </CreateModal>
      )}
    </Container>
  )
}

export default Chill
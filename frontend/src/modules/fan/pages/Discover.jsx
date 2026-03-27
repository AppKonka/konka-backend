// src/modules/fan/pages/Discover.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
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

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const Tab = styled(motion.button)`
  flex: 1;
  padding: 12px;
  border-radius: 28px;
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  border: none;
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
`

const CardsContainer = styled.div`
  position: relative;
  height: 70vh;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20px;
`

const Card = styled(motion.div)`
  position: absolute;
  width: 100%;
  max-width: 350px;
  height: 500px;
  background: ${props => props.theme.surface};
  border-radius: 24px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.xl};
  cursor: pointer;
`

const CardImage = styled.div`
  height: 60%;
  background: ${props => props.theme.border};
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const CardContent = styled.div`
  padding: 16px;
`

const CardName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const CardInfo = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 12px;
`

const CommonArtists = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  
  span {
    color: ${props => props.theme.primary};
    font-weight: 500;
  }
`

const CurrentSong = styled.div`
  background: ${props => props.theme.border};
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  
  .icon {
    font-size: 20px;
  }
  
  .info {
    flex: 1;
    
    .title {
      font-weight: 500;
      font-size: 14px;
    }
    
    .artist {
      font-size: 12px;
      color: ${props => props.theme.textSecondary};
    }
  }
`

const ActionButtons = styled.div`
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 0 20px;
`

const ActionButton = styled(motion.button)`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  border: none;
  font-size: 28px;
  cursor: pointer;
  box-shadow: ${props => props.theme.shadow.lg};
  
  ${props => props.type === 'like' && `
    background: #FF6B35;
    color: white;
  `}
  
  ${props => props.type === 'super' && `
    background: #FFD700;
    color: #333;
  `}
  
  ${props => props.type === 'pass' && `
    background: #FF4444;
    color: white;
  `}
`

const FiltersBar = styled.div`
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
`

const FilterChip = styled(motion.button)`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.active ? props.theme.primary : props.theme.border};
  background: ${props => props.active ? props.theme.primary : props.theme.surface};
  color: ${props => props.active ? 'white' : props.theme.text};
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
`

const MatchesList = styled.div`
  padding: 16px;
`

const MatchItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const MatchInfo = styled.div`
  flex: 1;
`

const MatchName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const MatchMessage = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const LikesList = styled.div`
  padding: 16px;
`

const LikeItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  margin-bottom: 12px;
`

const LikeInfo = styled.div`
  flex: 1;
`

const LikeName = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const SuperLikeBadge = styled.span`
  background: #FFD700;
  color: #333;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
`

const LikeActions = styled.div`
  display: flex;
  gap: 8px;
  
  button {
    padding: 6px 12px;
    border-radius: 20px;
    border: none;
    font-size: 12px;
    cursor: pointer;
    
    &.accept {
      background: ${props => props.theme.primary};
      color: white;
    }
    
    &.ignore {
      background: ${props => props.theme.border};
      color: ${props => props.theme.textSecondary};
    }
  }
`

const filters = [
  { id: 'all', label: 'Tous' },
  { id: 'nearby', label: 'À proximité' },
  { id: 'music', label: 'Musique' },
  { id: 'new', label: 'Nouveaux' },
]

const Discover = () => {
  const [activeTab, setActiveTab] = useState('discover')
  const [profiles, setProfiles] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matches, setMatches] = useState([])
  const [likes, setLikes] = useState([])
  const [loading, setLoading] = useState(true)
  const [direction, setDirection] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [userLocation, setUserLocation] = useState(null)
  
  const cardRef = useRef(null)
  const { user } = useAuth()

  // Récupérer la localisation de l'utilisateur
  const getUserLocation = useCallback(async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('location_lat, location_lng')
        .eq('id', user.id)
        .single()
      
      if (userData && userData.location_lat && userData.location_lng) {
        setUserLocation({
          lat: userData.location_lat,
          lng: userData.location_lng
        })
      }
    } catch (error) {
      console.error('Error getting user location:', error)
    }
  }, [user.id])

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      // Récupérer les profils à recommander
      let query = supabase
        .from('users')
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          bio,
          city,
          date_of_birth,
          role,
          location_lat,
          location_lng
        `)
        .neq('id', user.id)
        .eq('role', 'fan')
        .limit(20)

      // Filtrer par distance si nécessaire
      if (activeFilter === 'nearby' && userLocation) {
        query = query.not('location_lat', 'is', null)
      }

      const { data, error } = await query
      
      if (error) throw error
      
      // Calculer le score de match basé sur les artistes en commun
      const profilesWithScore = await Promise.all(
        (data || []).map(async profile => {
          // Récupérer les artistes suivis par l'utilisateur
          const { data: userArtists } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.id)
          
          // Récupérer les artistes suivis par le profil
          const { data: profileArtists } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', profile.id)
          
          const commonArtists = userArtists?.filter(
            ua => profileArtists?.some(pa => pa.following_id === ua.following_id)
          ) || []
          
          // Calculer la distance si les deux ont des coordonnées
          let distanceScore = 0
          if (userLocation && profile.location_lat && profile.location_lng) {
            const distance = calculateDistance(
              userLocation.lat, userLocation.lng,
              profile.location_lat, profile.location_lng
            )
            // Plus la distance est petite, plus le score est élevé
            distanceScore = Math.max(0, 20 - Math.min(20, distance / 5))
          }
          
          return {
            ...profile,
            commonArtists: commonArtists.length,
            score: (commonArtists.length * 35) + distanceScore + Math.random() * 30,
          }
        })
      )
      
      // Trier par score
      profilesWithScore.sort((a, b) => b.score - a.score)
      setProfiles(profilesWithScore)
      
      console.log('👥 Profils chargés:', profilesWithScore.length)
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast.error('Erreur lors du chargement des profils')
    } finally {
      setLoading(false)
    }
  }, [user.id, activeFilter, userLocation])

  const loadMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:users!matches_user1_id_fkey(id, username, avatar_url),
          user2:users!matches_user2_id_fkey(id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'matched')
        .order('matched_at', { ascending: false })
      
      if (error) throw error
      
      const matchesWithMessages = await Promise.all(
        (data || []).map(async match => {
          const otherUser = match.user1_id === user.id ? match.user2 : match.user1
          
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('match_id', match.id)
            .order('created_at', { ascending: false })
            .limit(1)
          
          const { data: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('match_id', match.id)
            .eq('is_read', false)
            .neq('sender_id', user.id)
          
          return {
            ...match,
            otherUser,
            lastMessage: lastMessage?.[0],
            unreadCount: unreadCount?.count || 0
          }
        })
      )
      
      setMatches(matchesWithMessages)
      console.log('💑 Matchs chargés:', matchesWithMessages.length)
    } catch (error) {
      console.error('Error loading matches:', error)
    }
  }, [user.id])

  const loadLikes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          user1_id,
          user2_id,
          user1:users!matches_user1_id_fkey(id, username, avatar_url),
          user2:users!matches_user2_id_fkey(id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'pending')
        .neq('user1_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      const likesWithUsers = (data || []).map(like => ({
        ...like,
        user: like.user1_id === user.id ? like.user2 : like.user1,
      }))
      
      setLikes(likesWithUsers)
      console.log('❤️ Likes reçus:', likesWithUsers.length)
    } catch (error) {
      console.error('Error loading likes:', error)
    }
  }, [user.id])

  useEffect(() => {
    getUserLocation()
  }, [getUserLocation])

  useEffect(() => {
    loadProfiles()
    loadMatches()
    loadLikes()
  }, [loadProfiles, loadMatches, loadLikes, activeFilter])

  const handleSwipe = async (action) => {
    if (currentIndex >= profiles.length) return
    
    const currentProfile = profiles[currentIndex]
    
    if (action === 'like') {
      // Créer un match en attente
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user1_id: user.id,
          user2_id: currentProfile.id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
      
      if (!error && data) {
        // Vérifier si l'autre utilisateur a déjà liké
        const { data: existingMatch } = await supabase
          .from('matches')
          .select('*')
          .eq('user1_id', currentProfile.id)
          .eq('user2_id', user.id)
          .eq('status', 'pending')
        
        if (existingMatch && existingMatch.length > 0) {
          // Match réciproque!
          await supabase
            .from('matches')
            .update({ status: 'matched', matched_at: new Date().toISOString() })
            .eq('id', existingMatch[0].id)
          
          await supabase
            .from('matches')
            .update({ status: 'matched', matched_at: new Date().toISOString() })
            .eq('id', data[0].id)
          
          // Créer une notification
          await supabase
            .from('notifications')
            .insert({
              user_id: user.id,
              type: 'new_match',
              title: 'Nouveau match !',
              content: `Vous avez matché avec @${currentProfile.username}`,
              created_at: new Date().toISOString()
            })
          
          toast.success(`🎉 C'est un match avec @${currentProfile.username} !`)
          console.log('💑 Match réciproque créé!')
        } else {
          toast.success(`❤️ Like envoyé à @${currentProfile.username}`)
        }
      }
    } else if (action === 'super') {
      toast.success(`👑 Super like envoyé à @${currentProfile.username}`)
    }
    
    // Animation de sortie
    setDirection(action === 'like' || action === 'super' ? 'right' : 'left')
    
    // Passer au profil suivant
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1)
      setDirection(null)
    }, 300)
  }

  const handleAcceptLike = async (like) => {
    try {
      await supabase
        .from('matches')
        .update({ status: 'matched', matched_at: new Date().toISOString() })
        .eq('id', like.id)
      
      toast.success(`🎉 Vous avez matché avec @${like.user?.username} !`)
      await loadMatches()
      await loadLikes()
    } catch (error) {
      console.error('Error accepting like:', error)
      toast.error('Erreur lors de l\'acceptation')
    }
  }

  const handleIgnoreLike = async (like) => {
    try {
      await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', like.id)
      
      await loadLikes()
    } catch (error) {
      console.error('Error ignoring like:', error)
    }
  }

  const handleMatchClick = (match) => {
    console.log('Open chat with', match.otherUser.username)
    // Naviguer vers la conversation
    // navigate(`/fan/messages?match=${match.id}`)
  }

  const currentProfile = profiles[currentIndex]

  return (
    <Container>
      <Header title="Rencontre" showProfile />
      
      <TabsContainer>
        <Tab
          active={activeTab === 'discover'}
          onClick={() => setActiveTab('discover')}
          whileTap={{ scale: 0.95 }}
        >
          Découverte
        </Tab>
        <Tab
          active={activeTab === 'matches'}
          onClick={() => setActiveTab('matches')}
          whileTap={{ scale: 0.95 }}
        >
          Mes matchs ({matches.length})
        </Tab>
        <Tab
          active={activeTab === 'likes'}
          onClick={() => setActiveTab('likes')}
          whileTap={{ scale: 0.95 }}
        >
          Likes reçus ({likes.length})
        </Tab>
      </TabsContainer>
      
      <AnimatePresence mode="wait">
        {activeTab === 'discover' && (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <FiltersBar>
              {filters.map(filter => (
                <FilterChip
                  key={filter.id}
                  active={activeFilter === filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  whileTap={{ scale: 0.95 }}
                >
                  {filter.label}
                </FilterChip>
              ))}
            </FiltersBar>
            
            <CardsContainer>
              {loading ? (
                <div style={{ textAlign: 'center' }}>Chargement...</div>
              ) : currentProfile ? (
                <Card
                  ref={cardRef}
                  initial={{ scale: 1, x: 0, rotate: 0 }}
                  animate={{ 
                    x: direction === 'right' ? 500 : direction === 'left' ? -500 : 0,
                    rotate: direction === 'right' ? 15 : direction === 'left' ? -15 : 0,
                    opacity: direction ? 0 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <CardImage>
                    <img src={currentProfile.avatar_url || '/images/default-avatar.png'} alt={currentProfile.display_name} />
                  </CardImage>
                  <CardContent>
                    <CardName>{currentProfile.display_name}</CardName>
                    <CardInfo>{currentProfile.city || 'Ville inconnue'} • {calculateAge(currentProfile.date_of_birth)} ans</CardInfo>
                    
                    {currentProfile.commonArtists > 0 && (
                      <CommonArtists>
                        <span>{currentProfile.commonArtists}</span> artiste(s) en commun
                      </CommonArtists>
                    )}
                    
                    <CurrentSong>
                      <div className="icon">🎵</div>
                      <div className="info">
                        <div className="title">Morceau du moment</div>
                        <div className="artist">Artiste inconnu</div>
                      </div>
                    </CurrentSong>
                    
                    <p style={{ fontSize: 14, marginTop: 12, color: '#888' }}>
                      {currentProfile.bio || 'Aucune bio pour le moment'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  Plus de profils à découvrir
                </div>
              )}
            </CardsContainer>
            
            {currentProfile && (
              <ActionButtons>
                <ActionButton
                  type="pass"
                  onClick={() => handleSwipe('pass')}
                  whileTap={{ scale: 0.9 }}
                >
                  ✖
                </ActionButton>
                <ActionButton
                  type="super"
                  onClick={() => handleSwipe('super')}
                  whileTap={{ scale: 0.9 }}
                >
                  👑
                </ActionButton>
                <ActionButton
                  type="like"
                  onClick={() => handleSwipe('like')}
                  whileTap={{ scale: 0.9 }}
                >
                  ❤️
                </ActionButton>
              </ActionButtons>
            )}
          </motion.div>
        )}
        
        {activeTab === 'matches' && (
          <motion.div
            key="matches"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MatchesList>
              {matches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  Aucun match pour le moment
                </div>
              ) : (
                matches.map(match => (
                  <MatchItem
                    key={match.id}
                    onClick={() => handleMatchClick(match)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Avatar
                      src={match.otherUser?.avatar_url}
                      name={match.otherUser?.username}
                      size={52}
                      status={match.otherUser?.status}
                    />
                    <MatchInfo>
                      <MatchName>@{match.otherUser?.username}</MatchName>
                      {match.lastMessage && (
                        <MatchMessage>
                          {match.lastMessage.content?.substring(0, 40)}
                          {match.unreadCount > 0 && (
                            <span style={{ marginLeft: 8, color: '#FF6B35', fontWeight: 'bold' }}>
                              • {match.unreadCount} non lu(s)
                            </span>
                          )}
                        </MatchMessage>
                      )}
                    </MatchInfo>
                  </MatchItem>
                ))
              )}
            </MatchesList>
          </motion.div>
        )}
        
        {activeTab === 'likes' && (
          <motion.div
            key="likes"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LikesList>
              {likes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                  Aucun like reçu
                </div>
              ) : (
                likes.map(like => (
                  <LikeItem key={like.id}>
                    <Avatar
                      src={like.user?.avatar_url}
                      name={like.user?.username}
                      size={52}
                    />
                    <LikeInfo>
                      <LikeName>
                        @{like.user?.username}
                        {like.type === 'super' && <SuperLikeBadge>Super Like</SuperLikeBadge>}
                      </LikeName>
                    </LikeInfo>
                    <LikeActions>
                      <button className="accept" onClick={() => handleAcceptLike(like)}>
                        Accepter
                      </button>
                      <button className="ignore" onClick={() => handleIgnoreLike(like)}>
                        Ignorer
                      </button>
                    </LikeActions>
                  </LikeItem>
                ))
              )}
            </LikesList>
          </motion.div>
        )}
      </AnimatePresence>
      
      <BottomNavigation />
    </Container>
  )
}

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return '?'
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default Discover
// src/modules/admin/pages/ArtistVerification.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { 
  CheckCircle, XCircle, Eye, Download, 
  Calendar, Music, Globe, Instagram, Youtube, Twitter
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

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`

const StatCard = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  flex: 1;
  min-width: 150px;
  text-align: center;
`

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.primary};
`

const StatLabel = styled.div`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const VerificationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
`

const VerificationCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
`

const CardHeader = styled.div`
  padding: 20px;
  background: ${props => props.theme.background};
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const ArtistAvatar = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  object-fit: cover;
`

const ArtistInfo = styled.div`
  flex: 1;
`

const ArtistName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const ArtistUsername = styled.p`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const CardBody = styled.div`
  padding: 20px;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  font-size: 13px;
  color: ${props => props.theme.textSecondary};
`

const InfoValue = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${props => props.theme.text};
`

const DocumentSection = styled.div`
  margin: 16px 0;
`

const DocumentTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const DocumentList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DocumentItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: ${props => props.theme.background};
  border-radius: 8px;
`

const SocialLinks = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 12px;
`

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: ${props => props.theme.primary};
  text-decoration: none;
`

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid ${props => props.theme.border};
`

const ApproveButton = styled(motion.button)`
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  border: none;
  background: #00C851;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

const RejectButton = styled(motion.button)`
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  border: none;
  background: #FF4444;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

const ArtistVerification = () => {
  const [pendingArtists, setPendingArtists] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingArtists()
  }, [])

  const loadPendingArtists = async () => {
    setLoading(true)
    try {
      // Récupérer les artistes en attente
      const { data: artists, error } = await supabase
        .from('artists')
        .select(`
          *,
          user:users(id, username, display_name, email, phone, avatar_url, created_at)
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setPendingArtists(artists || [])
      
      // Calculer les stats
      const { data: allArtists } = await supabase
        .from('artists')
        .select('verification_status')
      
      const pending = allArtists?.filter(a => a.verification_status === 'pending').length || 0
      const approved = allArtists?.filter(a => a.verification_status === 'approved').length || 0
      const rejected = allArtists?.filter(a => a.verification_status === 'rejected').length || 0
      
      setStats({
        pending,
        approved,
        rejected,
        total: allArtists?.length || 0
      })
    } catch (error) {
      console.error('Error loading pending artists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (artistId, userId, action) => {
    try {
      // Mettre à jour le statut de l'artiste
      await supabase
        .from('artists')
        .update({ 
          verification_status: action,
          verified_at: action === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', artistId)
      
      // Mettre à jour l'utilisateur
      await supabase
        .from('users')
        .update({ is_verified: action === 'approved' })
        .eq('id', userId)
      
      toast.success(`Artiste ${action === 'approved' ? 'vérifié' : 'rejeté'} avec succès`)
      loadPendingArtists()
    } catch (error) {
      console.error('Error verifying artist:', error)
      toast.error('Erreur lors de la vérification')
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
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
        <Title>Vérification des artistes</Title>
        <Subtitle>Examinez et vérifiez les demandes d'artistes</Subtitle>
      </Header>
      
      <StatsRow>
        <StatCard>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>En attente</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.approved}</StatValue>
          <StatLabel>Vérifiés</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>Rejetés</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total</StatLabel>
        </StatCard>
      </StatsRow>
      
      {pendingArtists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div>Aucun artiste en attente de vérification</div>
        </div>
      ) : (
        <VerificationGrid>
          {pendingArtists.map(artist => (
            <VerificationCard
              key={artist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CardHeader>
                <ArtistAvatar src={artist.user?.avatar_url || '/images/default-avatar.png'} />
                <ArtistInfo>
                  <ArtistName>{artist.artist_name}</ArtistName>
                  <ArtistUsername>@{artist.user?.username}</ArtistUsername>
                </ArtistInfo>
              </CardHeader>
              
              <CardBody>
                <InfoRow>
                  <InfoLabel>Nom légal</InfoLabel>
                  <InfoValue>{artist.legal_name || 'Non renseigné'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Email</InfoLabel>
                  <InfoValue>{artist.user?.email}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Téléphone</InfoLabel>
                  <InfoValue>{artist.user?.phone || 'Non renseigné'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Nationalité</InfoLabel>
                  <InfoValue>{artist.nationality || 'Non renseignée'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Type</InfoLabel>
                  <InfoValue>
                    {artist.type === 'solo' ? 'Artiste solo' : 
                     artist.type === 'group' ? 'Groupe' :
                     artist.type === 'label' ? 'Label' : 'Producteur'}
                  </InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Année de début</InfoLabel>
                  <InfoValue>{artist.year_started || 'Non renseignée'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Genres</InfoLabel>
                  <InfoValue>{artist.genres?.join(', ') || 'Non renseignés'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel>Date d'inscription</InfoLabel>
                  <InfoValue>
                    <Calendar size={12} /> {formatDate(artist.user?.created_at)}
                  </InfoValue>
                </InfoRow>
                
                {artist.social_links && Object.keys(artist.social_links).length > 0 && (
                  <SocialLinks>
                    {artist.social_links.instagram && (
                      <SocialLink href={artist.social_links.instagram} target="_blank">
                        <Instagram size={14} /> Instagram
                      </SocialLink>
                    )}
                    {artist.social_links.youtube && (
                      <SocialLink href={artist.social_links.youtube} target="_blank">
                        <Youtube size={14} /> YouTube
                      </SocialLink>
                    )}
                    {artist.social_links.twitter && (
                      <SocialLink href={artist.social_links.twitter} target="_blank">
                        <Twitter size={14} /> Twitter
                      </SocialLink>
                    )}
                  </SocialLinks>
                )}
                
                {artist.documents_url && artist.documents_url.length > 0 && (
                  <DocumentSection>
                    <DocumentTitle>Documents fournis</DocumentTitle>
                    <DocumentList>
                      {artist.documents_url.map((url, idx) => (
                        <DocumentItem key={idx}>
                          <span>Document {idx + 1}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Eye size={16} /> Voir
                          </a>
                        </DocumentItem>
                      ))}
                    </DocumentList>
                  </DocumentSection>
                )}
                
                <ActionButtons>
                  <ApproveButton onClick={() => handleVerify(artist.id, artist.user_id, 'approved')} whileTap={{ scale: 0.95 }}>
                    <CheckCircle size={18} /> Approuver
                  </ApproveButton>
                  <RejectButton onClick={() => handleVerify(artist.id, artist.user_id, 'rejected')} whileTap={{ scale: 0.95 }}>
                    <XCircle size={18} /> Rejeter
                  </RejectButton>
                </ActionButtons>
              </CardBody>
            </VerificationCard>
          ))}
        </VerificationGrid>
      )}
    </Container>
  )
}

export default ArtistVerification
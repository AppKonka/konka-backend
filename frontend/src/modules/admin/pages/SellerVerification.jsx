// src/modules/admin/pages/SellerVerification.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { 
  CheckCircle, XCircle, Eye, Download, 
  Building, MapPin, Phone, Mail, FileText,
  CreditCard, Calendar, Store
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
  grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
  gap: 20px;
`

const VerificationCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const CardHeader = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, ${props => props.theme.primary}20, transparent);
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const SellerLogo = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  object-fit: cover;
  background: white;
`

const SellerInfo = styled.div`
  flex: 1;
`

const StoreName = styled.h3`
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const SellerUsername = styled.p`
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
  display: flex;
  align-items: center;
  gap: 6px;
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
  padding: 8px 12px;
  background: ${props => props.theme.background};
  border-radius: 8px;
`

const CategoryTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`

const CategoryTag = styled.span`
  padding: 4px 10px;
  border-radius: 16px;
  background: ${props => props.theme.primary}20;
  color: ${props => props.theme.primary};
  font-size: 11px;
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

const SellerVerification = () => {
  const [pendingSellers, setPendingSellers] = useState([])
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingSellers()
  }, [])

  const loadPendingSellers = async () => {
    setLoading(true)
    try {
      const { data: sellers, error } = await supabase
        .from('sellers')
        .select(`
          *,
          user:users(id, username, display_name, email, phone, avatar_url, created_at)
        `)
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      setPendingSellers(sellers || [])
      
      const { data: allSellers } = await supabase
        .from('sellers')
        .select('verification_status')
      
      const pending = allSellers?.filter(s => s.verification_status === 'pending').length || 0
      const approved = allSellers?.filter(s => s.verification_status === 'approved').length || 0
      const rejected = allSellers?.filter(s => s.verification_status === 'rejected').length || 0
      
      setStats({
        pending,
        approved,
        rejected,
        total: allSellers?.length || 0
      })
    } catch (error) {
      console.error('Error loading pending sellers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (sellerId, userId, action) => {
    try {
      await supabase
        .from('sellers')
        .update({ 
          verification_status: action,
          verified_at: action === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', sellerId)
      
      await supabase
        .from('users')
        .update({ is_verified: action === 'approved' })
        .eq('id', userId)
      
      toast.success(`Vendeur ${action === 'approved' ? 'vérifié' : 'rejeté'} avec succès`)
      loadPendingSellers()
    } catch (error) {
      console.error('Error verifying seller:', error)
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

  const getStoreTypeLabel = (type) => {
    switch (type) {
      case 'individual': return 'Particulier'
      case 'professional': return 'Professionnel'
      case 'artisan': return 'Artisan'
      default: return 'Non spécifié'
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
        <Title>Vérification des vendeurs</Title>
        <Subtitle>Examinez et vérifiez les demandes de vendeurs</Subtitle>
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
      
      {pendingSellers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div>Aucun vendeur en attente de vérification</div>
        </div>
      ) : (
        <VerificationGrid>
          {pendingSellers.map(seller => (
            <VerificationCard
              key={seller.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CardHeader>
                <SellerLogo src={seller.store_logo || seller.user?.avatar_url || '/images/default-store.png'} />
                <SellerInfo>
                  <StoreName>{seller.store_name}</StoreName>
                  <SellerUsername>@{seller.user?.username}</SellerUsername>
                </SellerInfo>
              </CardHeader>
              
              <CardBody>
                <InfoRow>
                  <InfoLabel><Store size={14} /> Type de boutique</InfoLabel>
                  <InfoValue>{getStoreTypeLabel(seller.store_type)}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel><Building size={14} /> SIRET</InfoLabel>
                  <InfoValue>{seller.siret_number || 'Non renseigné'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel><Mail size={14} /> Email</InfoLabel>
                  <InfoValue>{seller.user?.email}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel><Phone size={14} /> Téléphone</InfoLabel>
                  <InfoValue>{seller.phone || seller.user?.phone || 'Non renseigné'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel><MapPin size={14} /> Adresse</InfoLabel>
                  <InfoValue>{seller.address || 'Non renseignée'}</InfoValue>
                </InfoRow>
                <InfoRow>
                  <InfoLabel><Calendar size={14} /> Date d'inscription</InfoLabel>
                  <InfoValue>{formatDate(seller.user?.created_at)}</InfoValue>
                </InfoRow>
                
                {seller.categories && seller.categories.length > 0 && (
                  <CategoryTags>
                    {seller.categories.map(cat => (
                      <CategoryTag key={cat}>{cat}</CategoryTag>
                    ))}
                  </CategoryTags>
                )}
                
                {seller.documents_url && seller.documents_url.length > 0 && (
                  <DocumentSection>
                    <DocumentTitle>Documents fournis</DocumentTitle>
                    <DocumentList>
                      {seller.documents_url.map((url, idx) => (
                        <DocumentItem key={idx}>
                          <span><FileText size={14} /> Document {idx + 1}</span>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Eye size={16} /> Voir
                          </a>
                        </DocumentItem>
                      ))}
                    </DocumentList>
                  </DocumentSection>
                )}
                
                <ActionButtons>
                  <ApproveButton onClick={() => handleVerify(seller.id, seller.user_id, 'approved')} whileTap={{ scale: 0.95 }}>
                    <CheckCircle size={18} /> Approuver
                  </ApproveButton>
                  <RejectButton onClick={() => handleVerify(seller.id, seller.user_id, 'rejected')} whileTap={{ scale: 0.95 }}>
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

export default SellerVerification
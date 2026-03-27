// src/modules/shared/pages/ReportContent.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 40px;
`

const Content = styled(motion.div)`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
`

const Title = styled(motion.h1)`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Subtitle = styled(motion.p)`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 24px;
`

const FormGroup = styled(motion.div)`
  margin-bottom: 20px;
`

const Label = styled(motion.label)`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Select = styled(motion.select)`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const TextArea = styled(motion.textarea)`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
  min-height: 120px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const PreviewCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid ${props => props.theme.border};
`

const PreviewImage = styled(motion.img)`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`

const PreviewInfo = styled.div`
  flex: 1;
`

const PreviewTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const PreviewType = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const ButtonWrapper = styled(motion.div)`
  margin-top: 20px;
`

const reportReasons = [
  { value: 'spam', label: 'Spam ou contenu publicitaire' },
  { value: 'harassment', label: 'Harcèlement ou intimidation' },
  { value: 'hate_speech', label: 'Discours haineux' },
  { value: 'violence', label: 'Violence ou contenu choquant' },
  { value: 'nudity', label: 'Nudité ou contenu sexuel' },
  { value: 'copyright', label: 'Violation des droits d\'auteur' },
  { value: 'impersonation', label: 'Usurpation d\'identité' },
  { value: 'self_harm', label: 'Auto-mutilation ou suicide' },
  { value: 'other', label: 'Autre raison' }
]

const ReportContent = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const [formData, setFormData] = useState({
    reason: '',
    details: ''
  })
  const [loading, setLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  const content = location.state?.content || null
  const contentType = location.state?.type || 'user'

  const handleSubmit = async () => {
    if (!formData.reason) {
      toast.error('Veuillez sélectionner une raison')
      return
    }
    
    setLoading(true)
    try {
      const reportData = {
        reporter_id: user.id,
        reported_id: content?.id || null,
        content_type: contentType,
        content_id: content?.id || null,
        reason: formData.reason,
        details: formData.details,
        status: 'pending',
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
      
      if (error) throw error
      
      setIsSubmitted(true)
      toast.success('Signalement envoyé. Merci pour votre vigilance.')
      
      console.log('📢 Signalement envoyé:', {
        reportId: data?.[0]?.id,
        reason: formData.reason,
        contentType
      })
      
      setTimeout(() => navigate(-1), 2000)
      
    } catch (error) {
      console.error('Error submitting report:', error)
      toast.error('Erreur lors de l\'envoi du signalement')
    } finally {
      setLoading(false)
    }
  }

  const getContentPreview = () => {
    if (!content) return null
    
    if (contentType === 'user') {
      return (
        <PreviewCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PreviewImage 
            src={content.avatar_url || '/images/default-avatar.png'} 
            whileHover={{ scale: 1.05 }}
          />
          <PreviewInfo>
            <PreviewTitle>@{content.username}</PreviewTitle>
            <PreviewType>Compte utilisateur</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'post') {
      return (
        <PreviewCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PreviewImage 
            src={content.media_urls?.[0] || '/images/default-post.jpg'} 
            whileHover={{ scale: 1.05 }}
          />
          <PreviewInfo>
            <PreviewTitle>{content.caption || 'Publication'}</PreviewTitle>
            <PreviewType>Publication • {new Date(content.created_at).toLocaleDateString()}</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'video') {
      return (
        <PreviewCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PreviewImage 
            src={content.thumbnail_url || '/images/default-video.jpg'} 
            whileHover={{ scale: 1.05 }}
          />
          <PreviewInfo>
            <PreviewTitle>{content.title || 'Vidéo'}</PreviewTitle>
            <PreviewType>Vidéo • {content.view_count || 0} vues</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'comment') {
      return (
        <PreviewCard
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <PreviewInfo>
            <PreviewTitle>Commentaire de @{content.user?.username}</PreviewTitle>
            <PreviewType>{content.content}</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    return null
  }

  return (
    <Container>
      <Header title="Signaler" showBack />
      
      <Content
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Signaler un contenu
        </Title>
        
        <Subtitle
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Votre signalement est anonyme. Nous examinons chaque signalement avec attention.
        </Subtitle>
        
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {getContentPreview()}
              
              <FormGroup
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Label>Raison du signalement *</Label>
                <Select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  whileTap={{ scale: 0.99 }}
                >
                  <option value="">Sélectionner une raison</option>
                  {reportReasons.map(reason => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </Select>
              </FormGroup>
              
              <FormGroup
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Label>Détails (optionnel)</Label>
                <TextArea
                  placeholder="Décrivez précisément le problème..."
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  whileTap={{ scale: 0.99 }}
                />
              </FormGroup>
              
              <ButtonWrapper
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Button
                  fullWidth
                  onClick={handleSubmit}
                  loading={loading}
                  whileTap={{ scale: 0.98 }}
                >
                  Envoyer le signalement
                </Button>
              </ButtonWrapper>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 300 }}
              style={{ textAlign: 'center', padding: 40 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                style={{ fontSize: 64, marginBottom: 20 }}
              >
                📢
              </motion.div>
              <h3 style={{ marginBottom: 10 }}>Signalement envoyé !</h3>
              <p style={{ color: '#888', fontSize: 14 }}>
                Merci pour votre vigilance. Nous examinerons ce contenu dans les plus brefs délais.
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                style={{ marginTop: 20 }}
              >
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  whileTap={{ scale: 0.98 }}
                >
                  Retour
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Content>
    </Container>
  )
}

export default ReportContent
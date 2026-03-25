// src/modules/shared/pages/ReportContent.jsx
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
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

const Content = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
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

const FormGroup = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Select = styled.select`
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

const TextArea = styled.textarea`
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

const PreviewCard = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`

const PreviewImage = styled.img`
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
      
      const { error } = await supabase
        .from('reports')
        .insert(reportData)
      
      if (error) throw error
      
      toast.success('Signalement envoyé. Merci pour votre vigilance.')
      navigate(-1)
      
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
        <PreviewCard>
          <PreviewImage src={content.avatar_url || '/images/default-avatar.png'} />
          <PreviewInfo>
            <PreviewTitle>@{content.username}</PreviewTitle>
            <PreviewType>Compte utilisateur</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'post') {
      return (
        <PreviewCard>
          <PreviewImage src={content.media_urls?.[0] || '/images/default-post.jpg'} />
          <PreviewInfo>
            <PreviewTitle>{content.caption || 'Publication'}</PreviewTitle>
            <PreviewType>Publication • {new Date(content.created_at).toLocaleDateString()}</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'video') {
      return (
        <PreviewCard>
          <PreviewImage src={content.thumbnail_url || '/images/default-video.jpg'} />
          <PreviewInfo>
            <PreviewTitle>{content.title || 'Vidéo'}</PreviewTitle>
            <PreviewType>Vidéo • {content.view_count || 0} vues</PreviewType>
          </PreviewInfo>
        </PreviewCard>
      )
    }
    
    if (contentType === 'comment') {
      return (
        <PreviewCard>
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
      
      <Content>
        <Title>Signaler un contenu</Title>
        <Subtitle>
          Votre signalement est anonyme. Nous examinons chaque signalement avec attention.
        </Subtitle>
        
        {getContentPreview()}
        
        <FormGroup>
          <Label>Raison du signalement *</Label>
          <Select
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          >
            <option value="">Sélectionner une raison</option>
            {reportReasons.map(reason => (
              <option key={reason.value} value={reason.value}>{reason.label}</option>
            ))}
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>Détails (optionnel)</Label>
          <TextArea
            placeholder="Décrivez précisément le problème..."
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          />
        </FormGroup>
        
        <Button
          fullWidth
          onClick={handleSubmit}
          loading={loading}
        >
          Envoyer le signalement
        </Button>
      </Content>
    </Container>
  )
}

export default ReportContent
// src/modules/shared/pages/Contact.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { MusicPlayer } from '../components/layout/MusicPlayer'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled(motion.div)`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderSection = styled(motion.div)`
  padding: 20px;
  text-align: center;
  background: linear-gradient(135deg, ${props => props.theme.primary}20, transparent);
`

const Title = styled(motion.h1)`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
`

const Subtitle = styled(motion.p)`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const Form = styled(motion.form)`
  padding: 20px;
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

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
  resize: vertical;
  min-height: 120px;
  
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
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const InfoCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin: 0 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`

const InfoIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: ${props => props.theme.primary}20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`

const InfoContent = styled.div`
  flex: 1;
`

const InfoTitle = styled.h4`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  color: ${props => props.theme.text};
`

const InfoText = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const Contact = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general'
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.message) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          user_id: user?.id,
          email: user?.email,
          subject: formData.subject,
          message: formData.message,
          category: formData.category,
          status: 'pending',
          created_at: new Date().toISOString()
        })
      
      if (error) throw error
      
      toast.success('Message envoyé avec succès !')
      console.log('📧 Message de contact envoyé:', {
        subject: formData.subject,
        category: formData.category,
        userId: user?.id
      })
      navigate(-1)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Erreur lors de l\'envoi du message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Header title="Nous contacter" showBack />
      
      <HeaderSection
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title>Nous contacter</Title>
        <Subtitle>Une question ? Une suggestion ? Écrivez-nous !</Subtitle>
      </HeaderSection>
      
      <InfoCard
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <InfoIcon>📧</InfoIcon>
        <InfoContent>
          <InfoTitle>Réponse rapide</InfoTitle>
          <InfoText>Nous vous répondrons dans les 24-48h ouvrées</InfoText>
        </InfoContent>
      </InfoCard>
      
      <InfoCard
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <InfoIcon>🔒</InfoIcon>
        <InfoContent>
          <InfoTitle>Données sécurisées</InfoTitle>
          <InfoText>Vos informations sont protégées et confidentielles</InfoText>
        </InfoContent>
      </InfoCard>
      
      <Form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onSubmit={handleSubmit}
      >
        <FormGroup
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <Label>Sujet *</Label>
          <Input
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Sujet de votre message"
          />
        </FormGroup>
        
        <FormGroup
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Label>Catégorie</Label>
          <Select
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="general">Question générale</option>
            <option value="support">Support technique</option>
            <option value="bug">Signalement de bug</option>
            <option value="feature">Suggestion de fonctionnalité</option>
            <option value="partnership">Partenariat</option>
          </Select>
        </FormGroup>
        
        <FormGroup
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <Label>Message *</Label>
          <TextArea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Décrivez votre demande..."
          />
        </FormGroup>
        
        <Button
          type="submit"
          fullWidth
          loading={loading}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          Envoyer
        </Button>
      </Form>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Contact
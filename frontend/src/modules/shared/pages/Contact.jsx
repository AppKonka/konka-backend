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

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const Form = styled.form`
  padding: 20px;
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
      navigate(-1)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Erreur lors de l\'envoi du message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Header title="Nous contacter" showBack />
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Sujet *</Label>
          <Input
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Sujet de votre message"
          />
        </FormGroup>
        
        <FormGroup>
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
        
        <FormGroup>
          <Label>Message *</Label>
          <TextArea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Décrivez votre demande..."
          />
        </FormGroup>
        
        <Button type="submit" fullWidth loading={loading}>
          Envoyer
        </Button>
      </Form>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default Contact
// src/modules/seller/pages/SellerSettings.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
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
  min-height: 100px;
  
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

const SellerSettings = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    store_name: '',
    store_description: '',
    store_type: 'individual',
    categories: [],
    address: '',
    phone: ''
  })

  useEffect(() => {
    loadSellerData()
  }, [])

  const loadSellerData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (data) {
        setFormData({
          store_name: data.store_name || '',
          store_description: data.store_description || '',
          store_type: data.store_type || 'individual',
          categories: data.categories || [],
          address: data.address || '',
          phone: data.phone || ''
        })
      }
    } catch (error) {
      console.error('Error loading seller data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('sellers')
        .update({
          store_name: formData.store_name,
          store_description: formData.store_description,
          store_type: formData.store_type,
          categories: formData.categories,
          address: formData.address,
          phone: formData.phone
        })
        .eq('user_id', user.id)
      
      if (error) throw error
      
      toast.success('Paramètres mis à jour')
      navigate('/seller/dashboard')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container>
        <Header title="Paramètres" showBack />
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Paramètres" showBack />
      
      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Nom de la boutique</Label>
          <Input
            name="store_name"
            value={formData.store_name}
            onChange={handleChange}
            placeholder="Nom de votre boutique"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Description</Label>
          <TextArea
            name="store_description"
            value={formData.store_description}
            onChange={handleChange}
            placeholder="Décrivez votre boutique..."
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Type de boutique</Label>
          <Select
            name="store_type"
            value={formData.store_type}
            onChange={handleChange}
          >
            <option value="individual">Particulier</option>
            <option value="professional">Professionnel</option>
            <option value="artisan">Artisan</option>
          </Select>
        </FormGroup>
        
        <FormGroup>
          <Label>Adresse</Label>
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Adresse de la boutique"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Téléphone</Label>
          <Input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Numéro de téléphone"
          />
        </FormGroup>
        
        <Button type="submit" fullWidth loading={saving}>
          Enregistrer
        </Button>
      </Form>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerSettings
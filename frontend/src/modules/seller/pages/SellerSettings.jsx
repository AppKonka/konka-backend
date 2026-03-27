// src/modules/seller/pages/SellerSettings.jsx
import React, { useState, useEffect, useCallback } from 'react'
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

const Container = styled(motion.div)`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const Form = styled(motion.form)`
  padding: 20px;
`

const FormGroup = styled(motion.div)`
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

const CategoriesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`

const CategoryChip = styled(motion.button)`
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.selected ? props.theme.primary : props.theme.border};
  background: ${props => props.selected ? props.theme.primary : props.theme.surface};
  color: ${props => props.selected ? 'white' : props.theme.text};
  font-size: 12px;
  cursor: pointer;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const categoriesList = [
  'Vêtements', 'Chaussures', 'Accessoires', 'Musique', 'Instruments',
  'Artisanat', 'Électronique', 'Livres', 'Sports', 'Maison'
]

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

  const loadSellerData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading seller data:', error)
      }
      
      if (data) {
        setFormData({
          store_name: data.store_name || '',
          store_description: data.store_description || '',
          store_type: data.store_type || 'individual',
          categories: data.categories || [],
          address: data.address || '',
          phone: data.phone || ''
        })
        console.log('🏪 Données vendeur chargées:', {
          storeName: data.store_name,
          storeType: data.store_type,
          categories: data.categories?.length
        })
      }
    } catch (error) {
      console.error('Error loading seller data:', error)
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadSellerData()
  }, [loadSellerData])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleCategoryToggle = (category) => {
    setFormData(prev => {
      const newCategories = prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
      return { ...prev, categories: newCategories }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('sellers')
        .upsert({
          user_id: user.id,
          store_name: formData.store_name,
          store_description: formData.store_description,
          store_type: formData.store_type,
          categories: formData.categories,
          address: formData.address,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (error) throw error
      
      toast.success('Paramètres mis à jour avec succès')
      console.log('✅ Paramètres vendeur sauvegardés:', {
        storeName: formData.store_name,
        storeType: formData.store_type,
        categories: formData.categories.length
      })
      navigate('/seller/dashboard')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  const getStoreTypeLabel = (type) => {
    switch (type) {
      case 'individual': return 'Particulier'
      case 'professional': return 'Professionnel'
      case 'artisan': return 'Artisan'
      default: return 'Particulier'
    }
  }

  if (loading) {
    return (
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Header title="Paramètres boutique" showBack />
        <LoadingSpinner>
          <div>Chargement de votre boutique...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Header title="Paramètres boutique" showBack />
      
      <Form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onSubmit={handleSubmit}
      >
        <FormGroup>
          <Label>Nom de la boutique *</Label>
          <Input
            name="store_name"
            value={formData.store_name}
            onChange={handleChange}
            placeholder="Nom de votre boutique"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Description</Label>
          <TextArea
            name="store_description"
            value={formData.store_description}
            onChange={handleChange}
            placeholder="Décrivez votre boutique, vos produits, votre histoire..."
          />
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            {formData.store_description.length}/500 caractères
          </div>
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
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Type actuel: {getStoreTypeLabel(formData.store_type)}
          </p>
        </FormGroup>
        
        <FormGroup>
          <Label>Catégories de produits</Label>
          <CategoriesContainer>
            {categoriesList.map(cat => (
              <CategoryChip
                key={cat}
                selected={formData.categories.includes(cat)}
                onClick={() => handleCategoryToggle(cat)}
                whileTap={{ scale: 0.95 }}
              >
                {cat}
              </CategoryChip>
            ))}
          </CategoriesContainer>
          <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            {formData.categories.length} catégorie(s) sélectionnée(s)
          </p>
        </FormGroup>
        
        <FormGroup>
          <Label>Adresse</Label>
          <Input
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Adresse complète de votre boutique"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Téléphone</Label>
          <Input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Numéro de téléphone"
            type="tel"
          />
        </FormGroup>
        
        <Button
          type="submit"
          fullWidth
          loading={saving}
          whileTap={{ scale: 0.98 }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </Button>
      </Form>
      
      <MusicPlayer />
      <BottomNavigation />
    </Container>
  )
}

export default SellerSettings
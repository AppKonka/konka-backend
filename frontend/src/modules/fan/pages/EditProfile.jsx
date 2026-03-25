// src/modules/fan/pages/EditProfile.jsx
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { Avatar } from '../../shared/components/ui/Avatar'
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

const AvatarSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
`

const AvatarWrapper = styled.div`
  position: relative;
  margin-bottom: 12px;
`

const ChangeAvatarButton = styled(motion.button)`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CoverSection = styled.div`
  position: relative;
  height: 150px;
  background: ${props => props.theme.border};
  border-radius: 16px;
  margin-bottom: 80px;
  overflow: hidden;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const ChangeCoverButton = styled(motion.button)`
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(0,0,0,0.7);
  border: none;
  color: white;
  font-size: 12px;
  cursor: pointer;
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

const Row = styled.div`
  display: flex;
  gap: 12px;
  
  & > div {
    flex: 1;
  }
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`

const EditProfile = () => {
  const navigate = useNavigate()
  const { userProfile, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    display_name: '',
    username: '',
    bio: '',
    gender: '',
    city: '',
    country: '',
    date_of_birth: '',
  })
  const [avatarFile, setAvatarFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  
  const avatarInputRef = useRef(null)
  const coverInputRef = useRef(null)

  useEffect(() => {
    if (userProfile) {
      setFormData({
        display_name: userProfile.display_name || '',
        username: userProfile.username || '',
        bio: userProfile.bio || '',
        gender: userProfile.gender || '',
        city: userProfile.city || '',
        country: userProfile.country || '',
        date_of_birth: userProfile.date_of_birth ? userProfile.date_of_birth.split('T')[0] : '',
      })
      setAvatarPreview(userProfile.avatar_url)
      setCoverPreview(userProfile.cover_url)
    }
  }, [userProfile])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      const url = URL.createObjectURL(file)
      setAvatarPreview(url)
    }
  }

  const handleCoverChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setCoverFile(file)
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

  const uploadFile = async (file, path) => {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${path}/${userProfile.id}/${fileName}`
    
    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, file)
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      let avatarUrl = avatarPreview
      let coverUrl = coverPreview
      
      // Upload avatar si changé
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile, 'avatars')
      }
      
      // Upload cover si changé
      if (coverFile) {
        coverUrl = await uploadFile(coverFile, 'covers')
      }
      
      // Mettre à jour le profil
      await updateProfile({
        ...formData,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      })
      
      toast.success('Profil mis à jour avec succès')
      navigate('/fan/profile')
      
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erreur lors de la mise à jour')
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

  return (
    <Container>
      <Header title="Modifier profil" showBack />
      
      <Form onSubmit={handleSubmit}>
        <CoverSection>
          {coverPreview && <img src={coverPreview} alt="Cover" />}
          <ChangeCoverButton
            type="button"
            onClick={() => coverInputRef.current.click()}
            whileTap={{ scale: 0.95 }}
          >
            📷 Changer la bannière
          </ChangeCoverButton>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverChange}
          />
        </CoverSection>
        
        <AvatarSection>
          <AvatarWrapper>
            <Avatar
              src={avatarPreview}
              name={formData.display_name}
              size={100}
            />
            <ChangeAvatarButton
              type="button"
              onClick={() => avatarInputRef.current.click()}
              whileTap={{ scale: 0.9 }}
            >
              📷
            </ChangeAvatarButton>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </AvatarWrapper>
        </AvatarSection>
        
        <FormGroup>
          <Label>Nom d'affichage</Label>
          <Input
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            placeholder="Votre nom"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Pseudo</Label>
          <Input
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Votre pseudo unique"
          />
        </FormGroup>
        
        <FormGroup>
          <Label>Bio</Label>
          <TextArea
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Décrivez-vous..."
            maxLength={500}
          />
          <div style={{ fontSize: 12, textAlign: 'right', marginTop: 4, color: '#888' }}>
            {formData.bio.length}/500
          </div>
        </FormGroup>
        
        <Row>
          <FormGroup>
            <Label>Genre</Label>
            <Select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
            >
              <option value="">Non précisé</option>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
              <option value="other">Autre</option>
            </Select>
          </FormGroup>
          
          <FormGroup>
            <Label>Date de naissance</Label>
            <Input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </FormGroup>
        </Row>
        
        <Row>
          <FormGroup>
            <Label>Pays</Label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Votre pays"
            />
          </FormGroup>
          
          <FormGroup>
            <Label>Ville</Label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Votre ville"
            />
          </FormGroup>
        </Row>
        
        <ButtonGroup>
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => navigate('/fan/profile')}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            fullWidth
            loading={loading}
          >
            Enregistrer
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  )
}

export default EditProfile
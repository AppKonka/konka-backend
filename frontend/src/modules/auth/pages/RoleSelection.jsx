// src/modules/auth/pages/RoleSelection.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { useTheme } from '../../shared/context/ThemeContext'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'

const Container = styled.div`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.background};
`

const Header = styled.div`
  text-align: center;
  margin-bottom: 48px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled.p`
  font-size: 16px;
  color: ${props => props.theme.textSecondary};
`

const RolesGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
`

const RoleCard = styled(motion.div)`
  background: ${props => props.selected ? `${props.theme.primary}10` : props.theme.surface};
  border: 2px solid ${props => props.selected ? props.theme.primary : props.theme.border};
  border-radius: 24px;
  padding: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateX(8px);
  }
`

const RoleIcon = styled.div`
  width: 60px;
  height: 60px;
  background: ${props => props.selected ? props.theme.primary : props.theme.border};
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
`

const RoleInfo = styled.div`
  flex: 1;
`

const RoleName = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const RoleDescription = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
`

const roles = [
  {
    id: 'fan',
    name: 'Fan',
    icon: '🎧',
    description: 'Découvre de la musique, rencontre des gens, achète des produits et profite du contenu.',
  },
  {
    id: 'artist',
    name: 'Artiste',
    icon: '🎤',
    description: 'Publie ta musique, interagis avec tes fans, monétise ton contenu et suis tes performances.',
  },
  {
    id: 'seller',
    name: 'Vendeur',
    icon: '🛍️',
    description: 'Vends tes produits, fais des lives, gère tes commandes et développe ton activité.',
  },
]

const RoleSelection = () => {
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const theme = useTheme()
  const { user, updateProfile } = useAuth()

  const handleContinue = async () => {
    if (!selectedRole) return
    
    setLoading(true)
    try {
      // Mettre à jour le rôle dans la base de données
      const { error } = await supabase
        .from('users')
        .update({ role: selectedRole })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Mettre à jour le contexte
      await updateProfile({ role: selectedRole })
      
      // Rediriger vers les pages qui EXISTENT dans l'application
      if (selectedRole === 'fan') {
        navigate('/fan/home')
      } else if (selectedRole === 'artist') {
        navigate('/artist/dashboard')
      } else if (selectedRole === 'seller') {
        navigate('/seller/dashboard')
      }
      
    } catch (error) {
      console.error('Error updating role:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container theme={theme}>
      <Header>
        <Title>Qui es-tu ?</Title>
        <Subtitle>Sélectionne ton profil pour une expérience personnalisée.</Subtitle>
      </Header>

      <RolesGrid>
        {roles.map((role) => (
          <RoleCard
            key={role.id}
            selected={selectedRole === role.id}
            onClick={() => setSelectedRole(role.id)}
            theme={theme}
            whileTap={{ scale: 0.98 }}
          >
            <RoleIcon selected={selectedRole === role.id} theme={theme}>
              {role.icon}
            </RoleIcon>
            <RoleInfo>
              <RoleName theme={theme}>{role.name}</RoleName>
              <RoleDescription theme={theme}>{role.description}</RoleDescription>
            </RoleInfo>
          </RoleCard>
        ))}
      </RolesGrid>

      <Button
        fullWidth
        disabled={!selectedRole || loading}
        onClick={handleContinue}
      >
        {loading ? 'Chargement...' : 'Continuer'}
      </Button>
    </Container>
  )
}

export default RoleSelection
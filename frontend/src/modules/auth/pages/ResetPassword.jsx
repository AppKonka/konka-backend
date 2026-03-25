// src/modules/auth/pages/ResetPassword.jsx
import React, { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { supabase } from '../../../config/supabase'
import { useTheme } from '../../shared/context/ThemeContext'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.background};
  display: flex;
  flex-direction: column;
`

const BackButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-bottom: 40px;
  color: ${props => props.theme.text};
`

const Logo = styled.div`
  text-align: center;
  margin-bottom: 48px;
  
  h1 {
    font-size: 42px;
    font-weight: 800;
    background: linear-gradient(135deg, #FF6B35, #FF4D1E);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`

const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  margin-bottom: 32px;
`

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`

const ResetPassword = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    
    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setSuccess(true)
      toast.success('Mot de passe réinitialisé avec succès')
      setTimeout(() => navigate('/login'), 3000)
    } catch (error) {
      console.error('Error resetting password:', error)
      toast.error(error.message || 'Erreur lors de la réinitialisation')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Container theme={theme}>
        <BackButton onClick={() => navigate('/login')}>←</BackButton>
        <Logo><h1>KONKA</h1></Logo>
        <Title>Lien invalide</Title>
        <Subtitle>Le lien de réinitialisation est invalide ou a expiré.</Subtitle>
        <Button onClick={() => navigate('/forgot-password')}>
          Demander un nouveau lien
        </Button>
      </Container>
    )
  }

  return (
    <Container theme={theme}>
      <BackButton onClick={() => navigate('/login')}>←</BackButton>
      
      <Logo>
        <h1>KONKA</h1>
      </Logo>
      
      <Title>Nouveau mot de passe</Title>
      <Subtitle>Créez un nouveau mot de passe sécurisé</Subtitle>
      
      {!success ? (
        <Form onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon="🔒"
          />
          
          <Input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon="🔒"
          />
          
          <Button type="submit" fullWidth loading={loading}>
            Réinitialiser
          </Button>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <p>Votre mot de passe a été réinitialisé avec succès !</p>
          <p style={{ fontSize: 14, marginTop: 8, color: '#888' }}>
            Redirection vers la page de connexion...
          </p>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Link to="/login" style={{ color: theme.colors.primary }}>
          Retour à la connexion
        </Link>
      </div>
    </Container>
  )
}

export default ResetPassword
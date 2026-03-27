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

const Container = styled(motion.div)`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.background};
  display: flex;
  flex-direction: column;
`

const BackButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-bottom: 40px;
  color: ${props => props.theme.text};
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  
  &:hover {
    background: ${props => props.theme.border}40;
  }
`

const Logo = styled(motion.div)`
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

const Title = styled(motion.h2)`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  text-align: center;
  color: ${props => props.theme.text};
`

const Subtitle = styled(motion.p)`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  margin-bottom: 32px;
`

const Form = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`

const SuccessContainer = styled(motion.div)`
  text-align: center;
  padding: 30px 20px;
  background: ${props => props.theme.surface};
  border-radius: 24px;
  margin: 20px 0;
`

const IconWrapper = styled(motion.div)`
  font-size: 64px;
  margin-bottom: 20px;
`

const LinkContainer = styled(motion.div)`
  text-align: center;
  margin-top: 24px;
  
  a {
    color: ${props => props.theme.primary};
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

const InvalidContainer = styled(motion.div)`
  text-align: center;
  padding: 40px 20px;
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
      <Container
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        theme={theme}
      >
        <BackButton
          onClick={() => navigate('/login')}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          theme={theme}
        >
          ←
        </BackButton>
        
        <Logo
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>KONKA</h1>
        </Logo>
        
        <InvalidContainer
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
          <Title>Lien invalide</Title>
          <Subtitle>Le lien de réinitialisation est invalide ou a expiré.</Subtitle>
          <Button
            onClick={() => navigate('/forgot-password')}
            whileTap={{ scale: 0.98 }}
            style={{ marginTop: 24 }}
          >
            Demander un nouveau lien
          </Button>
        </InvalidContainer>
      </Container>
    )
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      theme={theme}
    >
      <BackButton
        onClick={() => navigate('/login')}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        theme={theme}
      >
        ←
      </BackButton>
      
      <Logo
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>KONKA</h1>
      </Logo>
      
      <Title
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Nouveau mot de passe
      </Title>
      
      <Subtitle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Créez un nouveau mot de passe sécurisé
      </Subtitle>
      
      {!success ? (
        <Form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSubmit}
        >
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
          
          <Button
            type="submit"
            fullWidth
            loading={loading}
            whileTap={{ scale: 0.98 }}
          >
            Réinitialiser
          </Button>
        </Form>
      ) : (
        <SuccessContainer
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 300 }}
        >
          <IconWrapper
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            ✅
          </IconWrapper>
          <p style={{ marginBottom: 8, fontSize: 16 }}>
            Votre mot de passe a été réinitialisé avec succès !
          </p>
          <p style={{ fontSize: 14, color: '#888' }}>
            Redirection vers la page de connexion...
          </p>
        </SuccessContainer>
      )}
      
      <LinkContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Link to="/login" style={{ color: theme.colors.primary }}>
          Retour à la connexion
        </Link>
      </LinkContainer>
    </Container>
  )
}

export default ResetPassword
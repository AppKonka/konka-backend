// src/modules/auth/pages/ForgotPassword.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useAuth } from '../../shared/context/AuthContext'
import { useTheme } from '../../shared/context/ThemeContext'
import { toast } from 'react-hot-toast'

const Container = styled.div`
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
  padding: 20px;
  background: ${props => props.theme.surface};
  border-radius: 24px;
  margin: 20px 0;
`

const IconWrapper = styled(motion.div)`
  font-size: 64px;
  margin-bottom: 16px;
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

const ForgotPassword = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const { resetPassword } = useAuth()
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Veuillez entrer votre email')
      return
    }
    
    setLoading(true)
    const result = await resetPassword(email)
    if (result.success) {
      setSent(true)
      toast.success('Email de réinitialisation envoyé !')
    }
    setLoading(false)
  }

  const handleBack = () => {
    navigate('/login')
  }

  return (
    <Container theme={theme}>
      <BackButton
        onClick={handleBack}
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
        Mot de passe oublié ?
      </Title>
      
      <Subtitle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe
      </Subtitle>
      
      {!sent ? (
        <Form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          onSubmit={handleSubmit}
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon="📧"
          />
          
          <Button
            type="submit"
            fullWidth
            loading={loading}
            whileTap={{ scale: 0.98 }}
          >
            Envoyer
          </Button>
        </Form>
      ) : (
        <SuccessContainer
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <IconWrapper
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            📧
          </IconWrapper>
          <p style={{ marginBottom: 8 }}>
            Un email de réinitialisation a été envoyé à <strong>{email}</strong>
          </p>
          <p style={{ fontSize: 14, color: '#888' }}>
            Vérifiez votre boîte de réception et vos spams
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            style={{ marginTop: 24 }}
            whileTap={{ scale: 0.98 }}
          >
            Retour à la connexion
          </Button>
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

export default ForgotPassword
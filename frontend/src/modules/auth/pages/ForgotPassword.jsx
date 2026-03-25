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
    }
    setLoading(false)
  }

  return (
    <Container theme={theme}>
      <BackButton onClick={() => navigate('/login')} theme={theme}>
        ←
      </BackButton>
      
      <Logo>
        <h1>KONKA</h1>
      </Logo>
      
      <Title>Mot de passe oublié ?</Title>
      <Subtitle>
        Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe
      </Subtitle>
      
      {!sent ? (
        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon="📧"
          />
          
          <Button type="submit" fullWidth loading={loading}>
            Envoyer
          </Button>
        </Form>
      ) : (
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <p>Un email de réinitialisation a été envoyé à <strong>{email}</strong></p>
          <p style={{ fontSize: 14, marginTop: 8, color: '#888' }}>
            Vérifiez votre boîte de réception et vos spams
          </p>
          <Button
            variant="outline"
            onClick={() => navigate('/login')}
            style={{ marginTop: 24 }}
          >
            Retour à la connexion
          </Button>
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

export default ForgotPassword
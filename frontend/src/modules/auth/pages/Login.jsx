// src/modules/auth/pages/Login.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useTheme } from '../../shared/context/ThemeContext'
import { useAuth } from '../../shared/context/AuthContext'
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

const ForgotPassword = styled(motion.div)`
  text-align: right;
  margin-top: 8px;
  
  a {
    color: ${props => props.theme.primary};
    text-decoration: none;
    font-size: 14px;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

const RememberMe = styled(motion.label)`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  
  span {
    font-size: 14px;
    color: ${props => props.theme.textSecondary};
  }
`

const RegisterLink = styled(motion.p)`
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  
  a {
    color: ${props => props.theme.primary};
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

const Divider = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 24px 0;
  
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${props => props.theme.border};
  }
  
  span {
    color: ${props => props.theme.textSecondary};
    font-size: 14px;
  }
`

const SocialButtons = styled(motion.div)`
  display: flex;
  gap: 16px;
  
  button {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    cursor: pointer;
    font-size: 20px;
    transition: all 0.2s ease;
    
    &:hover {
      transform: translateY(-2px);
      background: ${props => props.theme.border}40;
    }
  }
`

const Login = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const { login } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) newErrors.email = 'Email requis'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalide'
    
    if (!formData.password) newErrors.password = 'Mot de passe requis'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success('Connexion réussie !')
      // La redirection se fait automatiquement via le contexte
    } else {
      toast.error(result.error || 'Erreur de connexion')
    }
    
    setLoading(false)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    })
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' })
    }
  }

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`)
    toast.info(`Connexion avec ${provider} (bientôt disponible)`)
  }

  return (
    <Container theme={theme}>
      <BackButton
        onClick={() => navigate('/')}
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
        Bon retour
      </Title>
      
      <Subtitle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Connecte-toi pour retrouver ta communauté
      </Subtitle>
      
      <Form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onSubmit={handleSubmit}
      >
        <Input
          type="email"
          name="email"
          placeholder="Email, téléphone ou pseudo"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          icon="📧"
        />
        
        <Input
          type="password"
          name="password"
          placeholder="Mot de passe"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          icon="🔒"
        />
        
        <ForgotPassword
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          theme={theme}
        >
          <Link to="/forgot-password">Mot de passe oublié ?</Link>
        </ForgotPassword>
        
        <RememberMe
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <input
            type="checkbox"
            name="rememberMe"
            checked={formData.rememberMe}
            onChange={handleChange}
          />
          <span>Se souvenir de moi</span>
        </RememberMe>
        
        <Button
          type="submit"
          fullWidth
          loading={loading}
          whileTap={{ scale: 0.98 }}
        >
          Se connecter
        </Button>
      </Form>
      
      <Divider
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        theme={theme}
      >
        <span>ou</span>
      </Divider>
      
      <SocialButtons
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        theme={theme}
      >
        <button onClick={() => handleSocialLogin('apple')} whileTap={{ scale: 0.95 }}>
          🍎
        </button>
        <button onClick={() => handleSocialLogin('google')} whileTap={{ scale: 0.95 }}>
          G
        </button>
        <button onClick={() => handleSocialLogin('facebook')} whileTap={{ scale: 0.95 }}>
          f
        </button>
      </SocialButtons>
      
      <RegisterLink
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        theme={theme}
      >
        Pas encore de compte ? <Link to="/register">S'inscrire</Link>
      </RegisterLink>
    </Container>
  )
}

export default Login
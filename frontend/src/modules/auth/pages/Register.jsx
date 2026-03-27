// src/modules/auth/pages/Register.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useTheme } from '../../shared/context/ThemeContext'
import { useAuth } from '../../shared/context/AuthContext'
import { toast } from 'react-hot-toast'

const Container = styled(motion.div)`
  min-height: 100vh;
  padding: 40px 20px;
  background: ${props => props.theme.background};
`

const BackButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-bottom: 24px;
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

const Title = styled(motion.h1)`
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled(motion.p)`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 32px;
`

const Form = styled(motion.form)`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
`

const TermsText = styled(motion.p)`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  text-align: center;
  margin-top: 16px;
  
  a {
    color: ${props => props.theme.primary};
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`

const LoginLink = styled(motion.p)`
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

const GenderSelect = styled(motion.select)`
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${props => props.error ? '#FF4444' : props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const ErrorText = styled(motion.span)`
  color: #FF4444;
  font-size: 12px;
  margin-top: 4px;
  display: block;
`

const Register = () => {
  const navigate = useNavigate()
  const theme = useTheme()
  const { register } = useAuth()
  
  const [searchParams] = useSearchParams()
  const role = searchParams.get('role')
  
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    username: '',
    displayName: '',
    dateOfBirth: '',
    gender: '',
    country: '',
    city: '',
  })
  
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Si aucun rôle n'est spécifié, rediriger vers le choix du rôle
  useEffect(() => {
    if (!role) {
      toast.error('Veuillez d\'abord choisir un rôle')
      navigate('/role-selection')
    }
  }, [role, navigate])

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email) newErrors.email = 'Email requis'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email invalide'
    
    if (!formData.phone) newErrors.phone = 'Numéro de téléphone requis'
    
    if (!formData.password) newErrors.password = 'Mot de passe requis'
    else if (formData.password.length < 8) newErrors.password = '8 caractères minimum'
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Doit contenir une majuscule'
    else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Doit contenir un chiffre'
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }
    
    if (!formData.username) newErrors.username = 'Pseudo requis'
    else if (formData.username.length < 3) newErrors.username = '3 caractères minimum'
    
    if (!formData.displayName) newErrors.displayName = 'Nom requis'
    
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date de naissance requise'
    
    if (!formData.gender) newErrors.gender = 'Genre requis'
    
    if (!formData.country) newErrors.country = 'Pays requis'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    
    const result = await register(formData.email, formData.password, {
      username: formData.username,
      displayName: formData.displayName,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      country: formData.country,
      city: formData.city,
      role: role,
    })
    
    if (result.success) {
      toast.success('Inscription réussie !')
      navigate('/role-selection')
    } else {
      toast.error(result.error || 'Erreur lors de l\'inscription')
    }
    
    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: '',
      })
    }
  }

  const roleLabel = role === 'fan' ? 'Fan' : role === 'artist' ? 'Artiste' : 'Vendeur'

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      theme={theme}
    >
      <BackButton
        onClick={() => navigate('/')}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.05 }}
        theme={theme}
      >
        ←
      </BackButton>
      
      <Title
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Créer un compte {role && `en tant que ${roleLabel}`}
      </Title>
      
      <Subtitle
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Rejoins la communauté Konka
      </Subtitle>
      
      <Form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        onSubmit={handleSubmit}
      >
        <Input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          icon="📧"
        />
        
        <Input
          type="tel"
          name="phone"
          placeholder="Numéro de téléphone"
          value={formData.phone}
          onChange={handleChange}
          error={errors.phone}
          icon="📱"
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
        
        <Input
          type="password"
          name="confirmPassword"
          placeholder="Confirmer le mot de passe"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          icon="🔒"
        />
        
        <Input
          type="text"
          name="username"
          placeholder="Pseudo"
          value={formData.username}
          onChange={handleChange}
          error={errors.username}
          icon="👤"
        />
        
        <Input
          type="text"
          name="displayName"
          placeholder="Nom complet"
          value={formData.displayName}
          onChange={handleChange}
          error={errors.displayName}
          icon="✍️"
        />
        
        <Input
          type="date"
          name="dateOfBirth"
          placeholder="Date de naissance"
          value={formData.dateOfBirth}
          onChange={handleChange}
          error={errors.dateOfBirth}
          icon="🎂"
        />
        
        <GenderSelect
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          error={errors.gender}
          theme={theme}
          whileTap={{ scale: 0.99 }}
        >
          <option value="">Genre</option>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
          <option value="other">Autre</option>
          <option value="prefer_not">Non précisé</option>
        </GenderSelect>
        {errors.gender && (
          <ErrorText
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errors.gender}
          </ErrorText>
        )}
        
        <Input
          type="text"
          name="country"
          placeholder="Pays"
          value={formData.country}
          onChange={handleChange}
          error={errors.country}
          icon="🌍"
        />
        
        <Input
          type="text"
          name="city"
          placeholder="Ville"
          value={formData.city}
          onChange={handleChange}
          icon="📍"
        />
        
        <Button
          type="submit"
          fullWidth
          loading={loading}
          whileTap={{ scale: 0.98 }}
        >
          S'inscrire
        </Button>
      </Form>
      
      <TermsText
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        theme={theme}
      >
        En créant un compte, vous acceptez nos{' '}
        <Link to="/terms">Conditions d'utilisation</Link> et notre{' '}
        <Link to="/privacy">Politique de confidentialité</Link>
      </TermsText>
      
      <LoginLink
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        theme={theme}
      >
        Déjà un compte ? <Link to="/login">Se connecter</Link>
      </LoginLink>
    </Container>
  )
}

export default Register
// src/modules/shared/components/layout/Header.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const HeaderContainer = styled(motion.header)`
  position: sticky;
  top: 0;
  z-index: 50;
  background: ${props => props.theme.background};
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${props => props.theme.border};
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Title = styled.h1`
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const IconButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.text};
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: ${props => props.theme.border}40;
  }
`

export const Header = ({ title, showBack, showProfile, onBack }) => {
  const navigate = useNavigate()
  const { userProfile, logout } = useAuth()
  const { toggleTheme, isDark } = useTheme()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  const handleProfile = () => {
    navigate('/fan/profile')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <HeaderContainer
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <LeftSection>
        {showBack && (
          <IconButton onClick={handleBack} whileTap={{ scale: 0.9 }}>
            ←
          </IconButton>
        )}
        <Title>{title || 'KONKA'}</Title>
      </LeftSection>
      
      <RightSection>
        <IconButton onClick={toggleTheme} whileTap={{ scale: 0.9 }}>
          {isDark ? '☀️' : '🌙'}
        </IconButton>
        <IconButton onClick={handleLogout} whileTap={{ scale: 0.9 }} title="Se déconnecter">
          🚪
        </IconButton>
        {showProfile && userProfile && (
          <Avatar
            src={userProfile.avatar_url}
            name={userProfile.display_name}
            size={36}
            onClick={handleProfile}
          />
        )}
      </RightSection>
    </HeaderContainer>
  )
}
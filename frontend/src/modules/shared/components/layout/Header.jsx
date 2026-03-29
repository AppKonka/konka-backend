// src/modules/shared/components/layout/Header.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { SearchBar } from '../SearchBar'

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

// Composants pour le modal de recherche
const SearchModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.theme.background}CC;
  backdrop-filter: blur(5px);
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 80px 20px;
`

const SearchModalContainer = styled.div`
  width: 100%;
  max-width: 600px;
  background: ${props => props.theme.surface};
  border-radius: 24px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
`

export const Header = ({ title, showBack, showProfile, onBack }) => {
  const navigate = useNavigate()
  const { userProfile, logout } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const [showSearch, setShowSearch] = useState(false)

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
    <>
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
          <IconButton onClick={() => setShowSearch(true)} whileTap={{ scale: 0.9 }} title="Rechercher">
            🔍
          </IconButton>
          <IconButton onClick={toggleTheme} whileTap={{ scale: 0.9 }} title="Changer le thème">
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
      
      <AnimatePresence>
        {showSearch && (
          <SearchModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSearch(false)}
          >
            <SearchModalContainer onClick={(e) => e.stopPropagation()}>
              <SearchBar onClose={() => setShowSearch(false)} />
            </SearchModalContainer>
          </SearchModalOverlay>
        )}
      </AnimatePresence>
    </>
  )
}
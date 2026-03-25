// src/modules/shared/components/layout/BottomNavigation.jsx
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

const NavContainer = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.surface};
  backdrop-filter: blur(10px);
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 8px 16px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  z-index: 100;
`

const NavItem = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  font-size: 12px;
  font-weight: 500;
`

const IconWrapper = styled.div`
  font-size: 24px;
`

export const BottomNavigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userRole } = useAuth()

  const getNavItems = () => {
    switch (userRole) {
      case 'fan':
        return [
          { path: '/fan/home', icon: '🏠', label: 'Accueil' },
          { path: '/fan/shopping', icon: '🛍️', label: 'Shopping' },
          { path: '/fan/discover', icon: '✨', label: 'Publier' },
          { path: '/fan/messages', icon: '💬', label: 'Rencontre' },
          { path: '/fan/music', icon: '🎵', label: 'Musique' },
        ]
      case 'artist':
        return [
          { path: '/artist/dashboard', icon: '🏠', label: 'Accueil' },
          { path: '/fan/shopping', icon: '🛍️', label: 'Shopping' },
          { path: '/fan/discover', icon: '✨', label: 'Publier' },
          { path: '/fan/music', icon: '🎵', label: 'Musique' },
          { path: '/artist/dashboard', icon: '📊', label: 'Tableau' },
        ]
      case 'seller':
        return [
          { path: '/fan/home', icon: '🏠', label: 'Accueil' },
          { path: '/seller/dashboard', icon: '🛍️', label: 'Shopping' },
          { path: '/fan/discover', icon: '✨', label: 'Publier' },
          { path: '/fan/messages', icon: '💬', label: 'Messages' },
          { path: '/seller/dashboard', icon: '📦', label: 'Espace' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  return (
    <NavContainer
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {navItems.map((item) => (
        <NavItem
          key={item.path}
          active={location.pathname === item.path}
          onClick={() => navigate(item.path)}
          whileTap={{ scale: 0.9 }}
        >
          <IconWrapper>{item.icon}</IconWrapper>
          <span>{item.label}</span>
        </NavItem>
      ))}
    </NavContainer>
  )
}
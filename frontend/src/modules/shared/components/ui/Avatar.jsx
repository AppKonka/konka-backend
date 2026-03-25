// src/modules/shared/components/ui/Avatar.jsx
import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const AvatarContainer = styled(motion.div)`
  position: relative;
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  overflow: hidden;
  background: ${props => props.theme.border};
`

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const Initials = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.size / 2.5}px;
  font-weight: 600;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  color: white;
`

const Badge = styled.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: ${props => props.size / 3}px;
  height: ${props => props.size / 3}px;
  border-radius: 50%;
  background: ${props => props.bg};
  border: 2px solid ${props => props.theme.background};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.size / 4}px;
`

const Status = styled.div`
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: ${props => props.size / 4}px;
  height: ${props => props.size / 4}px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'online': return '#00C851'
      case 'away': return '#FFB444'
      case 'busy': return '#FF4444'
      default: return '#A0A0A0'
    }
  }};
  border: 2px solid ${props => props.theme.background};
`

export const Avatar = ({
  src,
  name,
  size = 48,
  badge,
  status,
  onClick,
  ...props
}) => {
  const getInitials = () => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <AvatarContainer
      size={size}
      onClick={onClick}
      whileTap={onClick ? { scale: 0.95 } : {}}
      {...props}
    >
      {src ? (
        <Image src={src} alt={name} />
      ) : (
        <Initials size={size}>{getInitials()}</Initials>
      )}
      {badge && (
        <Badge size={size} bg={badge.bg}>
          {badge.icon}
        </Badge>
      )}
      {status && <Status size={size} status={status} />}
    </AvatarContainer>
  )
}
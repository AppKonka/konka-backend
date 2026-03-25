// src/modules/shared/components/ui/Button.jsx
import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const StyledButton = styled(motion.button)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.size === 'small' ? '8px 16px' : props.size === 'large' ? '14px 28px' : '10px 20px'};
  border-radius: 12px;
  font-size: ${props => props.size === 'small' ? '14px' : props.size === 'large' ? '18px' : '16px'};
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(135deg, #FF6B35, #FF4D1E);
    color: white;
    &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(255, 77, 30, 0.3); }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: ${props.theme.surface};
    color: ${props.theme.text};
    border: 1px solid ${props.theme.border};
    &:hover { background: ${props.theme.hover}; }
  `}
  
  ${props => props.variant === 'outline' && `
    background: transparent;
    color: ${props.theme.primary};
    border: 1px solid ${props.theme.primary};
    &:hover { background: ${props.theme.primary}10; }
  `}
  
  ${props => props.disabled && `
    opacity: 0.5;
    cursor: not-allowed;
    &:hover { transform: none; }
  `}
`

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  disabled = false,
  onClick,
  loading = false,
  ...props 
}) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {loading ? (
        <span>Chargement...</span>
      ) : children}
    </StyledButton>
  )
}
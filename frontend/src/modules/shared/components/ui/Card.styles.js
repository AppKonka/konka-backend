// src/modules/shared/components/ui/Card.styles.js
import styled from 'styled-components'
import { motion } from 'framer-motion'

export const CardContainer = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  overflow: hidden;
  box-shadow: ${props => props.theme.shadow.sm};
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: ${props => props.theme.shadow.lg};
  }
`

export const CardImage = styled.img`
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
`

export const CardContent = styled.div`
  padding: 16px;
`

export const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

export const CardSubtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

export const CardFooter = styled.div`
  padding: 12px 16px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`
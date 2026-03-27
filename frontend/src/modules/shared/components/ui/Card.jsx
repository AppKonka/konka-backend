// src/modules/shared/components/ui/Card.jsx
import React from 'react'
import {
  CardContainer,
  CardImage,
  CardContent,
  CardTitle,
  CardSubtitle,
  CardFooter
} from './Card.styles'

export const Card = ({ children, onClick, ...props }) => {
  return (
    <CardContainer
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : {}}
      {...props}
    >
      {children}
    </CardContainer>
  )
}

// Ré-exporter les composants stylisés pour compatibilité
export { CardImage, CardContent, CardTitle, CardSubtitle, CardFooter }
// src/modules/shared/components/ui/Loader.jsx
import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.fullScreen ? '100vh' : '100%'};
  width: 100%;
  background: ${props => props.theme.background};
`

const Spinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid ${props => props.theme.border};
  border-top-color: ${props => props.theme.primary};
  border-radius: 50%;
`

export const Loader = ({ fullScreen = false }) => {
  return (
    <Container fullScreen={fullScreen}>
      <Spinner
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </Container>
  )
}
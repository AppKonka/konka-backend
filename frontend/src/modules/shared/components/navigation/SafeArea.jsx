// src/modules/shared/components/navigation/SafeArea.jsx
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const SafeAreaContainer = styled.div`
  width: 100%;
  min-height: 100vh;
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  position: relative;
  
  /* Support pour les encoches iOS */
  @supports (padding: max(0px)) {
    padding-top: max(env(safe-area-inset-top), ${props => props.paddingTop || '0px'});
    padding-bottom: max(env(safe-area-inset-bottom), ${props => props.paddingBottom || '0px'});
    padding-left: max(env(safe-area-inset-left), ${props => props.paddingLeft || '0px'});
    padding-right: max(env(safe-area-inset-right), ${props => props.paddingRight || '0px'});
  }
`

const Content = styled.div`
  max-width: 480px;
  margin: 0 auto;
  position: relative;
  min-height: 100vh;
`

export const SafeArea = ({ 
  children, 
  paddingTop = '0px', 
  paddingBottom = '0px',
  paddingLeft = '0px',
  paddingRight = '0px',
  ...props 
}) => {
  const [insets, setInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 })

  useEffect(() => {
    // Détecter les safe areas sur iOS
    const updateInsets = () => {
      const style = getComputedStyle(document.documentElement)
      const newInsets = {
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      }
      setInsets(newInsets)
      
      // Ajouter des classes CSS personnalisées en fonction des insets
      if (newInsets.top > 0) {
        document.documentElement.classList.add('has-notch')
      } else {
        document.documentElement.classList.remove('has-notch')
      }
      
      console.log('📱 SafeArea insets détectés:', newInsets)
    }

    updateInsets()
    window.addEventListener('resize', updateInsets)
    
    // Appliquer les insets comme variables CSS personnalisées
    const applyInsetsAsCSSVariables = () => {
      document.documentElement.style.setProperty('--safe-area-inset-top', `${insets.top}px`)
      document.documentElement.style.setProperty('--safe-area-inset-bottom', `${insets.bottom}px`)
      document.documentElement.style.setProperty('--safe-area-inset-left', `${insets.left}px`)
      document.documentElement.style.setProperty('--safe-area-inset-right', `${insets.right}px`)
    }
    
    applyInsetsAsCSSVariables()
    
    return () => {
      window.removeEventListener('resize', updateInsets)
      document.documentElement.classList.remove('has-notch')
      document.documentElement.style.removeProperty('--safe-area-inset-top')
      document.documentElement.style.removeProperty('--safe-area-inset-bottom')
      document.documentElement.style.removeProperty('--safe-area-inset-left')
      document.documentElement.style.removeProperty('--safe-area-inset-right')
    }
  }, [insets.top, insets.bottom, insets.left, insets.right])

  // Calculer le padding total en fonction des insets et des props
  const computedPaddingTop = `max(${insets.top}px, ${paddingTop})`
  const computedPaddingBottom = `max(${insets.bottom}px, ${paddingBottom})`
  const computedPaddingLeft = `max(${insets.left}px, ${paddingLeft})`
  const computedPaddingRight = `max(${insets.right}px, ${paddingRight})`

  return (
    <SafeAreaContainer
      paddingTop={computedPaddingTop}
      paddingBottom={computedPaddingBottom}
      paddingLeft={computedPaddingLeft}
      paddingRight={computedPaddingRight}
      {...props}
    >
      <Content>
        {children}
      </Content>
    </SafeAreaContainer>
  )
}
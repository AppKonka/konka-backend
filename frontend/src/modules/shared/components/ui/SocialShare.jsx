// frontend/src/modules/shared/components/ui/SocialShare.jsx
import React from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Container = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${props => props.theme.surface};
  border-radius: 20px 20px 0 0;
  padding: 20px;
  z-index: 1000;
`

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
`

const ShareGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
`

const ShareOption = styled(motion.button)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  
  .icon {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    background: ${props => props.bg};
  }
  
  .label {
    font-size: 12px;
    color: ${props => props.theme.textSecondary};
  }
`

const CloseButton = styled(motion.button)`
  width: 100%;
  padding: 12px;
  border-radius: 24px;
  border: none;
  background: ${props => props.theme.border};
  color: ${props => props.theme.text};
  font-size: 16px;
  cursor: pointer;
`

const shareOptions = [
  { id: 'facebook', label: 'Facebook', icon: '📘', bg: '#1877F2', url: 'https://www.facebook.com/sharer/sharer.php?u=' },
  { id: 'twitter', label: 'Twitter', icon: '🐦', bg: '#1DA1F2', url: 'https://twitter.com/intent/tweet?url=' },
  { id: 'instagram', label: 'Instagram', icon: '📷', bg: '#E4405F', url: 'instagram://' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', bg: '#25D366', url: 'https://wa.me/?text=' },
  { id: 'messenger', label: 'Messenger', icon: '💬', bg: '#00B2FF', url: 'fb-messenger://share?link=' },
  { id: 'telegram', label: 'Telegram', icon: '✈️', bg: '#26A5E4', url: 'https://t.me/share/url?url=' },
  { id: 'linkedin', label: 'LinkedIn', icon: '🔗', bg: '#0077B5', url: 'https://www.linkedin.com/shareArticle?url=' },
  { id: 'copy', label: 'Copier lien', icon: '📋', bg: '#6C757D', url: null }
]

export const SocialShare = ({ url, title, description, onClose }) => {
  const share = (option) => {
    if (option.id === 'copy') {
      navigator.clipboard.writeText(url)
      alert('Lien copié dans le presse-papier')
      onClose()
      return
    }
    
    let shareUrl = option.url + encodeURIComponent(url)
    
    if (option.id === 'twitter') {
      shareUrl += `&text=${encodeURIComponent(title)}`
    }
    
    if (option.id === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    }
    
    if (option.id === 'linkedin') {
      shareUrl = `https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description || '')}`
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer')
    onClose()
  }

  return (
    <Container
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25 }}
    >
      <Title>Partager</Title>
      <ShareGrid>
        {shareOptions.map(option => (
          <ShareOption
            key={option.id}
            onClick={() => share(option)}
            whileTap={{ scale: 0.95 }}
          >
            <div className="icon" style={{ background: option.bg }}>
              {option.icon}
            </div>
            <span className="label">{option.label}</span>
          </ShareOption>
        ))}
      </ShareGrid>
      <CloseButton onClick={onClose} whileTap={{ scale: 0.95 }}>
        Annuler
      </CloseButton>
    </Container>
  )
}
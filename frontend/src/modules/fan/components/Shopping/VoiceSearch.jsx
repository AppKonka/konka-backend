// src/modules/fan/components/Shopping/VoiceSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const WaveContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 40px;
`

const WaveBar = styled(motion.div)`
  width: 8px;
  height: ${props => props.height}px;
  background: ${props => props.theme.primary};
  border-radius: 4px;
`

const MicIcon = styled(motion.div)`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background: ${props => props.theme.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin-bottom: 40px;
  cursor: pointer;
`

const TextDisplay = styled.div`
  color: white;
  font-size: 24px;
  text-align: center;
  padding: 0 40px;
  margin-bottom: 40px;
`

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 40px;
  right: 20px;
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const VoiceSearch = ({ onResult, onClose }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef(null)

  const extractKeywords = useCallback((text) => {
    const categories = {
      clothing: ['vêtement', 'tee-shirt', 'pantalon', 'jean', 'robe', 'chemise', 'pull', 'veste', 'manteau'],
      shoes: ['chaussure', 'basket', 'sandale', 'botte', 'talon', 'escarpin'],
      music: ['disque', 'vinyle', 'album', 'cd', 'morceau', 'musique'],
      instruments: ['guitare', 'piano', 'batterie', 'violon', 'saxophone', 'trompette'],
      electronics: ['téléphone', 'casque', 'enceinte', 'ordinateur', 'tablette'],
      accessories: ['accessoire', 'sac', 'montre', 'bijou', 'ceinture', 'chapeau']
    }
    
    const lowerText = text.toLowerCase()
    let category = null
    
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lowerText.includes(k))) {
        category = cat
        break
      }
    }
    
    return {
      original: text,
      category,
      keywords: text.split(' ').filter(w => w.length > 2)
    }
  }, [])

  const processVoiceInput = useCallback(async (text) => {
    setIsProcessing(true)
    
    try {
      // Analyser le texte pour extraire les mots-clés
      const keywords = extractKeywords(text)
      onResult?.(keywords, text)
      
      setTranscript(`Recherche: "${text}"`)
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('Error processing voice input:', error)
      setTranscript('Erreur lors du traitement')
      setTimeout(() => onClose(), 1500)
    } finally {
      setIsProcessing(false)
    }
  }, [extractKeywords, onResult, onClose])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  useEffect(() => {
    // Initialiser la reconnaissance vocale
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'fr-FR'
      recognitionRef.current.interimResults = true
      recognitionRef.current.continuous = false
      
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setTranscript('')
      }
      
      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        setTranscript(transcriptText)
        
        if (event.results[current].isFinal) {
          processVoiceInput(transcriptText)
        }
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
        setTranscript('Erreur de reconnaissance')
        setTimeout(() => handleClose(), 1500)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [processVoiceInput, handleClose])

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    } else {
      setTranscript('Reconnaissance vocale non supportée')
      setTimeout(() => handleClose(), 1500)
    }
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <CloseButton onClick={handleClose} whileTap={{ scale: 0.9 }}>
        ✕
      </CloseButton>
      
      {!isListening && !isProcessing && (
        <MicIcon
          onClick={startListening}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          🎙️
        </MicIcon>
      )}
      
      {(isListening || isProcessing) && (
        <>
          <WaveContainer>
            {[...Array(5)].map((_, i) => (
              <WaveBar
                key={i}
                height={20 + Math.sin(Date.now() / 200 + i) * 20}
                animate={{
                  height: isListening ? [20, 60, 20] : 20,
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </WaveContainer>
          
          <TextDisplay>
            {isListening ? (
              transcript || "Parlez maintenant..."
            ) : (
              "Traitement en cours..."
            )}
          </TextDisplay>
        </>
      )}
    </Container>
  )
}

export default VoiceSearch
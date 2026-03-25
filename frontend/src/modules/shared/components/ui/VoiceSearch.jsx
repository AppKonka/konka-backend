// frontend/src/modules/shared/components/ui/VoiceSearch.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

const Container = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.95);
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
  gap: 12px;
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
  background: ${props => props.isListening ? props.theme.primary : 'rgba(255,255,255,0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  margin-bottom: 40px;
  cursor: pointer;
  transition: all 0.3s ease;
`

const TextDisplay = styled.div`
  color: white;
  font-size: 24px;
  text-align: center;
  padding: 0 40px;
  margin-bottom: 40px;
  max-width: 80%;
  word-wrap: break-word;
`

const Suggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 90%;
`

const SuggestionChip = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 24px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.primary};
  }
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
  const [suggestions, setSuggestions] = useState([])
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Initialiser la reconnaissance vocale
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'fr-FR'
      recognitionRef.current.interimResults = true
      recognitionRef.current.continuous = false
      recognitionRef.current.maxAlternatives = 3
      
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setTranscript('')
      }
      
      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        const confidence = event.results[current][0].confidence
        setTranscript(transcriptText)
        
        // Générer des suggestions basées sur la transcription
        generateSuggestions(transcriptText)
        
        if (event.results[current].isFinal) {
          processVoiceInput(transcriptText)
        }
      }
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setTranscript('Erreur de reconnaissance')
        setTimeout(() => {
          setTranscript('')
        }, 1500)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start()
    } else {
      setTranscript('Reconnaissance vocale non supportée')
      setTimeout(() => onClose(), 1500)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  const processVoiceInput = async (text) => {
    setIsProcessing(true)
    
    try {
      // Analyser le texte avec IA
      const analysis = await analyzeVoiceInput(text)
      
      onResult?.(analysis, text)
      setTranscript(`Recherche: "${text}"`)
      
      setTimeout(() => onClose(), 1500)
    } catch (error) {
      console.error('Error processing voice input:', error)
      setTranscript('Erreur lors du traitement')
      setTimeout(() => onClose(), 1500)
    } finally {
      setIsProcessing(false)
    }
  }

  const analyzeVoiceInput = async (text) => {
    const lowerText = text.toLowerCase()
    
    // Détection des intentions
    const intents = {
      search: ['cherche', 'trouve', 'recherche', 'je cherche'],
      buy: ['acheter', 'achète', 'commander', 'achat'],
      listen: ['écouter', 'musique', 'morceau', 'son'],
      artist: ['artiste', 'chanteur', 'groupe'],
      product: ['produit', 'article', 'objet'],
      price: ['prix', 'coût', 'tarif'],
      help: ['aide', 'comment', 'besoin']
    }
    
    let intent = 'search'
    for (const [key, keywords] of Object.entries(intents)) {
      if (keywords.some(k => lowerText.includes(k))) {
        intent = key
        break
      }
    }
    
    // Extraction des entités
    const entities = {
      category: null,
      artist: null,
      product: null,
      color: null,
      size: null,
      price_min: null,
      price_max: null
    }
    
    // Catégories
    const categories = {
      clothing: ['vêtement', 'tee-shirt', 'pantalon', 'jean', 'robe', 'chemise', 'pull'],
      shoes: ['chaussure', 'basket', 'sandale', 'botte'],
      music: ['disque', 'vinyle', 'album', 'cd'],
      electronics: ['téléphone', 'casque', 'enceinte', 'ordinateur']
    }
    
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lowerText.includes(k))) {
        entities.category = cat
        break
      }
    }
    
    // Couleurs
    const colors = ['noir', 'blanc', 'rouge', 'bleu', 'vert', 'jaune', 'rose', 'gris']
    for (const color of colors) {
      if (lowerText.includes(color)) {
        entities.color = color
        break
      }
    }
    
    // Prix
    const priceMatch = lowerText.match(/(moins de|plus de|entre)\s*(\d+)\s*(?:et\s*(\d+))?/)
    if (priceMatch) {
      if (priceMatch[1] === 'moins de') {
        entities.price_max = parseInt(priceMatch[2])
      } else if (priceMatch[1] === 'plus de') {
        entities.price_min = parseInt(priceMatch[2])
      } else if (priceMatch[1] === 'entre') {
        entities.price_min = parseInt(priceMatch[2])
        entities.price_max = parseInt(priceMatch[3])
      }
    }
    
    return {
      original: text,
      intent,
      entities,
      keywords: text.split(' ').filter(w => w.length > 3)
    }
  }

  const generateSuggestions = (text) => {
    const lowerText = text.toLowerCase()
    const suggestionsList = []
    
    if (lowerText.includes('musique') || lowerText.includes('morceau')) {
      suggestionsList.push('Musique populaire', 'Nouveautés', 'Top 50')
    }
    
    if (lowerText.includes('artiste')) {
      suggestionsList.push('Artistes tendance', 'Nouveaux artistes', 'Artistes locaux')
    }
    
    if (lowerText.includes('vêtement') || lowerText.includes('chaussure')) {
      suggestionsList.push('Promotions', 'Nouveautés', 'Tendances')
    }
    
    if (suggestionsList.length === 0) {
      suggestionsList.push('Musique', 'Artistes', 'Shopping', 'Aide')
    }
    
    setSuggestions(suggestionsList.slice(0, 5))
  }

  const handleSuggestionClick = (suggestion) => {
    processVoiceInput(suggestion)
  }

  return (
    <Container
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <CloseButton onClick={onClose} whileTap={{ scale: 0.9 }}>
        ✕
      </CloseButton>
      
      {!isListening && !isProcessing && !transcript && (
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
      
      {suggestions.length > 0 && !isListening && !isProcessing && (
        <Suggestions>
          {suggestions.map(suggestion => (
            <SuggestionChip
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              whileTap={{ scale: 0.95 }}
            >
              {suggestion}
            </SuggestionChip>
          ))}
        </Suggestions>
      )}
    </Container>
  )
}

export default VoiceSearch
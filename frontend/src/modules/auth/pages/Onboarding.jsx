// src/modules/auth/pages/Onboarding.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../../shared/components/ui/Button'
import { useTheme } from '../../shared/context/ThemeContext'
import { useAuth } from '../../shared/context/AuthContext'

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${props => props.theme.background};
`

const SkipButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: none;
  border: none;
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
`

const SlideContainer = styled(motion.div)`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
`

const Illustration = styled(motion.div)`
  width: 280px;
  height: 280px;
  margin-bottom: 40px;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const Title = styled(motion.h1)`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled(motion.p)`
  font-size: 16px;
  color: ${props => props.theme.textSecondary};
  line-height: 1.5;
  margin-bottom: 40px;
  max-width: 300px;
`

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 30px;
`

const Dot = styled(motion.div)`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.active ? props.theme.primary : props.theme.border};
`

const ButtonContainer = styled.div`
  padding: 0 24px 40px;
`

const slides = [
  {
    id: 1,
    title: 'Bienvenue sur Konka',
    subtitle: 'Rejoins la communauté où musique, rencontres et shopping ne font qu\'un.',
    illustration: '/images/onboarding-1.svg',
  },
  {
    id: 2,
    title: 'Choisis ton rôle',
    subtitle: 'Fan, Artiste ou Vendeur - Sélectionne ton profil pour une expérience personnalisée.',
    illustration: '/images/onboarding-2.svg',
  },
  {
    id: 3,
    title: 'Tes goûts musicaux',
    subtitle: 'Choisis tes genres et artistes préférés pour un feed sur mesure.',
    illustration: '/images/onboarding-3.svg',
  },
]

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()
  const theme = useTheme()
  const { user } = useAuth()

  // Rediriger si déjà connecté
  React.useEffect(() => {
    if (user) {
      navigate('/role-selection')
    }
  }, [user, navigate])

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1)
    } else {
      navigate('/register')
    }
  }

  const handleSkip = () => {
    navigate('/login')
  }

  return (
    <Container theme={theme}>
      <SkipButton onClick={handleSkip} theme={theme}>
        Passer
      </SkipButton>

      <AnimatePresence mode="wait">
        <SlideContainer
          key={currentSlide}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.3 }}
        >
          <Illustration
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img src={slides[currentSlide].illustration} alt={slides[currentSlide].title} />
          </Illustration>

          <Title
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {slides[currentSlide].title}
          </Title>

          <Subtitle
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {slides[currentSlide].subtitle}
          </Subtitle>
        </SlideContainer>
      </AnimatePresence>

      <DotsContainer>
        {slides.map((_, index) => (
          <Dot
            key={index}
            active={index === currentSlide}
            theme={theme}
            onClick={() => setCurrentSlide(index)}
            whileTap={{ scale: 0.9 }}
          />
        ))}
      </DotsContainer>

      <ButtonContainer>
        <Button
          fullWidth
          onClick={handleNext}
          whileTap={{ scale: 0.98 }}
        >
          {currentSlide === slides.length - 1 ? 'Commencer' : 'Suivant'}
        </Button>
      </ButtonContainer>
    </Container>
  )
}

export default Onboarding
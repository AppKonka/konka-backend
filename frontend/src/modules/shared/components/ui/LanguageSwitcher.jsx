// frontend/src/modules/shared/components/ui/LanguageSwitcher.jsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'
import { motion } from 'framer-motion'

const Container = styled.div`
  position: relative;
`

const CurrentLanguage = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  cursor: pointer;
`

const Dropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: ${props => props.theme.surface};
  border-radius: 12px;
  box-shadow: ${props => props.theme.shadow.lg};
  border: 1px solid ${props => props.theme.border};
  overflow: hidden;
  z-index: 100;
`

const LanguageOption = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  color: ${props => props.theme.text};
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const FlagIcon = styled.span`
  font-size: 20px;
`

const languages = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
  { code: 'sw', name: 'Kiswahili', flag: '🇹🇿' }
]

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = React.useState(false)

  const currentLanguage = languages.find(l => l.code === i18n.language) || languages[0]

  const changeLanguage = (code) => {
    i18n.changeLanguage(code)
    setIsOpen(false)
  }

  return (
    <Container>
      <CurrentLanguage
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
      >
        <FlagIcon>{currentLanguage.flag}</FlagIcon>
        <span>{currentLanguage.name}</span>
      </CurrentLanguage>
      
      {isOpen && (
        <Dropdown
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {languages.map(lang => (
            <LanguageOption
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              whileTap={{ scale: 0.98 }}
            >
              <FlagIcon>{lang.flag}</FlagIcon>
              <span>{lang.name}</span>
            </LanguageOption>
          ))}
        </Dropdown>
      )}
    </Container>
  )
}
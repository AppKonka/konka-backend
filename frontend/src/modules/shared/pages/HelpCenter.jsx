// src/modules/shared/pages/HelpCenter.jsx
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../components/layout/Header'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { useAuth } from '../context/AuthContext'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const SearchBar = styled.div`
  padding: 16px;
  
  input {
    width: 100%;
    padding: 12px 16px;
    border-radius: 28px;
    border: 1px solid ${props => props.theme.border};
    background: ${props => props.theme.surface};
    color: ${props => props.theme.text};
    font-size: 16px;
    
    &:focus {
      outline: none;
      border-color: ${props => props.theme.primary};
    }
  }
`

const CategorySection = styled.div`
  padding: 0 16px;
  margin-bottom: 24px;
`

const CategoryTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
`

const CategoryCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  
  .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }
  
  .title {
    font-size: 14px;
    font-weight: 500;
    color: ${props => props.theme.text};
  }
`

const FAQSection = styled.div`
  padding: 0 16px;
  margin-bottom: 24px;
`

const FAQItem = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 12px;
  margin-bottom: 8px;
  overflow: hidden;
`

const Question = styled.div`
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-weight: 500;
  color: ${props => props.theme.text};
`

const Answer = styled(motion.div)`
  padding: 0 16px 16px 16px;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.textSecondary};
  border-top: 1px solid ${props => props.theme.border};
`

const ContactButton = styled(motion.button)`
  width: calc(100% - 32px);
  margin: 16px;
  padding: 14px;
  border-radius: 28px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
`

const categories = [
  { id: 'account', icon: '👤', title: 'Compte' },
  { id: 'music', icon: '🎵', title: 'Musique' },
  { id: 'match', icon: '💘', title: 'Rencontre' },
  { id: 'shopping', icon: '🛍️', title: 'Shopping' },
  { id: 'artist', icon: '🎤', title: 'Artistes' },
  { id: 'seller', icon: '📦', title: 'Vendeurs' },
  { id: 'payment', icon: '💰', title: 'Paiements' },
  { id: 'security', icon: '🔒', title: 'Sécurité' },
]

const faqs = [
  {
    id: 1,
    question: "Comment créer un compte sur KONKA ?",
    answer: "Pour créer un compte, téléchargez l'application KONKA, appuyez sur 'S'inscrire', remplissez le formulaire avec vos informations, puis choisissez votre rôle (Fan, Artiste ou Vendeur). Vous recevrez un email de confirmation pour valider votre compte."
  },
  {
    id: 2,
    question: "Comment modifier mon profil ?",
    answer: "Allez dans votre profil (icône MON FIL), appuyez sur 'Modifier mon profil'. Vous pouvez changer votre photo, votre bio, vos informations personnelles et vos préférences musicales."
  },
  {
    id: 3,
    question: "Comment fonctionnent les matchs musicaux ?",
    answer: "Les matchs sont basés sur vos goûts musicaux ! Plus vous avez d'artistes en commun avec quelqu'un, plus vous avez de chances de matcher. Swipez vers la droite pour liker, vers la gauche pour passer. Si vous likez quelqu'un qui vous a aussi liké, c'est un match !"
  },
  {
    id: 4,
    question: "Comment puis-je publier de la musique en tant qu'artiste ?",
    answer: "En tant qu'artiste, vous pouvez publier vos morceaux depuis votre tableau de bord. Allez dans l'onglet 'Musique' puis 'Publier un morceau'. Vous pouvez uploader votre fichier audio, ajouter une pochette et des paroles."
  },
  {
    id: 5,
    question: "Comment puis-je vendre mes produits ?",
    answer: "Pour vendre sur KONKA, vous devez d'abord créer un compte vendeur. Remplissez le formulaire avec les informations de votre boutique. Une fois vérifié, vous pourrez ajouter vos produits depuis l'onglet 'Catalogue'."
  },
  {
    id: 6,
    question: "Comment fonctionnent les dédicaces ?",
    answer: "Les fans peuvent commander des dédicaces personnalisées aux artistes. Choisissez un artiste, écrivez votre message, et payez. L'artiste accepte la demande, enregistre votre dédicace et vous la livre directement dans l'application."
  },
  {
    id: 7,
    question: "Comment organiser une sortie Chill ?",
    answer: "Allez dans l'onglet 'Chill', appuyez sur 'Créer une sortie'. Remplissez les informations (lieu, date, participants). Les utilisateurs pourront demander à participer. Vous pouvez accepter ou refuser les demandes."
  },
  {
    id: 8,
    question: "Comment signaler un contenu inapproprié ?",
    answer: "Sur chaque publication, vidéo ou profil, vous trouverez un menu (trois points) avec l'option 'Signaler'. Sélectionnez la raison du signalement. Notre équipe examinera le signalement dans les plus brefs délais."
  },
  {
    id: 9,
    question: "Comment supprimer mon compte ?",
    answer: "Allez dans 'Paramètres', puis 'Gestion du compte', et appuyez sur 'Supprimer mon compte'. Votre compte sera désactivé immédiatement et définitivement supprimé après 30 jours."
  },
  {
    id: 10,
    question: "Comment contacter le support ?",
    answer: "Vous pouvez nous contacter via le formulaire de contact ci-dessous, ou par email à support@konka.com. Notre équipe vous répond dans les 24-48h."
  }
]

const HelpCenter = () => {
  const navigate = useNavigate()
  const { userRole } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [openFAQ, setOpenFAQ] = useState(null)

  const getBackPath = () => {
    if (userRole === 'fan') return '/fan/settings'
    if (userRole === 'artist') return '/artist/settings'
    if (userRole === 'seller') return '/seller/settings'
    return '/'
  }

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCategoryClick = (categoryId) => {
    navigate(`/fan/help/category/${categoryId}`)
  }

  const handleContact = () => {
    navigate('/fan/contact')
  }

  return (
    <Container>
      <Header title="Centre d'aide" showBack onBack={() => navigate(getBackPath())} />
      
      <SearchBar>
        <input
          type="text"
          placeholder="Rechercher une question..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchBar>
      
      {!searchQuery && (
        <CategorySection>
          <CategoryTitle>Catégories</CategoryTitle>
          <CategoryGrid>
            {categories.map(category => (
              <CategoryCard
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="icon">{category.icon}</div>
                <div className="title">{category.title}</div>
              </CategoryCard>
            ))}
          </CategoryGrid>
        </CategorySection>
      )}
      
      <FAQSection>
        <CategoryTitle>Questions fréquentes</CategoryTitle>
        {filteredFAQs.map(faq => (
          <FAQItem key={faq.id}>
            <Question onClick={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}>
              <span>{faq.question}</span>
              <span>{openFAQ === faq.id ? '▲' : '▼'}</span>
            </Question>
            <AnimatePresence>
              {openFAQ === faq.id && (
                <Answer
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {faq.answer}
                </Answer>
              )}
            </AnimatePresence>
          </FAQItem>
        ))}
      </FAQSection>
      
      <ContactButton onClick={handleContact} whileTap={{ scale: 0.98 }}>
        📧 Nous contacter
      </ContactButton>
      
      <BottomNavigation />
    </Container>
  )
}

export default HelpCenter
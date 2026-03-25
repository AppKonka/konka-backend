// src/modules/shared/pages/TermsOfService.jsx
import React from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Header } from '../components/layout/Header'
import { BottomNavigation } from '../components/layout/BottomNavigation'
import { useAuth } from '../context/AuthContext'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const Content = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 20px;
  color: ${props => props.theme.text};
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
  color: ${props => props.theme.text};
`

const Paragraph = styled.p`
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 12px;
  color: ${props => props.theme.textSecondary};
`

const List = styled.ul`
  margin-left: 20px;
  margin-bottom: 12px;
  
  li {
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: 8px;
    color: ${props => props.theme.textSecondary};
  }
`

const LastUpdated = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-top: 40px;
  text-align: center;
`

const TermsOfService = () => {
  const navigate = useNavigate()
  const { userRole } = useAuth()

  const getBackPath = () => {
    if (userRole === 'fan') return '/fan/settings'
    if (userRole === 'artist') return '/artist/settings'
    if (userRole === 'seller') return '/seller/settings'
    return '/'
  }

  return (
    <Container>
      <Header title="Conditions d'utilisation" showBack onBack={() => navigate(getBackPath())} />
      
      <Content>
        <Title>Conditions d'utilisation de KONKA</Title>
        
        <Section>
          <SectionTitle>1. Acceptation des conditions</SectionTitle>
          <Paragraph>
            En utilisant l'application KONKA, vous acceptez d'être lié par ces conditions d'utilisation. 
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>2. Description du service</SectionTitle>
          <Paragraph>
            KONKA est une plateforme qui permet aux utilisateurs de :
          </Paragraph>
          <List>
            <li>Découvrir et partager de la musique</li>
            <li>Rencontrer d'autres personnes partageant les mêmes goûts musicaux</li>
            <li>Acheter et vendre des produits</li>
            <li>Participer à des lives et des sorties réelles</li>
            <li>Commander des dédicaces personnalisées</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>3. Compte utilisateur</SectionTitle>
          <Paragraph>
            Vous êtes responsable de la confidentialité de votre compte et de votre mot de passe. 
            Vous acceptez de nous informer immédiatement de toute utilisation non autorisée de votre compte.
          </Paragraph>
          <Paragraph>
            Vous devez avoir au moins 13 ans pour créer un compte. Pour les comptes artistes et vendeurs, 
            vous devez avoir au moins 18 ans ou être accompagné d'un parent ou tuteur légal.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>4. Contenu utilisateur</SectionTitle>
          <Paragraph>
            Vous conservez tous vos droits sur le contenu que vous publiez sur KONKA. 
            En publiant du contenu, vous accordez à KONKA une licence mondiale, non exclusive, 
            gratuite et transférable pour utiliser, reproduire et distribuer votre contenu dans le cadre du service.
          </Paragraph>
          <Paragraph>
            Vous êtes seul responsable du contenu que vous publiez. Vous ne devez pas publier de contenu :
          </Paragraph>
          <List>
            <li>Illégal, haineux, discriminatoire ou violent</li>
            <li>Violant les droits d'auteur ou la propriété intellectuelle</li>
            <li>À caractère pornographique ou sexuellement explicite</li>
            <li>Constituant du harcèlement ou du cyberharcèlement</li>
            <li>Promouvant la violence ou l'auto-mutilation</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>5. Achats et paiements</SectionTitle>
          <Paragraph>
            Tous les achats effectués sur KONKA sont finaux et non remboursables sauf disposition contraire. 
            Les prix sont indiqués dans la devise locale de l'utilisateur.
          </Paragraph>
          <Paragraph>
            Les artistes et vendeurs acceptent de payer une commission à KONKA sur chaque transaction. 
            Les taux de commission sont affichés avant chaque vente.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>6. Propriété intellectuelle</SectionTitle>
          <Paragraph>
            KONKA et son logo sont des marques déposées. Vous ne pouvez pas utiliser ces marques sans notre autorisation écrite.
          </Paragraph>
          <Paragraph>
            Les artistes garantissent qu'ils détiennent tous les droits sur la musique qu'ils publient. 
            KONKA n'est pas responsable des violations de droits d'auteur commises par les utilisateurs.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>7. Modération et signalements</SectionTitle>
          <Paragraph>
            KONKA se réserve le droit de modérer tout contenu et de suspendre ou supprimer tout compte 
            qui viole ces conditions. Les utilisateurs peuvent signaler tout contenu inapproprié.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>8. Résiliation</SectionTitle>
          <Paragraph>
            Vous pouvez supprimer votre compte à tout moment depuis les paramètres. 
            KONKA peut résilier ou suspendre votre compte immédiatement, sans préavis, 
            en cas de violation de ces conditions.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>9. Limitation de responsabilité</SectionTitle>
          <Paragraph>
            KONKA n'est pas responsable des dommages indirects, accessoires ou consécutifs 
            découlant de l'utilisation ou de l'impossibilité d'utiliser le service.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>10. Modifications des conditions</SectionTitle>
          <Paragraph>
            Nous pouvons modifier ces conditions à tout moment. Les modifications entrent en vigueur 
            dès leur publication. Votre utilisation continue du service constitue votre acceptation des conditions modifiées.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>11. Contact</SectionTitle>
          <Paragraph>
            Pour toute question concernant ces conditions, contactez-nous à : legal@konka.com
          </Paragraph>
        </Section>
        
        <LastUpdated>Dernière mise à jour : 1er janvier 2024</LastUpdated>
      </Content>
      
      <BottomNavigation />
    </Container>
  )
}

export default TermsOfService
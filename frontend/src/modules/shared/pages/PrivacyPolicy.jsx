// src/modules/shared/pages/PrivacyPolicy.jsx
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

const PrivacyPolicy = () => {
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
      <Header title="Politique de confidentialité" showBack onBack={() => navigate(getBackPath())} />
      
      <Content>
        <Title>Politique de confidentialité de KONKA</Title>
        
        <Section>
          <SectionTitle>1. Collecte des informations</SectionTitle>
          <Paragraph>
            Nous collectons les informations suivantes lorsque vous utilisez KONKA :
          </Paragraph>
          <List>
            <li>Informations d'inscription : nom, email, numéro de téléphone, date de naissance, genre</li>
            <li>Informations de profil : photo, biographie, localisation, préférences musicales</li>
            <li>Contenu que vous publiez : photos, vidéos, messages, commentaires</li>
            <li>Données d'utilisation : historique de navigation, temps passé, interactions</li>
            <li>Données de localisation : avec votre permission, pour les fonctionnalités de proximité</li>
            <li>Données de paiement : pour les transactions (traitées par des tiers sécurisés)</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>2. Utilisation des informations</SectionTitle>
          <Paragraph>
            Nous utilisons vos informations pour :
          </Paragraph>
          <List>
            <li>Fournir, maintenir et améliorer nos services</li>
            <li>Personnaliser votre expérience et vos recommandations</li>
            <li>Faciliter les interactions entre utilisateurs (matchs, messages, sorties)</li>
            <li>Traiter les paiements et les transactions</li>
            <li>Vous envoyer des notifications importantes et des mises à jour</li>
            <li>Prévenir la fraude et assurer la sécurité de la plateforme</li>
            <li>Analyser l'utilisation pour améliorer nos services</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>3. Partage des informations</SectionTitle>
          <Paragraph>
            Nous ne vendons pas vos informations personnelles. Nous pouvons partager vos informations avec :
          </Paragraph>
          <List>
            <li>D'autres utilisateurs : selon vos paramètres de confidentialité (profil, publications, matchs)</li>
            <li>Prestataires de services : pour le traitement des paiements, l'envoi d'emails, l'hébergement</li>
            <li>Autorités légales : si requis par la loi ou pour protéger nos droits</li>
            <li>Dans le cadre d'une fusion ou acquisition : si KONKA est vendue ou fusionnée</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>4. Confidentialité et paramètres</SectionTitle>
          <Paragraph>
            Vous contrôlez vos informations via les paramètres de confidentialité :
          </Paragraph>
          <List>
            <li>Compte privé : seul vos abonnés et matchs voient votre contenu</li>
            <li>Mode invisible : naviguez sans apparaître dans les suggestions</li>
            <li>Messages éphémères : messages qui disparaissent après lecture</li>
            <li>Bloquer des utilisateurs : empêcher toute interaction</li>
            <li>Exporter vos données : télécharger toutes vos informations</li>
            <li>Supprimer votre compte : suppression définitive de vos données</li>
          </List>
        </Section>
        
        <Section>
          <SectionTitle>5. Sécurité des données</SectionTitle>
          <Paragraph>
            Nous mettons en œuvre des mesures de sécurité pour protéger vos données :
          </Paragraph>
          <List>
            <li>Chiffrement des données en transit (HTTPS) et au repos</li>
            <li>Authentification à deux facteurs</li>
            <li>Contrôles d'accès stricts</li>
            <li>Surveillance continue des menaces</li>
          </List>
          <Paragraph>
            Aucune méthode de transmission sur Internet n'est totalement sécurisée. 
            Nous ne pouvons garantir la sécurité absolue de vos données.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>6. Conservation des données</SectionTitle>
          <Paragraph>
            Nous conservons vos données tant que votre compte est actif. 
            Lorsque vous supprimez votre compte, vos données sont effacées dans un délai de 30 jours, 
            sauf obligations légales de conservation.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>7. Cookies et technologies similaires</SectionTitle>
          <Paragraph>
            Nous utilisons des cookies pour améliorer votre expérience, analyser l'utilisation 
            et personnaliser le contenu. Vous pouvez gérer vos préférences de cookies dans les paramètres.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>8. Droits des utilisateurs (RGPD)</SectionTitle>
          <Paragraph>
            Si vous résidez dans l'Union européenne, vous avez le droit de :
          </Paragraph>
          <List>
            <li>Accéder à vos données personnelles</li>
            <li>Rectifier des données inexactes</li>
            <li>Demander l'effacement de vos données</li>
            <li>Limiter le traitement de vos données</li>
            <li>Opposer le traitement de vos données</li>
            <li>Recevoir vos données dans un format structuré (portabilité)</li>
          </List>
          <Paragraph>
            Pour exercer ces droits, contactez-nous à privacy@konka.com.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>9. Protection des mineurs</SectionTitle>
          <Paragraph>
            KONKA n'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment 
            d'informations personnelles d'enfants de moins de 13 ans. Si vous avez moins de 18 ans, 
            vous devez obtenir le consentement d'un parent ou tuteur.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>10. Modifications de la politique</SectionTitle>
          <Paragraph>
            Nous pouvons modifier cette politique de confidentialité. Les modifications entrent en vigueur 
            dès leur publication. Nous vous informerons des changements importants par notification.
          </Paragraph>
        </Section>
        
        <Section>
          <SectionTitle>11. Contact</SectionTitle>
          <Paragraph>
            Pour toute question concernant cette politique de confidentialité, contactez-nous à :
          </Paragraph>
          <Paragraph>
            Email : privacy@konka.com<br />
            Adresse : KONKA, 123 Avenue de la République, Paris, France
          </Paragraph>
        </Section>
        
        <LastUpdated>Dernière mise à jour : 1er janvier 2024</LastUpdated>
      </Content>
      
      <BottomNavigation />
    </Container>
  )
}

export default PrivacyPolicy
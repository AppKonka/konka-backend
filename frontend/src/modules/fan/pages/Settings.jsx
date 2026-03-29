// src/modules/fan/pages/Settings.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { Button } from '../../shared/components/ui/Button'
import { useAuth } from '../../shared/context/AuthContext'
import { useTheme } from '../../shared/context/ThemeContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'
import { exportService } from '../../shared/services/exportService'
import { offlineService } from "../../../services/offline/offline_service";

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 40px;
`

const Section = styled.div`
  margin-bottom: 24px;
`

const SectionTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0 16px;
  margin-bottom: 8px;
  color: ${props => props.theme.textSecondary};
`

const MenuItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${props => props.theme.surface};
  border-bottom: 1px solid ${props => props.theme.border};
  cursor: pointer;
  
  &:first-child {
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
  
  &:last-child {
    border-bottom-left-radius: 12px;
    border-bottom-right-radius: 12px;
    border-bottom: none;
  }
`

const MenuLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const MenuIcon = styled.div`
  font-size: 20px;
  width: 32px;
`

const MenuText = styled.div`
  font-size: 16px;
  color: ${props => props.theme.text};
`

const MenuRight = styled.div`
  color: ${props => props.theme.textSecondary};
  font-size: 14px;
`

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.border};
    transition: 0.3s;
    border-radius: 24px;
    
    &:before {
      position: absolute;
      content: "";
      height: 20px;
      width: 20px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
    }
  }
  
  input:checked + .slider {
    background-color: ${props => props.theme.primary};
  }
  
  input:checked + .slider:before {
    transform: translateX(24px);
  }
`

const LogoutButton = styled(motion.button)`
  width: calc(100% - 32px);
  margin: 24px 16px;
  padding: 16px;
  border-radius: 12px;
  border: none;
  background: ${props => props.theme.error}20;
  color: ${props => props.theme.error};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
`

const DangerButton = styled(motion.button)`
  width: calc(100% - 32px);
  margin: 0 16px 24px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.error};
  background: transparent;
  color: ${props => props.theme.error};
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
`

const Settings = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [privateMode, setPrivateMode] = useState(false)
  const [storageUsage, setStorageUsage] = useState({ total: 0, videos: 0, tracks: 0, humanReadable: '0 B' })

  useEffect(() => {
    const loadStorage = async () => {
      const usage = await offlineService.getStorageUsage()
      setStorageUsage(usage)
    }
    loadStorage()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)
        
        if (error) throw error
        
        await logout()
        navigate('/')
        toast.success('Compte supprimé avec succès')
      } catch (error) {
        console.error('Error deleting account:', error)
        toast.error('Erreur lors de la suppression')
      }
    }
  }

  const handleExportData = async () => {
    try {
      toast.loading('Préparation de l\'export...', { id: 'export' })
      const blob = await exportService.exportUserData(user.id, 'json')
      exportService.downloadBlob(blob, `konka_export_${new Date().toISOString()}.json`)
      toast.success('Export terminé !', { id: 'export' })
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      toast.error('Erreur lors de l\'export', { id: 'export' })
    }
  }

  const handleStorageInfo = async () => {
    const usage = await offlineService.getStorageUsage()
    toast.info(`${usage.videos} vidéo(s), ${usage.tracks} morceau(x) - ${usage.humanReadable}`)
  }

  const menuSections = [
    {
      title: 'Compte',
      items: [
        { icon: '👤', label: 'Informations personnelles', action: () => navigate('/fan/profile/edit') },
        { icon: '🔒', label: 'Confidentialité', action: () => navigate('/fan/settings/privacy') },
        { icon: '🔐', label: 'Sécurité', action: () => navigate('/fan/settings/security') },
      ]
    },
    {
      title: 'Préférences',
      items: [
        { icon: '🎨', label: 'Thème', action: null, component: (
          <Switch>
            <input type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="slider"></span>
          </Switch>
        ) },
        { icon: '🔔', label: 'Notifications', action: null, component: (
          <Switch>
            <input type="checkbox" checked={notificationsEnabled} onChange={() => setNotificationsEnabled(!notificationsEnabled)} />
            <span className="slider"></span>
          </Switch>
        ) },
        { icon: '🌐', label: 'Langue', action: () => navigate('/fan/settings/language'), value: 'Français' },
      ]
    },
    {
      title: 'Confidentialité',
      items: [
        { icon: '👥', label: 'Compte privé', action: null, component: (
          <Switch>
            <input type="checkbox" checked={privateMode} onChange={() => setPrivateMode(!privateMode)} />
            <span className="slider"></span>
          </Switch>
        ) },
        { icon: '📍', label: 'Localisation', action: () => navigate('/fan/settings/location'), value: 'Activée' },
        { icon: '📥', label: 'Exporter mes données', action: handleExportData, value: 'Télécharger' },
        { icon: '💾', label: 'Stockage hors-ligne', action: handleStorageInfo, value: storageUsage.humanReadable },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: '❓', label: 'Aide', action: () => navigate('/fan/help') },
        { icon: '📝', label: 'Conditions d\'utilisation', action: () => navigate('/fan/terms') },
        { icon: '🔒', label: 'Politique de confidentialité', action: () => navigate('/fan/privacy') },
        { icon: '📧', label: 'Nous contacter', action: () => navigate('/fan/contact') },
      ]
    },
  ]

  return (
    <Container>
      <Header title="Paramètres" showBack />
      
      {menuSections.map((section, idx) => (
        <Section key={idx}>
          <SectionTitle>{section.title}</SectionTitle>
          {section.items.map((item, itemIdx) => (
            <MenuItem
              key={itemIdx}
              onClick={item.action}
              whileTap={item.action ? { scale: 0.98 } : {}}
            >
              <MenuLeft>
                <MenuIcon>{item.icon}</MenuIcon>
                <MenuText>{item.label}</MenuText>
              </MenuLeft>
              <MenuRight>
                {item.component || item.value || (item.action && '→')}
              </MenuRight>
            </MenuItem>
          ))}
        </Section>
      ))}
      
      <LogoutButton onClick={handleLogout} whileTap={{ scale: 0.98 }}>
        Se déconnecter
      </LogoutButton>
      
      <DangerButton onClick={handleDeleteAccount} whileTap={{ scale: 0.98 }}>
        Supprimer mon compte
      </DangerButton>
    </Container>
  )
}

export default Settings
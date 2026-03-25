// src/modules/admin/pages/SystemSettings.jsx
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import {
  Settings, Globe, Mail, Bell, Shield, Database,
  CreditCard, Users, Music, ShoppingBag, Save,
  RefreshCw, AlertTriangle, CheckCircle
} from 'lucide-react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding: 20px;
`

const Header = styled.div`
  margin-bottom: 24px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.text};
`

const Subtitle = styled.p`
  font-size: 14px;
  color: ${props => props.theme.textSecondary};
  margin-top: 4px;
`

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const Sidebar = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  height: fit-content;
`

const SidebarItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  background: ${props => props.active ? `${props.theme.primary}20` : 'transparent'};
  color: ${props => props.active ? props.theme.primary : props.theme.text};
  
  &:hover {
    background: ${props => props.theme.border};
  }
`

const Content = styled.div`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 24px;
`

const SettingsSection = styled.div`
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: ${props => props.theme.text};
  display: flex;
  align-items: center;
  gap: 8px;
`

const FormGroup = styled.div`
  margin-bottom: 20px;
`

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: ${props => props.theme.text};
`

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const Select = styled.select`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 14px;
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 14px;
  min-height: 100px;
  resize: vertical;
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

const SaveButton = styled(motion.button)`
  padding: 12px 24px;
  border-radius: 28px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
`

const DangerZone = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #FF4444;
`

const DangerButton = styled(motion.button)`
  padding: 12px 24px;
  border-radius: 28px;
  border: 1px solid #FF4444;
  background: transparent;
  color: #FF4444;
  font-size: 14px;
  cursor: pointer;
`

const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('general')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [settings, setSettings] = useState({
    general: {
      app_name: 'KONKA',
      app_description: 'La plateforme où musique, rencontres et shopping ne font qu\'un',
      contact_email: 'contact@konka.com',
      support_email: 'support@konka.com',
      maintenance_mode: false,
      registration_enabled: true
    },
    appearance: {
      primary_color: '#FF6B35',
      secondary_color: '#FF4D1E',
      dark_mode: false,
      logo_url: '',
      favicon_url: ''
    },
    payments: {
      currency: 'EUR',
      stripe_enabled: true,
      stripe_test_mode: false,
      commission_rate: 5,
      minimum_payout: 10,
      mobile_money_enabled: true
    },
    notifications: {
      email_notifications: true,
      push_notifications: true,
      sms_notifications: true,
      welcome_email: true,
      order_confirmation: true,
      new_match: true
    },
    moderation: {
      auto_moderation: true,
      ai_moderation: true,
      flag_threshold: 3,
      ban_threshold: 5
    },
    limits: {
      max_video_size: 100,
      max_audio_size: 50,
      max_image_size: 10,
      max_upload_per_day: 10
    }
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        setSettings(data)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ id: 1, ...settings })
      
      if (error) throw error
      
      toast.success('Paramètres enregistrés avec succès')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les paramètres ? Cette action est irréversible.')) {
      // Réinitialiser aux valeurs par défaut
      setSettings({
        general: {
          app_name: 'KONKA',
          app_description: 'La plateforme où musique, rencontres et shopping ne font qu\'un',
          contact_email: 'contact@konka.com',
          support_email: 'support@konka.com',
          maintenance_mode: false,
          registration_enabled: true
        },
        appearance: {
          primary_color: '#FF6B35',
          secondary_color: '#FF4D1E',
          dark_mode: false,
          logo_url: '',
          favicon_url: ''
        },
        payments: {
          currency: 'EUR',
          stripe_enabled: true,
          stripe_test_mode: false,
          commission_rate: 5,
          minimum_payout: 10,
          mobile_money_enabled: true
        },
        notifications: {
          email_notifications: true,
          push_notifications: true,
          sms_notifications: true,
          welcome_email: true,
          order_confirmation: true,
          new_match: true
        },
        moderation: {
          auto_moderation: true,
          ai_moderation: true,
          flag_threshold: 3,
          ban_threshold: 5
        },
        limits: {
          max_video_size: 100,
          max_audio_size: 50,
          max_image_size: 10,
          max_upload_per_day: 10
        }
      })
      toast.success('Paramètres réinitialisés')
    }
  }

  const renderGeneral = () => (
    <>
      <SettingsSection>
        <SectionTitle><Settings size={18} /> Informations générales</SectionTitle>
        <FormGroup>
          <Label>Nom de l'application</Label>
          <Input
            value={settings.general.app_name}
            onChange={(e) => setSettings({ ...settings, general: { ...settings.general, app_name: e.target.value } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Description</Label>
          <TextArea
            value={settings.general.app_description}
            onChange={(e) => setSettings({ ...settings, general: { ...settings.general, app_description: e.target.value } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Email de contact</Label>
          <Input
            type="email"
            value={settings.general.contact_email}
            onChange={(e) => setSettings({ ...settings, general: { ...settings.general, contact_email: e.target.value } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Email support</Label>
          <Input
            type="email"
            value={settings.general.support_email}
            onChange={(e) => setSettings({ ...settings, general: { ...settings.general, support_email: e.target.value } })}
          />
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Mode maintenance</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.general.maintenance_mode}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, maintenance_mode: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Inscriptions activées</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.general.registration_enabled}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, registration_enabled: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
      </SettingsSection>
    </>
  )

  const renderPayments = () => (
    <>
      <SettingsSection>
        <SectionTitle><CreditCard size={18} /> Configuration des paiements</SectionTitle>
        <FormGroup>
          <Label>Devise</Label>
          <Select
            value={settings.payments.currency}
            onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, currency: e.target.value } })}
          >
            <option value="EUR">EUR - Euro</option>
            <option value="USD">USD - Dollar US</option>
            <option value="GBP">GBP - Livre sterling</option>
            <option value="XOF">XOF - Franc CFA</option>
          </Select>
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Stripe activé</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.payments.stripe_enabled}
                onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, stripe_enabled: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Mode test Stripe</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.payments.stripe_test_mode}
                onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, stripe_test_mode: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
        <FormGroup>
          <Label>Taux de commission (%)</Label>
          <Input
            type="number"
            value={settings.payments.commission_rate}
            onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, commission_rate: parseFloat(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Paiement minimum (€)</Label>
          <Input
            type="number"
            value={settings.payments.minimum_payout}
            onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, minimum_payout: parseFloat(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Mobile Money activé</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.payments.mobile_money_enabled}
                onChange={(e) => setSettings({ ...settings, payments: { ...settings.payments, mobile_money_enabled: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
      </SettingsSection>
    </>
  )

  const renderModeration = () => (
    <>
      <SettingsSection>
        <SectionTitle><Shield size={18} /> Modération automatique</SectionTitle>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Modération automatique</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.moderation.auto_moderation}
                onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, auto_moderation: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
        <FormGroup>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Modération IA</Label>
            <Switch>
              <input
                type="checkbox"
                checked={settings.moderation.ai_moderation}
                onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, ai_moderation: e.target.checked } })}
              />
              <span className="slider"></span>
            </Switch>
          </div>
        </FormGroup>
        <FormGroup>
          <Label>Seuil de signalement (flag)</Label>
          <Input
            type="number"
            value={settings.moderation.flag_threshold}
            onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, flag_threshold: parseInt(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Seuil de bannissement</Label>
          <Input
            type="number"
            value={settings.moderation.ban_threshold}
            onChange={(e) => setSettings({ ...settings, moderation: { ...settings.moderation, ban_threshold: parseInt(e.target.value) } })}
          />
        </FormGroup>
      </SettingsSection>
    </>
  )

  const renderLimits = () => (
    <>
      <SettingsSection>
        <SectionTitle><Database size={18} /> Limitations</SectionTitle>
        <FormGroup>
          <Label>Taille maximale vidéo (MB)</Label>
          <Input
            type="number"
            value={settings.limits.max_video_size}
            onChange={(e) => setSettings({ ...settings, limits: { ...settings.limits, max_video_size: parseInt(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Taille maximale audio (MB)</Label>
          <Input
            type="number"
            value={settings.limits.max_audio_size}
            onChange={(e) => setSettings({ ...settings, limits: { ...settings.limits, max_audio_size: parseInt(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Taille maximale image (MB)</Label>
          <Input
            type="number"
            value={settings.limits.max_image_size}
            onChange={(e) => setSettings({ ...settings, limits: { ...settings.limits, max_image_size: parseInt(e.target.value) } })}
          />
        </FormGroup>
        <FormGroup>
          <Label>Uploads maximum par jour</Label>
          <Input
            type="number"
            value={settings.limits.max_upload_per_day}
            onChange={(e) => setSettings({ ...settings, limits: { ...settings.limits, max_upload_per_day: parseInt(e.target.value) } })}
          />
        </FormGroup>
      </SettingsSection>
    </>
  )

  const sections = {
    general: { title: 'Général', icon: <Settings size={18} />, component: renderGeneral },
    payments: { title: 'Paiements', icon: <CreditCard size={18} />, component: renderPayments },
    moderation: { title: 'Modération', icon: <Shield size={18} />, component: renderModeration },
    limits: { title: 'Limitations', icon: <Database size={18} />, component: renderLimits }
  }

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: 'center', padding: 40 }}>Chargement...</div>
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <Title>Paramètres système</Title>
        <Subtitle>Configurez les paramètres globaux de la plateforme</Subtitle>
      </Header>
      
      <SettingsGrid>
        <Sidebar>
          {Object.entries(sections).map(([key, section]) => (
            <SidebarItem
              key={key}
              active={activeSection === key}
              onClick={() => setActiveSection(key)}
              whileTap={{ scale: 0.98 }}
            >
              {section.icon}
              {section.title}
            </SidebarItem>
          ))}
        </Sidebar>
        
        <Content>
          {sections[activeSection].component()}
          
          <SaveButton onClick={saveSettings} whileTap={{ scale: 0.95 }} disabled={saving}>
            <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </SaveButton>
          
          <DangerZone>
            <SectionTitle style={{ color: '#FF4444' }}>
              <AlertTriangle size={18} /> Zone dangereuse
            </SectionTitle>
            <DangerButton onClick={resetSettings} whileTap={{ scale: 0.95 }}>
              Réinitialiser tous les paramètres
            </DangerButton>
          </DangerZone>
        </Content>
      </SettingsGrid>
    </Container>
  )
}

export default SystemSettings
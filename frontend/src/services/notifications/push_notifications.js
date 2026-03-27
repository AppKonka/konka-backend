// frontend/src/services/notifications/push_notifications.js
import { getToken, onMessage } from 'firebase/messaging'
import { supabase } from '../../config/supabase'

class PushNotificationsService {
  constructor() {
    this.messaging = null
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator
    this.token = null
  }

  async init() {
    if (!this.isSupported) {
      console.log('Push notifications not supported')
      return false
    }

    try {
      // Demander la permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.log('Notification permission denied')
        return false
      }

      // Initialiser Firebase Messaging
      const { getMessaging } = await import('firebase/messaging')
      this.messaging = getMessaging()
      
      // Obtenir le token
      this.token = await getToken(this.messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      })
      
      // Sauvegarder le token dans Supabase
      await this.saveToken(this.token)
      
      // Écouter les messages en premier plan
      onMessage(this.messaging, (payload) => {
        this.handleForegroundMessage(payload)
      })
      
      console.log('✅ Push notifications initialized, token:', this.token?.substring(0, 20) + '...')
      return true
    } catch (error) {
      console.error('Error initializing push notifications:', error)
      return false
    }
  }

  async saveToken(token) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .update({ fcm_token: token })
          .eq('id', user.id)
          .select()
        
        if (error) throw error
        
        console.log('💾 FCM token saved for user:', user.id, data?.[0]?.fcm_token?.substring(0, 20) + '...')
      }
    } catch (error) {
      console.error('Error saving FCM token:', error)
    }
  }

  handleForegroundMessage(payload) {
    const { title, body, image } = payload.notification || {}
    const data = payload.data || {}
    
    if (title && body) {
      // Afficher une notification même en premier plan
      const notification = new Notification(title, {
        body,
        icon: image || '/icon-192.png',
        data
      })
      
      notification.onclick = () => {
        // Gérer le clic sur la notification
        window.focus()
        if (data.url) {
          window.location.href = data.url
        }
      }
      
      console.log('🔔 Notification reçue en premier plan:', { title, body, data })
    }
    
    // Émettre un événement pour l'application
    window.dispatchEvent(new CustomEvent('konka-notification', {
      detail: { title, body, data }
    }))
  }

  // Envoyer une notification via l'API (backend)
  async sendNotification(userId, title, body, data = {}) {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        console.warn('No auth token found')
        return false
      }
      
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          body,
          data
        })
      })
      
      if (response.ok) {
        console.log('📤 Notification sent to user:', userId)
        return true
      } else {
        console.error('Failed to send notification:', response.status)
        return false
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  // S'abonner à un topic
  async subscribeToTopic(topic) {
    if (!this.token) {
      console.warn('No FCM token available')
      return false
    }
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: this.token, topic })
      })
      
      if (response.ok) {
        console.log('📢 Subscribed to topic:', topic)
        return true
      }
      return false
    } catch (error) {
      console.error('Error subscribing to topic:', error)
      return false
    }
  }

  // Se désabonner d'un topic
  async unsubscribeFromTopic(topic) {
    if (!this.token) {
      console.warn('No FCM token available')
      return false
    }
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: this.token, topic })
      })
      
      if (response.ok) {
        console.log('🔕 Unsubscribed from topic:', topic)
        return true
      }
      return false
    } catch (error) {
      console.error('Error unsubscribing from topic:', error)
      return false
    }
  }

  // Vérifier si les notifications sont supportées
  isSupportedBrowser() {
    return this.isSupported
  }

  // Récupérer le token actuel
  getCurrentToken() {
    return this.token
  }

  // Demander une nouvelle permission (utile si l'utilisateur a refusé)
  async requestPermission() {
    if (!this.isSupported) {
      return false
    }
    
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        // Réinitialiser la connexion pour obtenir un nouveau token
        if (this.messaging) {
          this.token = await getToken(this.messaging, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
          })
          await this.saveToken(this.token)
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Error requesting permission:', error)
      return false
    }
  }
}

export const pushNotifications = new PushNotificationsService()
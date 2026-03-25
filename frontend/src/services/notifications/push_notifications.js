// frontend/src/services/notifications/push_notifications.js
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
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
        await supabase
          .from('users')
          .update({ fcm_token: token })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error saving FCM token:', error)
    }
  }

  handleForegroundMessage(payload) {
    const { title, body, image } = payload.notification
    const data = payload.data
    
    // Afficher une notification même en premier plan
    new Notification(title, {
      body,
      icon: image || '/icon-192.png',
      data
    })
    
    // Émettre un événement pour l'application
    window.dispatchEvent(new CustomEvent('konka-notification', {
      detail: { title, body, data }
    }))
  }

  // Envoyer une notification via l'API (backend)
  async sendNotification(userId, title, body, data = {}) {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          user_id: userId,
          title,
          body,
          data
        })
      })
      
      return response.ok
    } catch (error) {
      console.error('Error sending notification:', error)
      return false
    }
  }

  // S'abonner à un topic
  async subscribeToTopic(topic) {
    if (!this.token) return false
    
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token: this.token, topic })
      })
      
      return response.ok
    } catch (error) {
      console.error('Error subscribing to topic:', error)
      return false
    }
  }

  // Se désabonner d'un topic
  async unsubscribeFromTopic(topic) {
    if (!this.token) return false
    
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token: this.token, topic })
      })
      
      return response.ok
    } catch (error) {
      console.error('Error unsubscribing from topic:', error)
      return false
    }
  }
}

export const pushNotifications = new PushNotificationsService()
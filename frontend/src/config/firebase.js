// frontend/src/config/firebase.js
import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Initialiser Firebase
const app = initializeApp(firebaseConfig)

// Initialiser Cloud Messaging
let messaging = null
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  messaging = getMessaging(app)
}

// Demander la permission et obtenir le token FCM
export const requestNotificationPermission = async () => {
  if (!messaging) return null
  
  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      })
      return token
    }
    return null
  } catch (error) {
    console.error('Error getting notification permission:', error)
    return null
  }
}

// Écouter les messages en premier plan
export const onForegroundMessage = (callback) => {
  if (!messaging) return
  
  onMessage(messaging, (payload) => {
    console.log('Foreground message:', payload)
    callback(payload)
  })
}

export { messaging }
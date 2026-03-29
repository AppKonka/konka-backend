// frontend/public/firebase-messaging-sw.js
// Service Worker pour les notifications push Firebase

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// Configuration Firebase (avec TES VALEURS)
const firebaseConfig = {
  apiKey: "AIzaSyAhoXu8HI1X8bBWSmSLxRLzYk2QeHrXjm0",
  authDomain: "konka-6c883.firebaseapp.com",
  projectId: "konka-6c883",
  storageBucket: "konka-6c883.firebasestorage.app",
  messagingSenderId: "1036929438057",
  appId: "1:1036929438057:web:8884e3500163c3a99f2df8",
}

// Initialiser Firebase
firebase.initializeApp(firebaseConfig)

// Récupérer l'instance de messaging
const messaging = firebase.messaging()

// Gérer les messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan:', payload)

  const notificationTitle = payload.notification?.title || 'KONKA'
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'Ouvrir'
      }
    ]
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Gérer le clic sur la notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((windowClients) => {
      // Vérifier si une fenêtre est déjà ouverte
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Sinon ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
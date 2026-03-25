// frontend/src/services/offline/offline_service.js
import { openDB } from 'idb'

class OfflineService {
  constructor() {
    this.db = null
    this.isOnline = navigator.onLine
    this.pendingSync = []
    this.initDB()
    this.setupListeners()
  }

  async initDB() {
    this.db = await openDB('konka-offline', 1, {
      upgrade(db) {
        // Store pour les vidéos
        if (!db.objectStoreNames.contains('videos')) {
          const videoStore = db.createObjectStore('videos', { keyPath: 'id' })
          videoStore.createIndex('created_at', 'created_at')
        }
        
        // Store pour la musique
        if (!db.objectStoreNames.contains('tracks')) {
          const trackStore = db.createObjectStore('tracks', { keyPath: 'id' })
          trackStore.createIndex('artist', 'artist')
        }
        
        // Store pour les données utilisateur
        if (!db.objectStoreNames.contains('user_data')) {
          db.createObjectStore('user_data', { keyPath: 'key' })
        }
        
        // Store pour les actions en attente
        if (!db.objectStoreNames.contains('pending_actions')) {
          const actionStore = db.createObjectStore('pending_actions', { 
            keyPath: 'id',
            autoIncrement: true 
          })
          actionStore.createIndex('type', 'type')
          actionStore.createIndex('created_at', 'created_at')
        }
      }
    })
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.syncPendingActions()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // Sauvegarder une vidéo pour lecture hors ligne
  async saveVideoForOffline(video) {
    try {
      // Télécharger la vidéo
      const response = await fetch(video.video_url)
      const blob = await response.blob()
      
      // Stocker dans IndexedDB
      await this.db.put('videos', {
        ...video,
        video_blob: blob,
        downloaded_at: new Date().toISOString()
      })
      
      return true
    } catch (error) {
      console.error('Error saving video offline:', error)
      return false
    }
  }

  // Récupérer une vidéo hors ligne
  async getVideoOffline(videoId) {
    try {
      return await this.db.get('videos', videoId)
    } catch (error) {
      console.error('Error getting offline video:', error)
      return null
    }
  }

  // Sauvegarder un morceau pour écoute hors ligne
  async saveTrackForOffline(track) {
    try {
      // Télécharger le morceau
      const response = await fetch(track.audio_url)
      const blob = await response.blob()
      
      // Stocker dans IndexedDB
      await this.db.put('tracks', {
        ...track,
        audio_blob: blob,
        downloaded_at: new Date().toISOString()
      })
      
      return true
    } catch (error) {
      console.error('Error saving track offline:', error)
      return false
    }
  }

  // Récupérer un morceau hors ligne
  async getTrackOffline(trackId) {
    try {
      return await this.db.get('tracks', trackId)
    } catch (error) {
      console.error('Error getting offline track:', error)
      return null
    }
  }

  // Sauvegarder les données utilisateur
  async saveUserData(key, data) {
    try {
      await this.db.put('user_data', {
        key,
        data,
        updated_at: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Error saving user data:', error)
      return false
    }
  }

  // Récupérer les données utilisateur
  async getUserData(key) {
    try {
      const result = await this.db.get('user_data', key)
      return result?.data
    } catch (error) {
      console.error('Error getting user data:', error)
      return null
    }
  }

  // Ajouter une action en attente (like, commentaire, etc.)
  async queueAction(action) {
    try {
      await this.db.add('pending_actions', {
        ...action,
        created_at: new Date().toISOString()
      })
      return true
    } catch (error) {
      console.error('Error queueing action:', error)
      return false
    }
  }

  // Synchroniser les actions en attente
  async syncPendingActions() {
    if (!this.isOnline) return
    
    try {
      const actions = await this.db.getAll('pending_actions')
      
      for (const action of actions) {
        try {
          // Exécuter l'action selon le type
          switch (action.type) {
            case 'like':
              await fetch(`/api/content/posts/${action.post_id}/like`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              })
              break
            case 'comment':
              await fetch(`/api/content/posts/${action.post_id}/comments`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content: action.content })
              })
              break
            case 'message':
              // Envoyer via WebSocket
              break
          }
          
          // Supprimer l'action une fois synchronisée
          await this.db.delete('pending_actions', action.id)
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error)
    }
  }

  // Supprimer les fichiers hors ligne (libérer de l'espace)
  async cleanupOfflineStorage() {
    try {
      // Supprimer les vidéos de plus de 7 jours
      const videos = await this.db.getAll('videos')
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      for (const video of videos) {
        if (new Date(video.downloaded_at) < weekAgo) {
          await this.db.delete('videos', video.id)
        }
      }
      
      // Supprimer les morceaux de plus de 30 jours
      const tracks = await this.db.getAll('tracks')
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      
      for (const track of tracks) {
        if (new Date(track.downloaded_at) < monthAgo) {
          await this.db.delete('tracks', track.id)
        }
      }
    } catch (error) {
      console.error('Error cleaning up offline storage:', error)
    }
  }

  // Récupérer l'espace utilisé
  async getStorageUsage() {
    try {
      const videos = await this.db.getAll('videos')
      const tracks = await this.db.getAll('tracks')
      
      let totalSize = 0
      for (const video of videos) {
        totalSize += video.video_blob?.size || 0
      }
      for (const track of tracks) {
        totalSize += track.audio_blob?.size || 0
      }
      
      return {
        total: totalSize,
        videos: videos.length,
        tracks: tracks.length,
        humanReadable: this.formatBytes(totalSize)
      }
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return { total: 0, videos: 0, tracks: 0, humanReadable: '0 B' }
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

export const offlineService = new OfflineService()
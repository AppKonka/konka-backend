// frontend/src/modules/shared/services/exportService.js
import { supabase } from '../../../config/supabase'

class ExportService {
  async exportUserData(userId, format = 'json') {
    try {
      // Collecter toutes les données de l'utilisateur
      const data = await this.collectAllUserData(userId)
      
      // Exporter selon le format
      if (format === 'json') {
        return this.exportToJSON(data)
      } else if (format === 'csv') {
        return this.exportToCSV(data)
      }
      
      return this.exportToJSON(data)
    } catch (error) {
      console.error('Erreur lors de l\'export des données:', error)
      throw error
    }
  }

  async collectAllUserData(userId) {
    const [
      profile,
      posts,
      videos,
      tracks,
      products,
      orders,
      favorites,
      messages,
      follows,
      sparks
    ] = await Promise.all([
      // Profil utilisateur
      supabase.from('users').select('*').eq('id', userId).single(),
      
      // Posts
      supabase.from('posts').select('*').eq('user_id', userId),
      
      // Vidéos
      supabase.from('videos').select('*').eq('user_id', userId),
      
      // Morceaux (si artiste)
      supabase.from('tracks').select('*').eq('artist_id', userId),
      
      // Produits (si vendeur)
      supabase.from('products').select('*').eq('seller_id', userId),
      
      // Commandes
      supabase.from('orders').select('*').eq('buyer_id', userId),
      
      // Favoris
      supabase.from('favorites').select('*, product:products(*)').eq('user_id', userId),
      
      // Messages (via matchs)
      this.getUserMessages(userId),
      
      // Abonnements
      supabase.from('follows').select('*').or(`follower_id.eq.${userId},following_id.eq.${userId}`),
      
      // Sparks
      supabase.from('sparks').select('*').eq('user_id', userId)
    ])

    return {
      export_date: new Date().toISOString(),
      user_id: userId,
      profile: profile.data || null,
      posts: posts.data || [],
      videos: videos.data || [],
      tracks: tracks.data || [],
      products: products.data || [],
      orders: orders.data || [],
      favorites: favorites.data || [],
      messages: messages || [],
      follows: follows.data || [],
      sparks: sparks.data || [],
    }
  }

  async getUserMessages(userId) {
    try {
      // Récupérer les matchs de l'utilisateur
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      
      if (!matches || matches.length === 0) return []
      
      const matchIds = matches.map(m => m.id)
      
      // Récupérer les messages
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
      
      return messages || []
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error)
      return []
    }
  }

  exportToJSON(data) {
    const jsonString = JSON.stringify(data, null, 2)
    return new Blob([jsonString], { type: 'application/json' })
  }

  exportToCSV(data) {
    // Créer un CSV simple avec les principales sections
    const rows = []
    
    // En-tête
    rows.push(['Section', 'Données'])
    
    // Profil
    if (data.profile) {
      rows.push(['Profil', JSON.stringify(data.profile)])
    }
    
    // Posts
    data.posts.forEach(post => {
      rows.push(['Post', JSON.stringify(post)])
    })
    
    // Vidéos
    data.videos.forEach(video => {
      rows.push(['Vidéo', JSON.stringify(video)])
    })
    
    // etc.
    
    const csvString = rows.map(row => row.join(',')).join('\n')
    return new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const exportService = new ExportService()
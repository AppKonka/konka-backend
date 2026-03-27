// src/modules/artist/pages/MusicManagement.jsx
import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { Header } from '../../shared/components/layout/Header'
import { BottomNavigation } from '../../shared/components/layout/BottomNavigation'
import { Button } from '../../shared/components/ui/Button'
import { MusicPlayer } from '../../shared/components/layout/MusicPlayer'
import { useAuth } from '../../shared/context/AuthContext'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.background};
  padding-bottom: 80px;
`

const HeaderSection = styled.div`
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #FF6B35, #FF4D1E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const AddButton = styled(motion.button)`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const TabsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 0 16px;
  border-bottom: 1px solid ${props => props.theme.border};
`

const Tab = styled(motion.button)`
  padding: 12px 0;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: ${props => props.active ? props.theme.primary : props.theme.textSecondary};
  border-bottom: 2px solid ${props => props.active ? props.theme.primary : 'transparent'};
  cursor: pointer;
`

const TracksList = styled.div`
  padding: 16px;
`

const TrackCard = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: ${props => props.theme.shadow.sm};
`

const TrackCover = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
`

const TrackInfo = styled.div`
  flex: 1;
`

const TrackTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const TrackStats = styled.div`
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const TrackActions = styled.div`
  display: flex;
  gap: 8px;
`

const ActionButton = styled(motion.button)`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: ${props => props.theme.textSecondary};
  
  &:hover {
    color: ${props => props.theme.primary};
  }
`

const Modal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`

const ModalContent = styled(motion.div)`
  background: ${props => props.theme.surface};
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
`

const ModalHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid ${props => props.theme.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
`

const ModalBody = styled.div`
  padding: 20px;
`

const FormGroup = styled.div`
  margin-bottom: 16px;
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
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
  min-height: 100px;
  resize: vertical;
  
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
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const FileInput = styled.input`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.background};
  color: ${props => props.theme.text};
  font-size: 16px;
`

const ModalFooter = styled.div`
  padding: 20px;
  border-top: 1px solid ${props => props.theme.border};
  display: flex;
  gap: 12px;
`

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
`

const MusicManagement = () => {
  const [activeTab, setActiveTab] = useState('tracks')
  const [tracks, setTracks] = useState([])
  const [albums, setAlbums] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    lyrics: '',
    visibility: 'public',
    cover_url: '',
    audio_file: null,
  })
  const [uploading, setUploading] = useState(false)
  
  const { user } = useAuth()

  const loadMusic = useCallback(async () => {
    setLoading(true)
    try {
      const { data: tracksData, error: tracksError } = await supabase
        .from('tracks')
        .select('*')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })
      
      if (tracksError) throw tracksError
      
      setTracks(tracksData || [])
      
      const { data: albumsData, error: albumsError } = await supabase
        .from('albums')
        .select('*')
        .eq('artist_id', user.id)
        .order('created_at', { ascending: false })
      
      if (albumsError) throw albumsError
      
      setAlbums(albumsData || [])
      
      console.log('✅ Musique chargée:', {
        tracks: tracksData?.length || 0,
        albums: albumsData?.length || 0,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading music:', error)
      toast.error('Erreur lors du chargement de la musique')
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    loadMusic()
  }, [loadMusic])

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, audio_file: file })
      console.log('🎵 Fichier audio sélectionné:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type
      })
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setFormData({ ...formData, cover_url: url })
      console.log('🖼️ Image de couverture sélectionnée:', {
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        type: file.type
      })
    }
  }

  const uploadFile = async (file, path) => {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `${path}/${user.id}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file)
    
    if (error) throw error
    
    // Sauvegarder les informations du fichier uploadé
    console.log('✅ Fichier uploadé avec succès:', {
      path: data.path,
      id: data.id,
      bucketId: data.bucket_id,
      filePath: filePath
    })
    
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.audio_file) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }
    
    setUploading(true)
    try {
      let audioUrl = null
      let coverUrl = null
      
      // Upload audio
      audioUrl = await uploadFile(formData.audio_file, 'tracks')
      
      // Upload cover if exists
      if (formData.cover_url && formData.cover_url.startsWith('blob:')) {
        const coverFile = await fetch(formData.cover_url).then(r => r.blob())
        coverUrl = await uploadFile(coverFile, 'covers')
      }
      
      const { data, error } = await supabase
        .from('tracks')
        .insert({
          artist_id: user.id,
          title: formData.title,
          genre: formData.genre,
          lyrics: formData.lyrics,
          is_public: formData.visibility === 'public',
          cover_url: coverUrl || formData.cover_url,
          audio_url: audioUrl,
          created_at: new Date().toISOString()
        })
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('🎵 Morceau publié avec succès:', {
          trackId: data[0].id,
          title: data[0].title,
          genre: data[0].genre,
          visibility: data[0].is_public ? 'public' : 'private'
        })
        
        toast.success('Morceau publié avec succès !')
      }
      
      setShowModal(false)
      setFormData({
        title: '',
        genre: '',
        lyrics: '',
        visibility: 'public',
        cover_url: '',
        audio_file: null,
      })
      loadMusic()
    } catch (error) {
      console.error('Error uploading track:', error)
      toast.error('Erreur lors de la publication du morceau')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteTrack = async (trackId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce morceau ? Cette action est irréversible.')) {
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId)
        .select()
      
      if (error) throw error
      
      if (data && data[0]) {
        console.log('🗑️ Morceau supprimé:', {
          trackId: data[0].id,
          title: data[0].title
        })
        
        toast.success('Morceau supprimé avec succès')
      }
      
      loadMusic()
    } catch (error) {
      console.error('Error deleting track:', error)
      toast.error('Erreur lors de la suppression du morceau')
    }
  }

  const handleEditTrack = (track) => {
    console.log('✏️ Édition du morceau:', track.title)
    // Implémenter la logique d'édition
    toast.info('Fonctionnalité d\'édition à venir')
  }

  const handleViewStats = (track) => {
    console.log('📊 Statistiques du morceau:', {
      title: track.title,
      plays: track.play_count,
      likes: track.like_count,
      comments: track.comment_count
    })
    toast.info(`Statistiques: ${track.play_count || 0} écoutes, ${track.like_count || 0} likes`)
  }

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num?.toString() || '0'
  }

  // Calculer les statistiques totales
  const totalStats = {
    totalPlays: tracks.reduce((sum, t) => sum + (t.play_count || 0), 0),
    totalLikes: tracks.reduce((sum, t) => sum + (t.like_count || 0), 0),
    totalComments: tracks.reduce((sum, t) => sum + (t.comment_count || 0), 0)
  }

  if (loading) {
    return (
      <Container>
        <Header title="Ma Musique" showProfile showBack />
        <LoadingSpinner>
          <div>Chargement de votre musique...</div>
        </LoadingSpinner>
        <MusicPlayer />
        <BottomNavigation />
      </Container>
    )
  }

  return (
    <Container>
      <Header title="Ma Musique" showProfile showBack />
      
      <HeaderSection>
        <Title>Ma Musique</Title>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#888' }}>
            📊 {formatNumber(totalStats.totalPlays)} écoutes • {formatNumber(totalStats.totalLikes)} likes
          </div>
          <AddButton onClick={() => setShowModal(true)} whileTap={{ scale: 0.95 }}>
            +
          </AddButton>
        </div>
      </HeaderSection>
      
      <TabsContainer>
        <Tab
          active={activeTab === 'tracks'}
          onClick={() => setActiveTab('tracks')}
        >
          Morceaux ({tracks.length})
        </Tab>
        <Tab
          active={activeTab === 'albums'}
          onClick={() => setActiveTab('albums')}
        >
          Albums ({albums.length})
        </Tab>
      </TabsContainer>
      
      {activeTab === 'tracks' ? (
        <TracksList>
          {tracks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
              Aucun morceau publié
              <div style={{ fontSize: 13, marginTop: 8 }}>
                Cliquez sur "+" pour publier votre premier morceau
              </div>
            </div>
          ) : (
            tracks.map(track => (
              <TrackCard key={track.id} whileTap={{ scale: 0.98 }}>
                <TrackCover src={track.cover_url || '/images/default-album.jpg'} />
                <TrackInfo>
                  <TrackTitle>{track.title}</TrackTitle>
                  <TrackStats>
                    <span>{formatNumber(track.play_count)} écoutes</span>
                    <span>{track.like_count || 0} ❤️</span>
                    <span>{track.comment_count || 0} 💬</span>
                  </TrackStats>
                </TrackInfo>
                <TrackActions>
                  <ActionButton 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleViewStats(track)}
                    title="Voir les statistiques"
                  >
                    📊
                  </ActionButton>
                  <ActionButton 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEditTrack(track)}
                    title="Modifier"
                  >
                    ✏️
                  </ActionButton>
                  <ActionButton
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteTrack(track.id)}
                    title="Supprimer"
                  >
                    🗑️
                  </ActionButton>
                </TrackActions>
              </TrackCard>
            ))
          )}
        </TracksList>
      ) : (
        <TracksList>
          {albums.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💿</div>
              Aucun album publié
            </div>
          ) : (
            albums.map(album => (
              <TrackCard key={album.id} whileTap={{ scale: 0.98 }}>
                <TrackCover src={album.cover_url || '/images/default-album.jpg'} />
                <TrackInfo>
                  <TrackTitle>{album.title}</TrackTitle>
                  <TrackStats>
                    <span>{album.track_count || 0} morceaux</span>
                    <span>{album.release_date}</span>
                  </TrackStats>
                </TrackInfo>
                <TrackActions>
                  <ActionButton whileTap={{ scale: 0.9 }}>
                    📊
                  </ActionButton>
                  <ActionButton whileTap={{ scale: 0.9 }}>
                    ✏️
                  </ActionButton>
                </TrackActions>
              </TrackCard>
            ))
          )}
        </TracksList>
      )}
      
      <MusicPlayer />
      <BottomNavigation />
      
      {showModal && (
        <Modal
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowModal(false)}
        >
          <ModalContent
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <ModalHeader>
              <ModalTitle>Publier un morceau</ModalTitle>
              <button onClick={() => setShowModal(false)} style={{ fontSize: 24 }}>✕</button>
            </ModalHeader>
            
            <ModalBody>
              <FormGroup>
                <Label>Titre du morceau *</Label>
                <Input
                  placeholder="Titre..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Fichier audio *</Label>
                <FileInput
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Pochette</Label>
                <FileInput
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {formData.cover_url && (
                  <img
                    src={formData.cover_url}
                    alt="Cover preview"
                    style={{ width: 100, height: 100, marginTop: 8, borderRadius: 8 }}
                  />
                )}
              </FormGroup>
              
              <FormGroup>
                <Label>Genre</Label>
                <Select
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                >
                  <option value="">Sélectionner un genre</option>
                  <option value="rap">Rap</option>
                  <option value="rumba">Rumba</option>
                  <option value="amapiano">Amapiano</option>
                  <option value="afro">Afro</option>
                  <option value="rock">Rock</option>
                  <option value="pop">Pop</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label>Paroles</Label>
                <TextArea
                  placeholder="Écris les paroles..."
                  value={formData.lyrics}
                  onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                />
              </FormGroup>
              
              <FormGroup>
                <Label>Visibilité</Label>
                <Select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                  <option value="subscribers">Réservé aux abonnés</option>
                </Select>
              </FormGroup>
            </ModalBody>
            
            <ModalFooter>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setShowModal(false)}
              >
                Annuler
              </Button>
              <Button
                fullWidth
                onClick={handleSubmit}
                disabled={uploading || !formData.title || !formData.audio_file}
              >
                {uploading ? 'Publication...' : 'Publier'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Container>
  )
}

export default MusicManagement
// src/modules/fan/components/Sparks/SparkCreation.jsx
import React, { useState, useRef } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../../shared/context/AuthContext'
import { supabase } from '../../../../config/supabase'
import { toast } from 'react-hot-toast'

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  color: white;
`

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
`

const MediaPreview = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  margin: 16px;
  border-radius: 24px;
  overflow: hidden;
  
  img, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
`

const Options = styled.div`
  padding: 16px;
  background: rgba(0,0,0,0.5);
  border-radius: 24px;
  margin: 16px;
`

const DurationSelector = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`

const DurationButton = styled(motion.button)`
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: ${props => props.selected ? props.theme.primary : 'rgba(255,255,255,0.2)'};
  color: white;
  font-size: 14px;
  cursor: pointer;
`

const CaptionInput = styled.input`
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 16px;
  margin-bottom: 16px;
  
  &::placeholder {
    color: rgba(255,255,255,0.5);
  }
`

const PublishButton = styled(motion.button)`
  width: 100%;
  padding: 14px;
  border-radius: 28px;
  background: ${props => props.theme.primary};
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
`

const durations = [
  { label: '30 min', value: 30 },
  { label: '1h', value: 60 },
  { label: '6h', value: 360 },
  { label: '12h', value: 720 },
  { label: '24h', value: 1440 },
]

export const SparkCreation = ({ onClose, onSuccess }) => {
  const [media, setMedia] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const [duration, setDuration] = useState(1440)
  const [caption, setCaption] = useState('')
  const [isLive, setIsLive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { user } = useAuth()

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const url = URL.createObjectURL(file)
    const type = file.type.startsWith('image/') ? 'photo' : 'video'
    
    setMedia(url)
    setMediaType(type)
    
    console.log('📁 Fichier sélectionné:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
      mediaType: type
    })
  }

  const handleLiveToggle = () => {
    setIsLive(!isLive)
    if (!isLive) {
      setMedia(null)
      setMediaType(null)
    }
    console.log('🔴 Mode live:', !isLive ? 'activé' : 'désactivé')
  }

  const uploadMedia = async (file) => {
    const fileName = `${Date.now()}_${file.name}`
    const filePath = `sparks/${user.id}/${fileName}`
    
    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file)
    
    if (error) throw error
    
    // Utiliser data pour les logs et la traçabilité
    console.log('✅ Fichier uploadé avec succès:', {
      fileName: data.path,
      fileId: data.id,
      bucketId: data.bucket_id,
      filePath: filePath,
      size: file.size,
      uploadedAt: new Date().toISOString()
    })
    
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    return publicUrl
  }

  const handlePublish = async () => {
    if (!media && !isLive) {
      toast.error('Veuillez sélectionner un média ou activer le live')
      return
    }
    
    setUploading(true)
    
    try {
      let mediaUrl = null
      let uploadedFileInfo = null
      
      if (media && !isLive) {
        const file = fileInputRef.current.files[0]
        mediaUrl = await uploadMedia(file)
        
        // Enregistrer les informations du fichier uploadé (optionnel)
        uploadedFileInfo = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedAt: new Date().toISOString()
        }
      }
      
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + duration)
      
      const { data, error } = await supabase
        .from('sparks')
        .insert({
          user_id: user.id,
          type: isLive ? 'live' : mediaType,
          media_url: mediaUrl,
          duration_minutes: duration,
          expires_at: expiresAt.toISOString(),
          description: caption,
          is_live: isLive,
          metadata: uploadedFileInfo ? { fileInfo: uploadedFileInfo } : null
        })
        .select()
      
      if (error) throw error
      
      // Utiliser data pour confirmer la publication
      if (data && data[0]) {
        console.log('✨ Spark publié avec succès:', {
          sparkId: data[0].id,
          type: data[0].type,
          duration: data[0].duration_minutes,
          expiresAt: data[0].expires_at,
          isLive: data[0].is_live
        })
        
        toast.success('Spark publié avec succès !')
      }
      
      onSuccess()
    } catch (error) {
      console.error('Error publishing spark:', error)
      toast.error('Erreur lors de la publication du Spark')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Header>
        <Title>Créer un Spark</Title>
        <CloseButton onClick={onClose}>✕</CloseButton>
      </Header>
      
      {!media && !isLive && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.button
            onClick={() => fileInputRef.current.click()}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: 40,
              cursor: 'pointer',
            }}
            whileTap={{ scale: 0.95 }}
          >
            +
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>
      )}
      
      {media && (
        <MediaPreview>
          {mediaType === 'photo' ? (
            <img src={media} alt="Preview" />
          ) : (
            <video src={media} controls autoPlay loop />
          )}
        </MediaPreview>
      )}
      
      {isLive && (
        <MediaPreview>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔴</div>
            <div>Live en direct</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>Partage ce que tu fais en temps réel</div>
          </div>
        </MediaPreview>
      )}
      
      <Options>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ color: 'white' }}>
            <input
              type="checkbox"
              checked={isLive}
              onChange={handleLiveToggle}
              style={{ marginRight: 8 }}
            />
            Spark réel (Live)
          </label>
        </div>
        
        {!isLive && (
          <DurationSelector>
            {durations.map(d => (
              <DurationButton
                key={d.value}
                selected={duration === d.value}
                onClick={() => setDuration(d.value)}
                whileTap={{ scale: 0.95 }}
              >
                {d.label}
              </DurationButton>
            ))}
          </DurationSelector>
        )}
        
        <CaptionInput
          type="text"
          placeholder="Ajouter une légende..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={100}
        />
        
        <PublishButton
          onClick={handlePublish}
          disabled={uploading || (!media && !isLive)}
          whileTap={{ scale: 0.98 }}
        >
          {uploading ? 'Publication...' : 'Publier'}
        </PublishButton>
      </Options>
    </Overlay>
  )
}
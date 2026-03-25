// src/modules/shared/context/PlayerContext.jsx
import React, { createContext, useState, useContext, useRef, useCallback } from 'react'

const PlayerContext = createContext()

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [repeatMode, setRepeatMode] = useState('none') // none, one, all
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledQueue, setShuffledQueue] = useState([])
  
  const audioRef = useRef(null)

  // Jouer un morceau
  const playTrack = useCallback((track, index = 0) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    setProgress(0)
    setDuration(0)
    if (index !== -1) setCurrentIndex(index)
  }, [])

  // Pause
  const pauseTrack = useCallback(() => {
    setIsPlaying(false)
  }, [])

  // Reprendre
  const resumeTrack = useCallback(() => {
    setIsPlaying(true)
  }, [])

  // Morceau suivant
  const nextTrack = useCallback(() => {
    const currentQueue = isShuffled ? shuffledQueue : queue
    
    if (repeatMode === 'one' && currentTrack) {
      // Rejouer le même morceau
      playTrack(currentTrack, currentIndex)
      return
    }
    
    let nextIndex = currentIndex + 1
    
    if (nextIndex >= currentQueue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0
      } else {
        // Fin de la playlist
        setIsPlaying(false)
        return
      }
    }
    
    const nextTrackData = currentQueue[nextIndex]
    if (nextTrackData) {
      playTrack(nextTrackData, nextIndex)
    }
  }, [currentIndex, queue, shuffledQueue, isShuffled, repeatMode, currentTrack, playTrack])

  // Morceau précédent
  const previousTrack = useCallback(() => {
    const currentQueue = isShuffled ? shuffledQueue : queue
    
    if (progress > 0.05) {
      // Revenir au début du morceau actuel
      if (audioRef.current) {
        audioRef.current.currentTime = 0
      }
      return
    }
    
    let prevIndex = currentIndex - 1
    
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = currentQueue.length - 1
      } else {
        return
      }
    }
    
    const prevTrackData = currentQueue[prevIndex]
    if (prevTrackData) {
      playTrack(prevTrackData, prevIndex)
    }
  }, [currentIndex, queue, shuffledQueue, isShuffled, repeatMode, progress, playTrack])

  // Ajouter à la file d'attente
  const addToQueue = useCallback((track) => {
    setQueue(prev => [...prev, track])
  }, [])

  // Ajouter une playlist
  const addPlaylistToQueue = useCallback((tracks) => {
    setQueue(prev => [...prev, ...tracks])
  }, [])

  // Supprimer de la file
  const removeFromQueue = useCallback((index) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Vider la file
  const clearQueue = useCallback(() => {
    setQueue([])
    setCurrentTrack(null)
    setIsPlaying(false)
    setCurrentIndex(-1)
  }, [])

  // Activer/désactiver la lecture aléatoire
  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      if (!prev) {
        // Créer une playlist aléatoire
        const newShuffled = [...queue]
        for (let i = newShuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[newShuffled[i], newShuffled[j]] = [newShuffled[j], newShuffled[i]]
        }
        setShuffledQueue(newShuffled)
        // Réinitialiser l'index si nécessaire
        if (currentTrack) {
          const newIndex = newShuffled.findIndex(t => t.id === currentTrack.id)
          setCurrentIndex(newIndex)
        }
      } else {
        // Revenir à l'ordre original
        if (currentTrack) {
          const originalIndex = queue.findIndex(t => t.id === currentTrack.id)
          setCurrentIndex(originalIndex)
        }
      }
      return !prev
    })
  }, [queue, currentTrack])

  // Changer mode répétition
  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'one'
      if (prev === 'one') return 'all'
      return 'none'
    })
  }, [])

  // Changer volume
  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }, [])

  // Mute/unmute
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume => prevVolume || 0.7)
      if (audioRef.current) {
        audioRef.current.volume = volume || 0.7
      }
      setIsMuted(false)
    } else {
      if (audioRef.current) {
        audioRef.current.volume = 0
      }
      setIsMuted(true)
    }
  }, [isMuted, volume])

  // Chercher dans le morceau
  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }, [])

  // Mettre à jour la progression
  const updateProgress = useCallback((currentTime, duration) => {
    setProgress(currentTime / duration)
  }, [])

  // Mettre à jour la durée
  const updateDuration = useCallback((duration) => {
    setDuration(duration)
  }, [])

  const value = {
    currentTrack,
    isPlaying,
    queue,
    progress,
    duration,
    volume,
    isMuted,
    isExpanded,
    repeatMode,
    isShuffled,
    audioRef,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    addToQueue,
    addPlaylistToQueue,
    removeFromQueue,
    clearQueue,
    toggleShuffle,
    toggleRepeat,
    changeVolume,
    toggleMute,
    seekTo,
    updateProgress,
    updateDuration,
    setIsExpanded,
  }

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  )
}
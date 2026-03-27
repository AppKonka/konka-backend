// src/modules/shared/context/PlayerProvider.jsx
import React, { useState, useRef, useCallback } from 'react'
import { PlayerContext } from './PlayerContext'

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
  const [repeatMode, setRepeatMode] = useState('none')
  const [isShuffled, setIsShuffled] = useState(false)
  const [shuffledQueue, setShuffledQueue] = useState([])
  
  const audioRef = useRef(null)

  const playTrack = useCallback((track, index = 0) => {
    setCurrentTrack(track)
    setIsPlaying(true)
    setProgress(0)
    setDuration(0)
    if (index !== -1) setCurrentIndex(index)
    console.log('🎵 Lecture du morceau:', track.title)
  }, [])

  const pauseTrack = useCallback(() => {
    setIsPlaying(false)
    console.log('⏸️ Pause')
  }, [])

  const resumeTrack = useCallback(() => {
    setIsPlaying(true)
    console.log('▶️ Reprise')
  }, [])

  const nextTrack = useCallback(() => {
    const currentQueue = isShuffled ? shuffledQueue : queue
    
    if (repeatMode === 'one' && currentTrack) {
      playTrack(currentTrack, currentIndex)
      return
    }
    
    let nextIndex = currentIndex + 1
    
    if (nextIndex >= currentQueue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0
      } else {
        setIsPlaying(false)
        return
      }
    }
    
    const nextTrackData = currentQueue[nextIndex]
    if (nextTrackData) {
      playTrack(nextTrackData, nextIndex)
      console.log('⏭️ Morceau suivant:', nextTrackData.title)
    }
  }, [currentIndex, queue, shuffledQueue, isShuffled, repeatMode, currentTrack, playTrack])

  const previousTrack = useCallback(() => {
    const currentQueue = isShuffled ? shuffledQueue : queue
    
    if (progress > 0.05) {
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
      console.log('⏮️ Morceau précédent:', prevTrackData.title)
    }
  }, [currentIndex, queue, shuffledQueue, isShuffled, repeatMode, progress, playTrack])

  const addToQueue = useCallback((track) => {
    setQueue(prev => [...prev, track])
    console.log('➕ Morceau ajouté à la file:', track.title)
  }, [])

  const addPlaylistToQueue = useCallback((tracks) => {
    setQueue(prev => [...prev, ...tracks])
    console.log('📋 Playlist ajoutée à la file:', tracks.length, 'morceaux')
  }, [])

  const removeFromQueue = useCallback((index) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
    console.log('❌ Morceau retiré de la file à l\'index:', index)
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
    setCurrentTrack(null)
    setIsPlaying(false)
    setCurrentIndex(-1)
    console.log('🗑️ File d\'attente vidée')
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => {
      if (!prev) {
        const newShuffled = [...queue]
        for (let i = newShuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[newShuffled[i], newShuffled[j]] = [newShuffled[j], newShuffled[i]]
        }
        setShuffledQueue(newShuffled)
        if (currentTrack) {
          const newIndex = newShuffled.findIndex(t => t.id === currentTrack.id)
          setCurrentIndex(newIndex)
        }
        console.log('🔀 Lecture aléatoire activée')
      } else {
        if (currentTrack) {
          const originalIndex = queue.findIndex(t => t.id === currentTrack.id)
          setCurrentIndex(originalIndex)
        }
        console.log('🔀 Lecture aléatoire désactivée')
      }
      return !prev
    })
  }, [queue, currentTrack])

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const newMode = prev === 'none' ? 'one' : prev === 'one' ? 'all' : 'none'
      console.log('🔁 Mode répétition:', newMode === 'none' ? 'désactivé' : newMode === 'one' ? 'un morceau' : 'tous')
      return newMode
    })
  }, [])

  const changeVolume = useCallback((newVolume) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
    console.log('🔊 Volume modifié:', newVolume)
  }, [])

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume => prevVolume || 0.7)
      if (audioRef.current) {
        audioRef.current.volume = volume || 0.7
      }
      setIsMuted(false)
      console.log('🔊 Son activé')
    } else {
      if (audioRef.current) {
        audioRef.current.volume = 0
      }
      setIsMuted(true)
      console.log('🔇 Son coupé')
    }
  }, [isMuted, volume])

  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      console.log('⏩ Recherche à:', time, 'secondes')
    }
  }, [])

  const updateProgress = useCallback((currentTime, duration) => {
    setProgress(currentTime / duration)
  }, [])

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
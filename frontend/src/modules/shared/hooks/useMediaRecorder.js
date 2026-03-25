// src/modules/shared/hooks/useMediaRecorder.js
import { useState, useEffect, useRef, useCallback } from 'react'

export const useMediaRecorder = (options = {}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [error, setError] = useState(null)
  const [duration, setDuration] = useState(0)
  
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  const startRecording = useCallback(async (type = 'audio') => {
    try {
      // Arrêter toute enregistrement existant
      if (mediaRecorderRef.current && isRecording) {
        stopRecording()
      }
      
      // Demander la permission d'accès au micro/caméra
      const constraints = type === 'audio' 
        ? { audio: true }
        : { audio: true, video: { facingMode: 'user' } }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      
      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: type === 'audio' ? 'audio/webm' : 'video/webm' 
        })
        const url = URL.createObjectURL(blob)
        
        if (type === 'audio') {
          setAudioUrl(url)
        } else {
          setVideoUrl(url)
        }
      }
      
      mediaRecorder.start(1000) // Enregistrer par segments de 1 seconde
      setIsRecording(true)
      setError(null)
      setDuration(0)
      
      // Timer pour la durée
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      setError(err.message)
      console.error('Error starting recording:', err)
    }
  }, [options, isRecording])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
      setIsRecording(false)
    }
  }, [isRecording])

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
    setDuration(0)
  }, [audioUrl, videoUrl])

  const downloadRecording = useCallback((type = 'audio') => {
    const url = type === 'audio' ? audioUrl : videoUrl
    if (!url) return
    
    const a = document.createElement('a')
    a.href = url
    a.download = `recording_${Date.now()}.${type === 'audio' ? 'webm' : 'webm'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [audioUrl, videoUrl])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [audioUrl, videoUrl])

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    isRecording,
    audioUrl,
    videoUrl,
    error,
    duration: formatDuration(duration),
    startRecording,
    stopRecording,
    resetRecording,
    downloadRecording
  }
}
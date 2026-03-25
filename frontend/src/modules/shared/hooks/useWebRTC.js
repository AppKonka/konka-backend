// src/modules/shared/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react'

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:turn.konka.app',
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL
    }
  ]
}

export const useWebRTC = ({ onRemoteStream, onConnectionStateChange }) => {
  const [localStream, setLocalStream] = useState(null)
  const [peerConnection, setPeerConnection] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (peerRef.current) {
        peerRef.current.close()
      }
    }
  }, [])

  const initLocalStream = useCallback(async (audio = true, video = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: video ? { facingMode: 'user' } : false
      })
      setLocalStream(stream)
      localStreamRef.current = stream
      return stream
    } catch (error) {
      console.error('Error accessing media devices:', error)
      throw error
    }
  }, [])

  const createPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection(configuration)
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Envoyer le candidat ICE via le serveur de signalisation
        onIceCandidate?.(event.candidate)
      }
    }
    
    pc.ontrack = (event) => {
      if (onRemoteStream) {
        onRemoteStream(event.streams[0])
      }
    }
    
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      setIsConnected(state === 'connected')
      onConnectionStateChange?.(state)
    }
    
    peerRef.current = pc
    setPeerConnection(pc)
    return pc
  }, [onRemoteStream, onConnectionStateChange])

  const addLocalStream = useCallback(async (pc, stream) => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })
  }, [])

  const createOffer = useCallback(async () => {
    if (!peerRef.current) {
      await createPeerConnection()
    }
    
    const pc = peerRef.current
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }, [createPeerConnection])

  const createAnswer = useCallback(async (offer) => {
    if (!peerRef.current) {
      await createPeerConnection()
    }
    
    const pc = peerRef.current
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }, [createPeerConnection])

  const setRemoteAnswer = useCallback(async (answer) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }, [])

  const addIceCandidate = useCallback(async (candidate) => {
    if (peerRef.current) {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return audioTrack.enabled
      }
    }
    return false
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return videoTrack.enabled
      }
    }
    return false
  }, [])

  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
    setLocalStream(null)
    setPeerConnection(null)
    setIsConnected(false)
  }, [])

  return {
    localStream,
    peerConnection,
    isConnected,
    initLocalStream,
    createPeerConnection,
    addLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleAudio,
    toggleVideo,
    endCall
  }
}
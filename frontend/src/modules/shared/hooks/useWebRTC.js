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

export const useWebRTC = ({ onRemoteStream, onConnectionStateChange, onIceCandidate }) => {
  const [localStream, setLocalStream] = useState(null)
  const [peerConnection, setPeerConnection] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
        console.log('🎥 Local stream stopped')
      }
      if (peerRef.current) {
        peerRef.current.close()
        console.log('🔌 Peer connection closed')
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
      setIsAudioEnabled(audio)
      setIsVideoEnabled(video)
      
      console.log('📷 Local stream initialized:', {
        audio,
        video,
        tracks: stream.getTracks().length
      })
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
        if (onIceCandidate) {
          onIceCandidate(event.candidate)
          console.log('🧊 ICE candidate sent:', event.candidate.type)
        }
      }
    }
    
    pc.ontrack = (event) => {
      if (onRemoteStream) {
        onRemoteStream(event.streams[0])
        console.log('📡 Remote stream received')
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState
      console.log('🔌 ICE connection state:', state)
    }
    
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      setIsConnected(state === 'connected')
      if (onConnectionStateChange) {
        onConnectionStateChange(state)
      }
      console.log('🔗 Connection state:', state)
    }
    
    pc.onsignalingstatechange = () => {
      console.log('📡 Signaling state:', pc.signalingState)
    }
    
    peerRef.current = pc
    setPeerConnection(pc)
    return pc
  }, [onRemoteStream, onConnectionStateChange, onIceCandidate])

  const addLocalStream = useCallback(async (pc, stream) => {
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
      console.log('➕ Track added:', track.kind)
    })
  }, [])

  const createOffer = useCallback(async () => {
    if (!peerRef.current) {
      await createPeerConnection()
    }
    
    const pc = peerRef.current
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    console.log('📝 Offer created:', offer.type)
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
    console.log('📝 Answer created:', answer.type)
    return answer
  }, [createPeerConnection])

  const setRemoteAnswer = useCallback(async (answer) => {
    if (peerRef.current) {
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer))
      console.log('📝 Remote answer set')
    }
  }, [])

  const addIceCandidate = useCallback(async (candidate) => {
    if (peerRef.current) {
      await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      console.log('🧊 ICE candidate added:', candidate.type)
    }
  }, [])

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        const newState = !audioTrack.enabled
        audioTrack.enabled = newState
        setIsAudioEnabled(newState)
        console.log('🎤 Audio:', newState ? 'enabled' : 'disabled')
        return newState
      }
    }
    return false
  }, [])

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        const newState = !videoTrack.enabled
        videoTrack.enabled = newState
        setIsVideoEnabled(newState)
        console.log('📷 Video:', newState ? 'enabled' : 'disabled')
        return newState
      }
    }
    return false
  }, [])

  const getAudioState = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      return audioTrack ? audioTrack.enabled : false
    }
    return false
  }, [])

  const getVideoState = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      return videoTrack ? videoTrack.enabled : false
    }
    return false
  }, [])

  const endCall = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
      console.log('🔌 Call ended, peer connection closed')
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      console.log('🎥 Local stream stopped')
    }
    setLocalStream(null)
    setPeerConnection(null)
    setIsConnected(false)
  }, [])

  return {
    localStream,
    peerConnection,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    initLocalStream,
    createPeerConnection,
    addLocalStream,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    toggleAudio,
    toggleVideo,
    getAudioState,
    getVideoState,
    endCall
  }
}
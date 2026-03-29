// frontend/src/services/webrtc/webrtcService.js
import { supabase } from '../../config/supabase'

class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.iceServers = null
    this.onRemoteStream = null
    this.onCallConnected = null
    this.onCallEnded = null
  }

  async getIceServers() {
    if (this.iceServers) return this.iceServers
    try {
      const res = await fetch('/api/twilio/turn-token')
      const data = await res.json()
      if (data.ice_servers?.length) {
        this.iceServers = data.ice_servers
        return this.iceServers
      }
      throw new Error()
    } catch {
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }

  async initLocalStream(audio = true, video = false) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video: video ? { facingMode: 'user' } : false })
    this.localStream = stream
    return stream
  }

  async createPeerConnection() {
    const iceServers = await this.getIceServers()
    this.peerConnection = new RTCPeerConnection({ iceServers })
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
      })
    }
    
    this.peerConnection.onicecandidate = (e) => {
      if (e.candidate) this.sendSignal('ice-candidate', e.candidate)
    }
    
    this.peerConnection.ontrack = (e) => {
      this.remoteStream = e.streams[0]
      if (this.onRemoteStream) this.onRemoteStream(this.remoteStream)
    }
    
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState
      if (state === 'connected' && this.onCallConnected) this.onCallConnected()
      if ((state === 'disconnected' || state === 'failed') && this.onCallEnded) this.onCallEnded()
    }
    
    return this.peerConnection
  }

  async createOffer(callId, from, to) {
    await this.createPeerConnection()
    const offer = await this.peerConnection.createOffer()
    await this.peerConnection.setLocalDescription(offer)
    await this.sendSignal('offer', { callId, from, to, sdp: offer })
    return offer
  }

  async handleOffer(offer, callId, from) {
    await this.createPeerConnection()
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await this.peerConnection.createAnswer()
    await this.peerConnection.setLocalDescription(answer)
    await this.sendSignal('answer', { callId, from, to: this.currentUserId, sdp: answer })
    return answer
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  }

  async handleIceCandidate(candidate) {
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }

  async sendSignal(type, data) {
    await supabase.from('calls').insert({ type, data })
  }

  toggleAudio(enabled) {
    const track = this.localStream?.getAudioTracks()[0]
    if (track) track.enabled = enabled
  }

  toggleVideo(enabled) {
    const track = this.localStream?.getVideoTracks()[0]
    if (track) track.enabled = enabled
  }

  endCall() {
    if (this.peerConnection) this.peerConnection.close()
    if (this.localStream) this.localStream.getTracks().forEach(t => t.stop())
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    if (this.onCallEnded) this.onCallEnded()
  }
}

export const webrtcService = new WebRTCService()
// src/modules/shared/hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react'

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const [error, setError] = useState(null)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const connectRef = useRef(null)
  const maxReconnectAttempts = options.maxReconnectAttempts || 5
  const reconnectInterval = options.reconnectInterval || 3000

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
      console.log('🛑 Reconnexion annulée')
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      console.log('🔌 WebSocket fermé manuellement')
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url)
      
      wsRef.current.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        options.onOpen?.()
        console.log('🔌 WebSocket connecté:', url)
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          options.onMessage?.(data)
          console.log('📨 Message WebSocket reçu:', data)
        } catch (parseError) {
          console.error('❌ Erreur de parsing WebSocket:', parseError)
          setLastMessage(event.data)
          options.onMessage?.(event.data)
        }
      }
      
      wsRef.current.onerror = (event) => {
        setError(event)
        options.onError?.(event)
        console.error('❌ Erreur WebSocket:', event)
      }
      
      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        options.onClose?.(event)
        console.log('🔌 WebSocket déconnecté:', event.code, event.reason)
        
        // Reconnexion automatique
        if (options.autoReconnect !== false && reconnectAttempts.current < maxReconnectAttempts) {
          console.log(`🔄 Tentative de reconnexion ${reconnectAttempts.current + 1}/${maxReconnectAttempts} dans ${reconnectInterval}ms`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            if (connectRef.current) {
              connectRef.current()
            }
          }, reconnectInterval)
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.log('❌ Échec de reconnexion après', maxReconnectAttempts, 'tentatives')
          setError(new Error('Max reconnection attempts reached'))
        }
      }
    } catch (connectionError) {
      console.error('❌ Erreur de connexion WebSocket:', connectionError)
      setError(connectionError)
      options.onError?.(connectionError)
    }
  }, [url, options, maxReconnectAttempts, reconnectInterval])

  // Stocker la fonction connect dans une ref
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      wsRef.current.send(message)
      console.log('📤 Message WebSocket envoyé:', message)
      return true
    }
    console.warn('⚠️ Impossible d\'envoyer le message, WebSocket non connecté')
    return false
  }, [])

  const sendMessage = useCallback((type, payload) => {
    const message = { type, payload, timestamp: new Date().toISOString() }
    console.log(`📤 Envoi message type "${type}":`, payload)
    return send(message)
  }, [send])

  // Gérer la connexion initiale dans un effet séparé
  useEffect(() => {
    let isMounted = true
    
    const initializeConnection = () => {
      if (isMounted && connectRef.current) {
        connectRef.current()
      }
    }
    
    initializeConnection()
    
    return () => {
      isMounted = false
      disconnect()
    }
  }, [disconnect]) // Note: connect n'est pas dans les dépendances car on utilise la ref

  // Afficher le statut de connexion dans la console
  useEffect(() => {
    console.log(`🔌 Statut WebSocket: ${isConnected ? 'Connecté' : 'Déconnecté'}`)
  }, [isConnected])

  return {
    isConnected,
    lastMessage,
    error,
    send,
    sendMessage,
    disconnect
  }
}
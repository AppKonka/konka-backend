// src/modules/shared/hooks/useWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react'

export const useWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState(null)
  const [error, setError] = useState(null)
  
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = options.maxReconnectAttempts || 5
  const reconnectInterval = options.reconnectInterval || 3000

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url)
      
      wsRef.current.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        options.onOpen?.()
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          options.onMessage?.(data)
        } catch (err) {
          setLastMessage(event.data)
          options.onMessage?.(event.data)
        }
      }
      
      wsRef.current.onerror = (event) => {
        setError(event)
        options.onError?.(event)
      }
      
      wsRef.current.onclose = (event) => {
        setIsConnected(false)
        options.onClose?.(event)
        
        // Reconnexion automatique
        if (options.autoReconnect !== false && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, reconnectInterval)
        }
      }
    } catch (err) {
      setError(err)
      options.onError?.(err)
    }
  }, [url, options])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data)
      wsRef.current.send(message)
      return true
    }
    return false
  }, [])

  const sendMessage = useCallback((type, payload) => {
    return send({ type, payload })
  }, [send])

  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    lastMessage,
    error,
    send,
    sendMessage,
    disconnect
  }
}
// src/modules/shared/hooks/useGeolocation.js
import { useState, useEffect, useCallback, useRef } from 'react'

export const useGeolocation = (options = {}) => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [watchId, setWatchId] = useState(null)
  
  // Utiliser useRef pour éviter les appels setState synchrones dans l'effet
  const isMounted = useRef(true)

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      if (isMounted.current) {
        setError('Geolocation is not supported')
        setIsLoading(false)
      }
      return
    }
    
    if (isMounted.current) {
      setIsLoading(true)
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isMounted.current) {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          })
          setError(null)
          setIsLoading(false)
        }
      },
      (err) => {
        if (isMounted.current) {
          setError(err.message)
          setIsLoading(false)
        }
      },
      options
    )
  }, [options])

  const watchPosition = useCallback(() => {
    if (!navigator.geolocation) {
      if (isMounted.current) {
        setError('Geolocation is not supported')
      }
      return null
    }
    
    const id = navigator.geolocation.watchPosition(
      (position) => {
        if (isMounted.current) {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: position.timestamp
          })
          setError(null)
          setIsLoading(false)
        }
      },
      (err) => {
        if (isMounted.current) {
          setError(err.message)
          setIsLoading(false)
        }
      },
      options
    )
    
    if (isMounted.current) {
      setWatchId(id)
    }
    return id
  }, [options])

  const stopWatching = useCallback(() => {
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId)
      if (isMounted.current) {
        setWatchId(null)
      }
    }
  }, [watchId])

  const calculateDistance = useCallback((lat1, lng1, lat2, lng2) => {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  // Utiliser un effet pour s'assurer que le composant est monté
  useEffect(() => {
    isMounted.current = true
    
    // Utiliser setTimeout pour éviter l'appel setState synchrone
    const timer = setTimeout(() => {
      if (isMounted.current) {
        getCurrentPosition()
      }
    }, 0)
    
    return () => {
      isMounted.current = false
      clearTimeout(timer)
      stopWatching()
    }
  }, [getCurrentPosition, stopWatching])

  return {
    location,
    error,
    isLoading,
    getCurrentPosition,
    watchPosition,
    stopWatching,
    calculateDistance
  }
}
// src/modules/fan/components/Chill/ChillMap.jsx
import React, { useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { motion } from 'framer-motion'
import { Avatar } from '../../../shared/components/ui/Avatar'

// Import Leaflet pour OpenStreetMap
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Correction des icônes par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Icône personnalisée pour les événements
const eventIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// Icône pour la position de l'utilisateur (rouge)
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const Container = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
`

const MapContainer = styled.div`
  width: 100%;
  height: 100%;
  background: ${props => props.theme.surface};
`

const LocationButton = styled(motion.button)`
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: ${props => props.theme.surface};
  border: none;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`

const PopupContainer = styled(motion.div)`
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${props => props.theme.surface};
  border-radius: 16px;
  padding: 16px;
  min-width: 250px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  z-index: 2000;
`

const PopupContent = styled.div`
  display: flex;
  gap: 12px;
`

const PopupInfo = styled.div`
  flex: 1;
`

const PopupTitle = styled.h4`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: ${props => props.theme.text};
`

const PopupAddress = styled.p`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
`

const PopupButton = styled.button`
  padding: 6px 12px;
  border-radius: 20px;
  border: none;
  background: ${props => props.theme.primary};
  color: white;
  font-size: 12px;
  cursor: pointer;
  margin-top: 8px;
`

export const ChillMap = ({ events, onEventSelect, onLocationChange }) => {
  const [map, setMap] = useState(null)
  const [markers, setMarkers] = useState([])
  const [userMarker, setUserMarker] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)

  // Initialisation de la carte
  useEffect(() => {
    if (!mapRef.current) return

    // Créer la carte OpenStreetMap
    const mapInstance = L.map(mapRef.current).setView([48.8566, 2.3522], 12)
    mapInstanceRef.current = mapInstance

    // Ajouter le fond de carte OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance)

    setMap(mapInstance)

    // Obtenir la position de l'utilisateur
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const pos = { lat: latitude, lng: longitude }
          setUserLocation(pos)
          mapInstance.setView([latitude, longitude], 13)
          onLocationChange?.(pos)

          // Ajouter un marqueur pour l'utilisateur
          const marker = L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapInstance)
            .bindPopup('<strong>Vous êtes ici</strong>')
            .openPopup()
          setUserMarker(marker)
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error.message)
        }
      )
    }

    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, [])

  // Gestion des marqueurs d'événements
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Supprimer les anciens marqueurs
    markers.forEach(marker => marker.remove())
    
    // Ajouter les nouveaux marqueurs
    const newMarkers = events.map(event => {
      const marker = L.marker([event.location_lat, event.location_lng], { icon: eventIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${event.name}</strong><br/>
            ${event.location_name}<br/>
            ${event.participant_count ? `👥 ${event.participant_count} participants` : ''}
          </div>
        `)
      
      marker.on('click', () => {
        setSelectedEvent(event)
        onEventSelect?.(event)
      })
      
      return marker
    })
    
    setMarkers(newMarkers)
  }, [events, map])

  const centerOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14)
    }
  }

  const closePopup = () => {
    setSelectedEvent(null)
  }

  return (
    <Container>
      <MapContainer ref={mapRef} />
      <LocationButton onClick={centerOnUser} whileTap={{ scale: 0.9 }}>
        📍
      </LocationButton>
      
      {selectedEvent && (
        <PopupContainer
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <PopupContent>
            <Avatar
              src={selectedEvent.organizer?.avatar_url}
              name={selectedEvent.organizer?.username}
              size={44}
            />
            <PopupInfo>
              <PopupTitle>{selectedEvent.name}</PopupTitle>
              <PopupAddress>📍 {selectedEvent.location_name}</PopupAddress>
              {selectedEvent.event_date && (
                <PopupAddress>📅 {new Date(selectedEvent.event_date).toLocaleDateString('fr-FR')}</PopupAddress>
              )}
              <PopupButton onClick={() => {
                onEventSelect?.(selectedEvent)
                closePopup()
              }}>
                Voir détails
              </PopupButton>
            </PopupInfo>
          </PopupContent>
          <button
            onClick={closePopup}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#888'
            }}
          >
            ✕
          </button>
        </PopupContainer>
      )}
    </Container>
  )
}

export default ChillMap
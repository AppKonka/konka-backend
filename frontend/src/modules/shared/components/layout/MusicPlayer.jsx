// src/modules/shared/components/layout/MusicPlayer.jsx
import React, { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ReactPlayer from 'react-player'
import { usePlayer } from '../../context/PlayerContext'

const PlayerContainer = styled(motion.div)`
  position: fixed;
  bottom: 70px;
  left: 0;
  right: 0;
  background: ${props => props.theme.surface};
  border-top: 1px solid ${props => props.theme.border};
  border-radius: 16px 16px 0 0;
  z-index: 99;
`

const MinimizedPlayer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  cursor: pointer;
`

const Thumbnail = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
`

const TrackInfo = styled.div`
  flex: 1;
  
  h4 {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  
  p {
    font-size: 12px;
    color: ${props => props.theme.textSecondary};
    margin: 2px 0 0;
  }
`

const PlayButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: ${props => props.theme.primary};
`

const ExpandedPlayer = styled(motion.div)`
  padding: 20px;
`

const LargeThumbnail = styled.img`
  width: 200px;
  height: 200px;
  border-radius: 16px;
  object-fit: cover;
  margin: 0 auto;
  display: block;
`

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
  margin: 20px 0;
  
  button {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: ${props => props.theme.text};
  }
`

const ProgressBar = styled.input`
  width: 100%;
  margin: 10px 0;
`

export const MusicPlayer = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTrack, setCurrentTrack] = useState({
    title: 'Aucun morceau',
    artist: 'KONKA',
    thumbnail: 'https://via.placeholder.com/48',
    url: '',
  })
  
  const playerRef = useRef(null)
  const { 
    currentTrack: globalTrack, 
    isPlaying: globalIsPlaying,
    pauseTrack, 
    resumeTrack,
    nextTrack,
    previousTrack,
    seekTo
  } = usePlayer()

  // Synchroniser avec le contexte global
  useEffect(() => {
    if (globalTrack) {
      setCurrentTrack({
        title: globalTrack.title || 'Sans titre',
        artist: globalTrack.artist?.username || globalTrack.artist || 'Artiste inconnu',
        thumbnail: globalTrack.cover_url || 'https://via.placeholder.com/48',
        url: globalTrack.audio_url || globalTrack.url || '',
      })
    }
  }, [globalTrack])

  useEffect(() => {
    setPlaying(globalIsPlaying)
  }, [globalIsPlaying])

  const handlePlayPause = () => {
    if (playing) {
      pauseTrack()
    } else {
      resumeTrack()
    }
  }

  const handleNext = () => {
    nextTrack()
  }

  const handlePrevious = () => {
    previousTrack()
  }

  const handleProgress = (state) => {
    setProgress(state.played)
  }

  const handleDuration = (duration) => {
    setDuration(duration)
  }

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value)
    setProgress(newProgress)
    if (playerRef.current) {
      playerRef.current.seekTo(newProgress)
    }
    seekTo(newProgress * duration)
  }

  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Ne pas afficher le lecteur si aucun morceau n'est chargé
  if (!currentTrack.url) {
    return null
  }

  return (
    <>
      <AnimatePresence>
        {!isExpanded && (
          <PlayerContainer
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            whileHover={{ y: -5 }}
          >
            <MinimizedPlayer onClick={() => setIsExpanded(true)}>
              <Thumbnail src={currentTrack.thumbnail} alt={currentTrack.title} />
              <TrackInfo>
                <h4>{currentTrack.title}</h4>
                <p>{currentTrack.artist}</p>
              </TrackInfo>
              <PlayButton onClick={(e) => { e.stopPropagation(); handlePlayPause() }}>
                {playing ? '⏸️' : '▶️'}
              </PlayButton>
            </MinimizedPlayer>
          </PlayerContainer>
        )}
      </AnimatePresence>

      {isExpanded && (
        <ExpandedPlayer
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 200,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <button 
            onClick={() => setIsExpanded(false)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 24, color: 'white', cursor: 'pointer' }}
          >
            ✕
          </button>
          
          <LargeThumbnail src={currentTrack.thumbnail} alt={currentTrack.title} />
          <TrackInfo style={{ textAlign: 'center', marginTop: 20 }}>
            <h4 style={{ fontSize: 20, color: 'white' }}>{currentTrack.title}</h4>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>{currentTrack.artist}</p>
          </TrackInfo>
          
          <ProgressBar
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={handleSeek}
            style={{ margin: '20px 0' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', color: 'white' }}>
            <span>{formatTime(progress * duration)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          
          <Controls>
            <button onClick={handlePrevious} style={{ color: 'white', cursor: 'pointer' }}>⏮️</button>
            <button onClick={handlePlayPause} style={{ fontSize: 48, color: '#FF6B35', cursor: 'pointer' }}>
              {playing ? '⏸️' : '▶️'}
            </button>
            <button onClick={handleNext} style={{ color: 'white', cursor: 'pointer' }}>⏭️</button>
          </Controls>
          
          <ReactPlayer
            ref={playerRef}
            url={currentTrack.url}
            playing={playing}
            onProgress={handleProgress}
            onDuration={handleDuration}
            width={0}
            height={0}
            style={{ display: 'none' }}
          />
        </ExpandedPlayer>
      )}
    </>
  )
}
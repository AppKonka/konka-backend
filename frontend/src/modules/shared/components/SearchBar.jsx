// src/modules/shared/components/SearchBar.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../../config/supabase'
import { Avatar } from './ui/Avatar'
import { useDebounce } from '../hooks/useDebounce'
import { toast } from 'react-hot-toast'

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
`

const SearchInputWrapper = styled.div`
  position: relative;
  width: 100%;
`

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
  border-radius: 28px;
  border: 1px solid ${props => props.theme.border};
  background: ${props => props.theme.surface};
  color: ${props => props.theme.text};
  font-size: 14px;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.primary};
  }
`

const SearchIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  color: ${props => props.theme.textSecondary};
`

const ClearButton = styled(motion.button)`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: ${props => props.theme.textSecondary};
`

const ResultsDropdown = styled(motion.div)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: ${props => props.theme.surface};
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  border: 1px solid ${props => props.theme.border};
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
`

const ResultSection = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${props => props.theme.border};
  
  &:last-child {
    border-bottom: none;
  }
`

const SectionTitle = styled.h4`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${props => props.theme.textSecondary};
  margin-bottom: 8px;
  padding: 0 4px;
`

const ResultItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  
  &:hover {
    background: ${props => props.theme.border}40;
  }
`

const ResultInfo = styled.div`
  flex: 1;
`

const ResultTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme.text};
`

const ResultSubtitle = styled.div`
  font-size: 12px;
  color: ${props => props.theme.textSecondary};
`

const ResultType = styled.span`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  background: ${props => props.theme.border};
  color: ${props => props.theme.textSecondary};
`

const NoResults = styled.div`
  text-align: center;
  padding: 40px;
  color: ${props => props.theme.textSecondary};
  
  .icon {
    font-size: 48px;
    margin-bottom: 12px;
  }
`

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 20px;
  color: ${props => props.theme.textSecondary};
`

export const SearchBar = ({ onClose }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({
    users: [],
    tracks: [],
    videos: [],
    products: []
  })
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  
  const navigate = useNavigate()
  const searchRef = useRef(null)
  
  const debouncedQuery = useDebounce(query, 300)

  const performSearch = useCallback(async () => {
    setLoading(true)
    try {
      const [users, tracks, videos, products] = await Promise.all([
        // Recherche utilisateurs
        supabase
          .from('users')
          .select('id, username, display_name, avatar_url, role')
          .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
          .limit(5),
        
        // Recherche morceaux
        supabase
          .from('tracks')
          .select('id, title, cover_url, artist:users(id, username)')
          .ilike('title', `%${debouncedQuery}%`)
          .eq('is_public', true)
          .limit(5),
        
        // Recherche vidéos
        supabase
          .from('videos')
          .select('id, title, thumbnail_url, user:users(id, username)')
          .ilike('title', `%${debouncedQuery}%`)
          .eq('visibility', 'public')
          .limit(5),
        
        // Recherche produits
        supabase
          .from('products')
          .select('id, name, price, images, seller:users(id, username)')
          .ilike('name', `%${debouncedQuery}%`)
          .eq('is_active', true)
          .limit(5)
      ])
      
      setResults({
        users: users.data || [],
        tracks: tracks.data || [],
        videos: videos.data || [],
        products: products.data || []
      })
      setShowResults(true)
      
      console.log('🔍 Recherche:', {
        query: debouncedQuery,
        users: users.data?.length,
        tracks: tracks.data?.length,
        videos: videos.data?.length,
        products: products.data?.length
      })
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Erreur lors de la recherche')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false)
        onClose?.()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch()
    } else {
      setResults({ users: [], tracks: [], videos: [], products: [] })
    }
  }, [debouncedQuery, performSearch])

  const handleResultClick = (type, item) => {
    setShowResults(false)
    setQuery('')
    onClose?.()
    
    switch (type) {
      case 'user':
        navigate(`/fan/profile/${item.id}`)
        break
      case 'track':
        navigate(`/fan/music/track/${item.id}`)
        break
      case 'video':
        navigate(`/fan/video/${item.id}`)
        break
      case 'product':
        navigate(`/fan/shopping/product/${item.id}`)
        break
    }
    
    console.log(`🔍 Clic sur résultat ${type}:`, item.id)
  }

  const totalResults = results.users.length + results.tracks.length + results.videos.length + results.products.length

  return (
    <SearchContainer ref={searchRef}>
      <SearchInputWrapper>
        <SearchIcon>🔍</SearchIcon>
        <SearchInput
          type="text"
          placeholder="Rechercher un utilisateur, un morceau, une vidéo, un produit..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          autoFocus
        />
        {query && (
          <ClearButton
            onClick={() => setQuery('')}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </ClearButton>
        )}
      </SearchInputWrapper>
      
      <AnimatePresence>
        {showResults && query.length >= 2 && (
          <ResultsDropdown
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {loading ? (
              <LoadingSpinner>
                <div>Recherche en cours...</div>
              </LoadingSpinner>
            ) : totalResults === 0 ? (
              <NoResults>
                <div className="icon">🔍</div>
                <div>Aucun résultat pour "{query}"</div>
                <div style={{ fontSize: 12, marginTop: 8 }}>
                  Essayez avec d'autres mots-clés
                </div>
              </NoResults>
            ) : (
              <>
                {results.users.length > 0 && (
                  <ResultSection>
                    <SectionTitle>Utilisateurs</SectionTitle>
                    {results.users.map(user => (
                      <ResultItem
                        key={user.id}
                        onClick={() => handleResultClick('user', user)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Avatar src={user.avatar_url} name={user.username} size={40} />
                        <ResultInfo>
                          <ResultTitle>{user.display_name || user.username}</ResultTitle>
                          <ResultSubtitle>@{user.username}</ResultSubtitle>
                        </ResultInfo>
                        <ResultType>{user.role === 'artist' ? '🎤 Artiste' : user.role === 'seller' ? '🛍️ Vendeur' : '🎧 Fan'}</ResultType>
                      </ResultItem>
                    ))}
                  </ResultSection>
                )}
                
                {results.tracks.length > 0 && (
                  <ResultSection>
                    <SectionTitle>Morceaux</SectionTitle>
                    {results.tracks.map(track => (
                      <ResultItem
                        key={track.id}
                        onClick={() => handleResultClick('track', track)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <img src={track.cover_url || '/images/default-album.jpg'} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        <ResultInfo>
                          <ResultTitle>{track.title}</ResultTitle>
                          <ResultSubtitle>{track.artist?.username}</ResultSubtitle>
                        </ResultInfo>
                        <ResultType>🎵 Morceau</ResultType>
                      </ResultItem>
                    ))}
                  </ResultSection>
                )}
                
                {results.videos.length > 0 && (
                  <ResultSection>
                    <SectionTitle>Vidéos</SectionTitle>
                    {results.videos.map(video => (
                      <ResultItem
                        key={video.id}
                        onClick={() => handleResultClick('video', video)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <img src={video.thumbnail_url || '/images/default-video.jpg'} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        <ResultInfo>
                          <ResultTitle>{video.title}</ResultTitle>
                          <ResultSubtitle>@{video.user?.username}</ResultSubtitle>
                        </ResultInfo>
                        <ResultType>📹 Vidéo</ResultType>
                      </ResultItem>
                    ))}
                  </ResultSection>
                )}
                
                {results.products.length > 0 && (
                  <ResultSection>
                    <SectionTitle>Produits</SectionTitle>
                    {results.products.map(product => (
                      <ResultItem
                        key={product.id}
                        onClick={() => handleResultClick('product', product)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <img src={product.images?.[0] || '/images/default-product.jpg'} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        <ResultInfo>
                          <ResultTitle>{product.name}</ResultTitle>
                          <ResultSubtitle>{product.price}€ • @{product.seller?.username}</ResultSubtitle>
                        </ResultInfo>
                        <ResultType>🛍️ Produit</ResultType>
                      </ResultItem>
                    ))}
                  </ResultSection>
                )}
              </>
            )}
          </ResultsDropdown>
        )}
      </AnimatePresence>
    </SearchContainer>
  )
}
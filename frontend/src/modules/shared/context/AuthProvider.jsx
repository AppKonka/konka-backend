// src/modules/shared/context/AuthProvider.jsx
import React, { useState, useEffect, useCallback } from 'react'
import AuthContext from './AuthContext'
import { supabase } from '../../../config/supabase'


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  const loadUserProfile = useCallback(async (userId, role) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (error) throw error
      setUserProfile(data)

      if (role === 'artist') {
        const { data: artistData } = await supabase
          .from('artists')
          .select('*')
          .eq('user_id', userId)
          .single()
        setUserProfile(prev => ({ ...prev, artistData }))
      } else if (role === 'seller') {
        const { data: sellerData } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', userId)
          .single()
        setUserProfile(prev => ({ ...prev, sellerData }))
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user) {
        setUser(session.user)
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (userData) {
          setUserRole(userData.role)
          await loadUserProfile(session.user.id, userData.role)
        }
      }
      setLoading(false)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user || null)
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
        if (userData) {
          setUserRole(userData.role)
          await loadUserProfile(session.user.id, userData.role)
        }
      } else {
        setUserRole(null)
        setUserProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

  const value = {
    user,
    userRole,
    userProfile,
    loading,
    session,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
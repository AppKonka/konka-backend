/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

// Création du contexte
const AuthContext = createContext()

// Hook pour accéder au contexte
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// AuthProvider complet
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Charger le profil utilisateur
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

  // Initialiser l'auth
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

  // Inscription
  const register = async (email, password, userData) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: userData.username, role: userData.role } }
      })
      if (authError) throw authError

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          username: userData.username,
          display_name: userData.displayName || userData.username,
          role: userData.role,
          phone: userData.phone,
          date_of_birth: userData.dateOfBirth,
          gender: userData.gender,
          country: userData.country,
          city: userData.city,
        })
      if (profileError) throw profileError

      if (userData.role === 'artist') {
        const { error: artistError } = await supabase
          .from('artists')
          .insert({
            user_id: authData.user.id,
            artist_name: userData.artistName || userData.username,
            legal_name: userData.legalName,
            nationality: userData.nationality,
            type: userData.artistType,
            year_started: userData.yearStarted,
            genres: userData.genres,
          })
        if (artistError) throw artistError
      }

      if (userData.role === 'seller') {
        const { error: sellerError } = await supabase
          .from('sellers')
          .insert({
            user_id: authData.user.id,
            store_name: userData.storeName,
            store_description: userData.storeDescription,
            store_type: userData.storeType,
            categories: userData.categories,
            siret_number: userData.siretNumber,
          })
        if (sellerError) throw sellerError
      }

      toast.success('Compte créé avec succès!')
      return { success: true, user: authData.user }
    } catch (error) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Erreur lors de l\'inscription')
      return { success: false, error: error.message }
    }
  }

  // Connexion
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Connexion réussie!')
      return { success: true, user: data.user }
    } catch (error) {
      console.error('Login error:', error)
      toast.error(error.message || 'Erreur de connexion')
      return { success: false, error: error.message }
    }
  }

  // Déconnexion
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Déconnexion réussie')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Erreur lors de la déconnexion')
    }
  }

  // Mise à jour du profil
  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', user.id)
      if (error) throw error
      setUserProfile(prev => ({ ...prev, ...updates }))
      toast.success('Profil mis à jour')
      return { success: true }
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error('Erreur lors de la mise à jour')
      return { success: false, error: error.message }
    }
  }

  // Réinitialisation du mot de passe
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      toast.success('Email de réinitialisation envoyé')
      return { success: true }
    } catch (error) {
      console.error('Reset password error:', error)
      toast.error('Erreur lors de l\'envoi')
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    userRole,
    userProfile,
    loading,
    session,
    register,
    login,
    logout,
    updateProfile,
    resetPassword,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthContext
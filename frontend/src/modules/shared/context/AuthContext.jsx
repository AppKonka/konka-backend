//src/modules/shared/context/AuthContext.jsx
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Charger le profil utilisateur - VERSION CORRIGÉE SANS BLOCAGE
  const loadUserProfile = useCallback(async (userId, retryCount = 0) => {
    if (!userId) {
      console.log('No userId provided to loadUserProfile')
      setUserProfile(null)
      return null
    }
    
    try {
      console.log(`Loading profile for user: ${userId} (attempt ${retryCount + 1})`)
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error('Error loading profile:', error)
        setUserProfile(null)
        return null
      }
      
      if (!data) {
        console.warn(`No profile found for user: ${userId}`)
        if (retryCount < 3) {
          console.log(`Retrying in 1s... (attempt ${retryCount + 2}/3)`)
          setTimeout(() => loadUserProfile(userId, retryCount + 1), 1000)
          return null
        } else {
          console.error('Profile not found after 3 attempts')
          setUserProfile(null)
          return null
        }
      }
      
      console.log('Profile loaded successfully:', data)
      setUserProfile(data)
      setUserRole(data.role)
      return data
      
    } catch (error) {
      console.error('Unexpected error loading profile:', error)
      setUserProfile(null)
      return null
    }
  }, [])

  // Initialiser l'auth - VERSION CORRIGÉE
  useEffect(() => {
    let isMounted = true
    
    const initAuth = async () => {
      try {
        console.log('Initializing auth...')
        setLoading(true)
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        setSession(session)
        
        if (session?.user) {
          console.log('User found in session:', session.user.id)
          setUser(session.user)
          await loadUserProfile(session.user.id)
        } else {
          console.log('No user in session')
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
        }
        
        setLoading(false)
        console.log('Auth initialization complete, loading:', false)
        
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          setLoading(false)
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id)
      
      if (!isMounted) return
      
      setSession(session)
      setUser(session?.user || null)
      
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setUserRole(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
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

      if (!authData.user) {
        throw new Error('User creation failed')
      }

      console.log('Auth user created:', authData.user.id)

      await new Promise(resolve => setTimeout(resolve, 1000))

      const profile = await loadUserProfile(authData.user.id, 0)
      
      if (!profile) {
        console.warn('Profile not found after registration, but user was created')
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
      
      console.log('Login successful:', data.user.id)
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
      setUserProfile(null)
      setUserRole(null)
      toast.success('Déconnexion réussie')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Erreur lors de la déconnexion')
    }
  }

  // Mise à jour du profil
  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in')
      
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
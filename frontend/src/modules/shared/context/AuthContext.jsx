// src/modules/shared/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../config/supabase'
import { toast } from 'react-hot-toast'

const AuthContext = createContext()

const AuthProvider = ({ children }) => {
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
      
      // Charger les données spécifiques au rôle
      if (role === 'artist') {
        const { data: artistData, error: artistError } = await supabase
          .from('artists')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (!artistError && artistData) {
          setUserProfile(prev => ({ ...prev, artistData }))
        }
      } else if (role === 'seller') {
        const { data: sellerData, error: sellerError } = await supabase
          .from('sellers')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (!sellerError && sellerData) {
          setUserProfile(prev => ({ ...prev, sellerData }))
        }
      }
      
      console.log('👤 Profil utilisateur chargé:', {
        userId,
        role,
        username: data?.username
      })
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }, [])

  // Initialiser l'auth
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      
      try {
        // Récupérer la session actuelle
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        setSession(currentSession)
        
        if (currentSession?.user) {
          setUser(currentSession.user)
          
          // Récupérer le rôle depuis la base de données
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentSession.user.id)
            .single()
          
          if (userError) {
            console.error('Error fetching user role:', userError)
          } else if (userData) {
            setUserRole(userData.role)
            await loadUserProfile(currentSession.user.id, userData.role)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        setLoading(false)
      }
    }
    
    initAuth()
    
    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔐 Auth state changed:', event, newSession?.user?.email)
      setSession(newSession)
      setUser(newSession?.user || null)
      
      if (newSession?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', newSession.user.id)
          .single()
        
        if (userError) {
          console.error('Error fetching user role:', userError)
        } else if (userData) {
          setUserRole(userData.role)
          await loadUserProfile(newSession.user.id, userData.role)
        }
      } else {
        setUserRole(null)
        setUserProfile(null)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserProfile])

  // Inscription
  const register = async (email, password, userData) => {
    try {
      // Créer l'utilisateur dans Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: userData.username,
            role: userData.role,
          }
        }
      })
      
      if (authError) throw authError
      
      // Créer le profil utilisateur
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
          created_at: new Date().toISOString()
        })
      
      if (profileError) throw profileError
      
      // Si c'est un artiste, créer les données artiste
      if (userData.role === 'artist') {
        const { error: artistError } = await supabase
          .from('artists')
          .insert({
            user_id: authData.user.id,
            artist_name: userData.artistName || userData.username,
            legal_name: userData.legalName,
            nationality: userData.nationality,
            type: userData.artistType || 'solo',
            year_started: userData.yearStarted,
            genres: userData.genres || [],
            verification_status: 'pending',
            created_at: new Date().toISOString()
          })
        
        if (artistError) throw artistError
      }
      
      // Si c'est un vendeur, créer les données vendeur
      if (userData.role === 'seller') {
        const { error: sellerError } = await supabase
          .from('sellers')
          .insert({
            user_id: authData.user.id,
            store_name: userData.storeName,
            store_description: userData.storeDescription,
            store_type: userData.storeType || 'individual',
            categories: userData.categories || [],
            siret_number: userData.siretNumber,
            verification_status: 'pending',
            created_at: new Date().toISOString()
          })
        
        if (sellerError) throw sellerError
      }
      
      console.log('✅ Utilisateur inscrit avec succès:', {
        userId: authData.user.id,
        email,
        role: userData.role
      })
      
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      console.log('🔐 Utilisateur connecté:', data.user.email)
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
      console.log('🔐 Utilisateur déconnecté')
      toast.success('Déconnexion réussie')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Erreur lors de la déconnexion')
    }
  }

  // Mettre à jour le profil
  const updateProfile = async (updates) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      setUserProfile(prev => ({ ...prev, ...updates }))
      console.log('👤 Profil mis à jour:', updates)
      toast.success('Profil mis à jour')
      return { success: true }
    } catch (error) {
      console.error('Update profile error:', error)
      toast.error('Erreur lors de la mise à jour')
      return { success: false, error: error.message }
    }
  }

  // Mot de passe oublié
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      console.log('📧 Email de réinitialisation envoyé à:', email)
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
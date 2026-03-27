// frontend/src/modules/shared/hooks/useAuth.js
import { useContext } from 'react'
import AuthContext from '../context/AuthContext' // ✅ maintenant c’est default

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
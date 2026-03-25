// src/modules/shared/context/ThemeContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('konka-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark')
      localStorage.setItem('konka-theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('konka-theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  const theme = {
    isDark,
    toggleTheme,
    colors: {
      primary: '#FF6B35',
      primaryDark: '#FF4D1E',
      primaryLight: '#FF8A5C',
      background: isDark ? '#121212' : '#FFFFFF',
      surface: isDark ? '#1E1E2E' : '#F8F9FA',
      text: isDark ? '#FFFFFF' : '#1A1A2E',
      textSecondary: isDark ? '#A0A0A0' : '#6C757D',
      border: isDark ? '#2C2C3A' : '#E9ECEF',
      success: '#00C851',
      warning: '#FFB444',
      error: '#FF4444',
      info: '#33B5E5',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    radius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
      full: 9999,
    },
    shadow: {
      sm: '0 2px 4px rgba(0,0,0,0.05)',
      md: '0 4px 6px rgba(0,0,0,0.07)',
      lg: '0 10px 15px rgba(0,0,0,0.1)',
      xl: '0 20px 25px rgba(0,0,0,0.15)',
    },
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}
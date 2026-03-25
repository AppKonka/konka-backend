// frontend/src/modules/auth/__tests__/Login.test.jsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../shared/context/AuthContext'
import Login from '../pages/Login'

// Mock de supabase
jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn()
    }
  }
}))

describe('Login Page', () => {
  const renderLogin = () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </BrowserRouter>
    )
  }

  test('renders login form', () => {
    renderLogin()
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/mot de passe/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument()
  })

  test('shows error when email is empty', async () => {
    renderLogin()
    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/email requis/i)).toBeInTheDocument()
    })
  })

  test('shows error when password is empty', async () => {
    renderLogin()
    const emailInput = screen.getByPlaceholderText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/mot de passe requis/i)).toBeInTheDocument()
    })
  })

  test('successful login redirects to home', async () => {
    const { supabase } = require('../../../config/supabase')
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123' } },
      error: null
    })
    
    renderLogin()
    
    const emailInput = screen.getByPlaceholderText(/email/i)
    const passwordInput = screen.getByPlaceholderText(/mot de passe/i)
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Password123' } })
    
    const submitButton = screen.getByRole('button', { name: /se connecter/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123'
      })
    })
  })
})


// frontend/src/modules/fan/components/VideoFeed/__tests__/VideoCard.test.jsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { VideoCard } from '../VideoCard'

const mockVideo = {
  id: '1',
  video_url: 'https://example.com/video.mp4',
  thumbnail_url: 'https://example.com/thumb.jpg',
  title: 'Test Video',
  description: 'Test description',
  user: {
    id: 'user1',
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.jpg'
  },
  like_count: 10,
  comment_count: 5,
  share_count: 2
}

describe('VideoCard Component', () => {
  const mockProps = {
    video: mockVideo,
    isActive: true,
    onLike: jest.fn(),
    onShare: jest.fn(),
    onComment: jest.fn(),
    onMusicClick: jest.fn(),
    onUserClick: jest.fn(),
    onEnded: jest.fn()
  }

  test('renders video information', () => {
    render(<VideoCard {...mockProps} />)
    
    expect(screen.getByText(/testuser/i)).toBeInTheDocument()
    expect(screen.getByText(/test description/i)).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  test('handles like click', () => {
    render(<VideoCard {...mockProps} />)
    
    const likeButton = screen.getByRole('button', { name: /like/i })
    fireEvent.click(likeButton)
    
    expect(mockProps.onLike).toHaveBeenCalled()
  })

  test('handles comment click', () => {
    render(<VideoCard {...mockProps} />)
    
    const commentButton = screen.getByRole('button', { name: /comment/i })
    fireEvent.click(commentButton)
    
    expect(mockProps.onComment).toHaveBeenCalled()
  })

  test('handles share click', () => {
    render(<VideoCard {...mockProps} />)
    
    const shareButton = screen.getByRole('button', { name: /share/i })
    fireEvent.click(shareButton)
    
    expect(mockProps.onShare).toHaveBeenCalled()
  })

  test('handles user click', () => {
    render(<VideoCard {...mockProps} />)
    
    const userElement = screen.getByText(/testuser/i)
    fireEvent.click(userElement)
    
    expect(mockProps.onUserClick).toHaveBeenCalled()
  })

  test('handles double click for like', () => {
    render(<VideoCard {...mockProps} />)
    
    const videoContainer = screen.getByTestId('video-container')
    fireEvent.doubleClick(videoContainer)
    
    expect(mockProps.onLike).toHaveBeenCalled()
  })
})


// frontend/src/modules/shared/hooks/__tests__/useAuth.test.js
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { supabase } from '../../../config/supabase'

jest.mock('../../../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null })
    }))
  }
}))

describe('useAuth Hook', () => {
  const wrapper = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('returns initial state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBeNull()
    expect(result.current.userRole).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  test('register function works', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.register('test@example.com', 'Password123', {
        username: 'testuser',
        role: 'fan'
      })
    })
    
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123',
      options: {
        data: {
          username: 'testuser',
          role: 'fan'
        }
      }
    })
  })

  test('login function works', async () => {
    const mockUser = { id: '123', email: 'test@example.com' }
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.login('test@example.com', 'Password123')
    })
    
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123'
    })
  })

  test('logout function works', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: null })
    
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.logout()
    })
    
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
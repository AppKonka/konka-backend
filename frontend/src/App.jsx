// src/App.jsx
import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './modules/shared/context/AuthContext'
import { Loader } from './modules/shared/components/ui/Loader'
import { SafeArea } from './modules/shared/components/navigation/SafeArea'

const CONFIG = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  firebaseApiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  firebaseAuthDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  firebaseProjectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  firebaseStorageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  firebaseMessagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  firebaseAppId: import.meta.env.VITE_FIREBASE_APP_ID,
  firebaseVapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  apiUrl: import.meta.env.VITE_API_URL,
}

// Auth pages
const Onboarding = lazy(() => import('./modules/auth/pages/Onboarding'))
const Login = lazy(() => import('./modules/auth/pages/Login'))
const Register = lazy(() => import('./modules/auth/pages/Register'))
const RoleSelection = lazy(() => import('./modules/auth/pages/RoleSelection'))
const ForgotPassword = lazy(() => import('./modules/auth/pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./modules/auth/pages/ResetPassword'))

// Fan pages
const FanHome = lazy(() => import('./modules/fan/pages/Home'))
const FanFeed = lazy(() => import('./modules/fan/pages/Feed'))
const FanMessages = lazy(() => import('./modules/fan/pages/Messages'))
const FanProfile = lazy(() => import('./modules/fan/pages/Profile'))
const FanEditProfile = lazy(() => import('./modules/fan/pages/EditProfile'))
const FanDiscover = lazy(() => import('./modules/fan/pages/Discover'))
const FanChill = lazy(() => import('./modules/fan/pages/Chill'))
const FanDedication = lazy(() => import('./modules/fan/pages/Dedication'))
const FanShopping = lazy(() => import('./modules/fan/pages/Shopping'))
const FanMusic = lazy(() => import('./modules/fan/pages/Music'))
const FanLive = lazy(() => import('./modules/fan/pages/Live'))
const FanSettings = lazy(() => import('./modules/fan/pages/Settings'))
const FanNotifications = lazy(() => import('./modules/fan/pages/Notifications'))
const FanPostDetail = lazy(() => import('./modules/fan/pages/PostDetail'))
const FanProductDetail = lazy(() => import('./modules/fan/pages/ProductDetail'))
const FanCheckout = lazy(() => import('./modules/fan/pages/Checkout'))
const FanOrderTracking = lazy(() => import('./modules/fan/pages/OrderTracking'))
const FanArtistPage = lazy(() => import('./modules/fan/pages/ArtistPage'))
const FanSellerPage = lazy(() => import('./modules/fan/pages/SellerPage'))
const FanPlaylistDetail = lazy(() => import('./modules/fan/pages/PlaylistDetail'))
const FanAlbumDetail = lazy(() => import('./modules/fan/pages/AlbumDetail'))
const FanWishlist = lazy(() => import('./modules/fan/pages/Wishlist'))

// Artist pages
const ArtistDashboard = lazy(() => import('./modules/artist/pages/ArtistDashboard'))
const ArtistMusicManagement = lazy(() => import('./modules/artist/pages/MusicManagement'))
const ArtistLiveManagement = lazy(() => import('./modules/artist/pages/LiveManagement'))
const ArtistDedicationRequests = lazy(() => import('./modules/artist/pages/DedicationRequests'))
const ArtistAnalytics = lazy(() => import('./modules/artist/pages/Analytics'))
const ArtistStoreManagement = lazy(() => import('./modules/artist/pages/StoreManagement'))
const ArtistLiveStream = lazy(() => import('./modules/artist/pages/LiveStream'))

// Seller pages
const SellerDashboard = lazy(() => import('./modules/seller/pages/SellerDashboard'))
const SellerProductManagement = lazy(() => import('./modules/seller/pages/ProductManagement'))
const SellerOrderManagement = lazy(() => import('./modules/seller/pages/OrderManagement'))
const SellerAnalytics = lazy(() => import('./modules/seller/pages/SellerAnalytics'))
const SellerSettings = lazy(() => import('./modules/seller/pages/SellerSettings'))

// Admin pages
const AdminDashboard = lazy(() => import('./modules/admin/pages/AdminDashboard'))
const AdminUserManagement = lazy(() => import('./modules/admin/pages/UserManagement'))
const AdminContentModeration = lazy(() => import('./modules/admin/pages/ContentModeration'))
const AdminArtistVerification = lazy(() => import('./modules/admin/pages/ArtistVerification'))
const AdminSellerVerification = lazy(() => import('./modules/admin/pages/SellerVerification'))
const AdminAnalytics = lazy(() => import('./modules/admin/pages/AnalyticsDashboard'))
const AdminPaymentManagement = lazy(() => import('./modules/admin/pages/PaymentManagement'))
const AdminSystemSettings = lazy(() => import('./modules/admin/pages/SystemSettings'))

// Shared pages
const TermsOfService = lazy(() => import('./modules/shared/pages/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./modules/shared/pages/PrivacyPolicy'))
const HelpCenter = lazy(() => import('./modules/shared/pages/HelpCenter'))
const ReportContent = lazy(() => import('./modules/shared/pages/ReportContent'))
const BlockUser = lazy(() => import('./modules/shared/pages/BlockUser'))
const Contact = lazy(() => import('./modules/shared/pages/Contact'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  const { user, loading, userRole } = useAuth()

  if (loading) {
    return <Loader fullScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeArea>
        <Suspense fallback={<Loader fullScreen />}>
          <Routes>
            {/* ROUTES PUBLIQUES */}
            <Route path="/" element={!user ? <Onboarding /> : <Navigate to={`/${userRole}/home`} />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to={`/${userRole}/home`} />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/role-selection" />} />
            <Route path="/role-selection" element={user && !userRole ? <RoleSelection /> : <Navigate to={`/${userRole}/home`} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/contact" element={<Contact />} />

            {/* ROUTES FAN */}
            <Route path="/fan/home" element={user && userRole === 'fan' ? <FanHome /> : <Navigate to="/" />} />
            <Route path="/fan/feed" element={user && userRole === 'fan' ? <FanFeed /> : <Navigate to="/" />} />
            <Route path="/fan/messages" element={user && userRole === 'fan' ? <FanMessages /> : <Navigate to="/" />} />
            <Route path="/fan/profile" element={user && userRole === 'fan' ? <FanProfile /> : <Navigate to="/" />} />
            <Route path="/fan/profile/edit" element={user && userRole === 'fan' ? <FanEditProfile /> : <Navigate to="/" />} />
            <Route path="/fan/discover" element={user && userRole === 'fan' ? <FanDiscover /> : <Navigate to="/" />} />
            <Route path="/fan/chill" element={user && userRole === 'fan' ? <FanChill /> : <Navigate to="/" />} />
            <Route path="/fan/dedication" element={user && userRole === 'fan' ? <FanDedication /> : <Navigate to="/" />} />
            <Route path="/fan/shopping" element={user && userRole === 'fan' ? <FanShopping /> : <Navigate to="/" />} />
            <Route path="/fan/music" element={user && userRole === 'fan' ? <FanMusic /> : <Navigate to="/" />} />
            <Route path="/fan/live" element={user && userRole === 'fan' ? <FanLive /> : <Navigate to="/" />} />
            <Route path="/fan/settings" element={user && userRole === 'fan' ? <FanSettings /> : <Navigate to="/" />} />
            <Route path="/fan/notifications" element={user && userRole === 'fan' ? <FanNotifications /> : <Navigate to="/" />} />
            <Route path="/fan/post/:postId" element={user && userRole === 'fan' ? <FanPostDetail /> : <Navigate to="/" />} />
            <Route path="/fan/shopping/product/:productId" element={user && userRole === 'fan' ? <FanProductDetail /> : <Navigate to="/" />} />
            <Route path="/fan/shopping/cart" element={user && userRole === 'fan' ? <FanCheckout /> : <Navigate to="/" />} />
            <Route path="/fan/shopping/orders/:orderId" element={user && userRole === 'fan' ? <FanOrderTracking /> : <Navigate to="/" />} />
            <Route path="/fan/artist/:artistId" element={user && userRole === 'fan' ? <FanArtistPage /> : <Navigate to="/" />} />
            <Route path="/fan/seller/:sellerId" element={user && userRole === 'fan' ? <FanSellerPage /> : <Navigate to="/" />} />
            <Route path="/fan/playlist/:playlistId" element={user && userRole === 'fan' ? <FanPlaylistDetail /> : <Navigate to="/" />} />
            <Route path="/fan/album/:albumId" element={user && userRole === 'fan' ? <FanAlbumDetail /> : <Navigate to="/" />} />
            <Route path="/fan/wishlist" element={user && userRole === 'fan' ? <FanWishlist /> : <Navigate to="/" />} />
            <Route path="/fan/report" element={user && userRole === 'fan' ? <ReportContent /> : <Navigate to="/" />} />
            <Route path="/fan/blocked" element={user && userRole === 'fan' ? <BlockUser /> : <Navigate to="/" />} />

            {/* ROUTES ARTISTE */}
            <Route path="/artist/dashboard" element={user && userRole === 'artist' ? <ArtistDashboard /> : <Navigate to="/" />} />
            <Route path="/artist/music" element={user && userRole === 'artist' ? <ArtistMusicManagement /> : <Navigate to="/" />} />
            <Route path="/artist/live" element={user && userRole === 'artist' ? <ArtistLiveManagement /> : <Navigate to="/" />} />
            <Route path="/artist/dedications" element={user && userRole === 'artist' ? <ArtistDedicationRequests /> : <Navigate to="/" />} />
            <Route path="/artist/analytics" element={user && userRole === 'artist' ? <ArtistAnalytics /> : <Navigate to="/" />} />
            <Route path="/artist/store" element={user && userRole === 'artist' ? <ArtistStoreManagement /> : <Navigate to="/" />} />
            <Route path="/artist/live/stream/:liveId" element={user && userRole === 'artist' ? <ArtistLiveStream /> : <Navigate to="/" />} />

            {/* ROUTES VENDEUR */}
            <Route path="/seller/dashboard" element={user && userRole === 'seller' ? <SellerDashboard /> : <Navigate to="/" />} />
            <Route path="/seller/products" element={user && userRole === 'seller' ? <SellerProductManagement /> : <Navigate to="/" />} />
            <Route path="/seller/orders" element={user && userRole === 'seller' ? <SellerOrderManagement /> : <Navigate to="/" />} />
            <Route path="/seller/analytics" element={user && userRole === 'seller' ? <SellerAnalytics /> : <Navigate to="/" />} />
            <Route path="/seller/settings" element={user && userRole === 'seller' ? <SellerSettings /> : <Navigate to="/" />} />

            {/* ROUTES ADMIN */}
            <Route path="/admin" element={user && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/admin/users" element={user && userRole === 'admin' ? <AdminUserManagement /> : <Navigate to="/" />} />
            <Route path="/admin/moderation" element={user && userRole === 'admin' ? <AdminContentModeration /> : <Navigate to="/" />} />
            <Route path="/admin/artists" element={user && userRole === 'admin' ? <AdminArtistVerification /> : <Navigate to="/" />} />
            <Route path="/admin/sellers" element={user && userRole === 'admin' ? <AdminSellerVerification /> : <Navigate to="/" />} />
            <Route path="/admin/analytics" element={user && userRole === 'admin' ? <AdminAnalytics /> : <Navigate to="/" />} />
            <Route path="/admin/payments" element={user && userRole === 'admin' ? <AdminPaymentManagement /> : <Navigate to="/" />} />
            <Route path="/admin/settings" element={user && userRole === 'admin' ? <AdminSystemSettings /> : <Navigate to="/" />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#00C851', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#FF4444', secondary: '#fff' },
            },
          }}
        />
      </SafeArea>
    </QueryClientProvider>
  )
}

export default App
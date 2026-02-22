import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  updateEmail,
  verifyBeforeUpdateEmail,
  reload
} from 'firebase/auth'
import { auth, googleProvider, actionCodeSettings, getActionCodeSettings } from './firebase'
import api from './api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  // Use localStorage to provide "Instant Load" and zero-flicker on refresh
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('bt_user_cache')
    return cached ? JSON.parse(cached) : null
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Define updateUser before useEffect so it can be used in the closure
  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...userData } : userData
      localStorage.setItem('bt_user_cache', JSON.stringify(updated))
      return updated
    })
  }, [])

  const refreshUserData = useCallback(async () => {
    const firebaseUser = auth.currentUser
    if (!firebaseUser) return null

    try {
      const token = await firebaseUser.getIdToken(true) // Force refresh token

      const [accountData, membershipData, businessData] = await Promise.all([
        api.get('/auth/account').catch(err => {
          console.error('Failed to fetch account data:', err)
          return { data: null }
        }),
        api.get('/businesses/my-membership').catch(err => {
          if (err.response?.status !== 404) {
            console.error('Failed to fetch membership info:', err)
          }
          return { data: null }
        }),
        api.get('/businesses/my-business').catch(err => {
          if (err.response?.status !== 404) {
            console.error('Failed to fetch business customization:', err)
          }
          return { data: null }
        })
      ])

      const updatedUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
        photoURL: firebaseUser.photoURL,
        emailVerified: firebaseUser.emailVerified || false,
        isAdmin: accountData?.data?.isAdmin === true,
        isSuperAdmin: accountData?.data?.isSuperAdmin === true,
        role: accountData?.data?.role || 'user',
        accountType: accountData?.data?.accountType || 'personal',
        companyName: accountData?.data?.companyName || '',
        accountStatus: accountData?.data?.accountStatus || 'active',
        businessPermissions: accountData?.data?.businessPermissions || [],
        currentBusiness: membershipData?.data ? {
          id: membershipData.data.businessId,
          name: membershipData.data.businessName,
          membersCount: membershipData.data.membersCount
        } : null,
        isBusinessOwner: membershipData?.data?.isOwner || false,
        businessRole: membershipData?.data?.role || 'member',
        businessCustomization: businessData?.data?.customization || null
      }

      setUser(updatedUser)
      localStorage.setItem('bt_user_cache', JSON.stringify(updatedUser))
      return updatedUser
    } catch (error) {
      console.error('Error refreshing user data:', error)
      return null
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Use onAuthStateChanged which is the reliable way to detect auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If we don't have a cached user, show the global loader
        if (!user) setLoading(true)
        setIsRefreshing(true)

        await refreshUserData()
        setLoading(false)
      } else {
        // No user signed in - clear cache
        setUser(null)
        localStorage.removeItem('bt_user_cache')
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [refreshUserData])

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const token = await userCredential.user.getIdToken()

      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })

      // Check if user has 2FA enabled
      try {
        const accountResponse = await api.get('/auth/account')
        if (accountResponse.data?.twoFactorEnabled) {
          // User has 2FA enabled - send code and return special flag
          try {
            await api.post('/auth/2fa/send-code', {})
          } catch (sendError) {
            // If sending code fails, still return requires2FA so user can request it again
            console.warn('Failed to send 2FA code:', sendError)
          }
          return {
            requires2FA: true,
            token: token, // Store token temporarily for 2FA verification
            user: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              name: userCredential.user.displayName || userCredential.user.email?.split('@')[0],
              photoURL: userCredential.user.photoURL
            }
          }
        }
      } catch (accountError) {
        // If account check fails, continue with normal login
        console.warn('Failed to check 2FA status:', accountError)
      }

      return {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0],
          photoURL: userCredential.user.photoURL
        }
      }
    } catch (error) {
      throw error
    }
  }

  const verify2FACode = async (code, tempToken) => {
    try {
      const response = await api.post('/auth/2fa/verify-code', { code })
      return response.data
    } catch (error) {
      throw error
    }
  }

  const register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile with name
      if (name) {
        await updateProfile(userCredential.user, { displayName: name })
      }

      // Send email verification
      try {
        await sendEmailVerification(userCredential.user, actionCodeSettings)
      } catch (verifyError) {
        console.warn('Failed to send verification email:', verifyError)
        // Don't fail registration if verification email fails
      }

      const token = await userCredential.user.getIdToken()

      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })

      return {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: name || userCredential.user.email?.split('@')[0],
          photoURL: userCredential.user.photoURL,
          emailVerified: userCredential.user.emailVerified
        }
      }
    } catch (error) {
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const token = await result.user.getIdToken()

      // Check if this is a new user (first time signing in)
      const metadata = result.user.metadata
      const isNewUser = metadata.creationTime === metadata.lastSignInTime

      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })

      // Check if user has business registration
      let hasBusiness = false
      try {
        const businessResponse = await api.get('/businesses/my-business')
        hasBusiness = !!businessResponse.data
      } catch (error) {
        // No business found or error - treat as no business
        hasBusiness = false
      }

      // Check if user has 2FA enabled
      try {
        const accountResponse = await api.get('/auth/account')
        if (accountResponse.data?.twoFactorEnabled) {
          // User has 2FA enabled - send code and return special flag
          try {
            await api.post('/auth/2fa/send-code', {})
          } catch (sendError) {
            console.warn('Failed to send 2FA code:', sendError)
          }
          return {
            requires2FA: true,
            token: token,
            isNewUser,
            hasBusiness,
            user: {
              uid: result.user.uid,
              email: result.user.email,
              name: result.user.displayName || result.user.email?.split('@')[0],
              photoURL: result.user.photoURL
            }
          }
        }
      } catch (accountError) {
        console.warn('Failed to check 2FA status:', accountError)
      }

      return {
        isNewUser,
        hasBusiness,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName || result.user.email?.split('@')[0],
          photoURL: result.user.photoURL
        }
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await firebaseSignOut(auth)
      await api.post('/auth/logout')
      setUser(null)
      localStorage.removeItem('bt_user_cache')
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  }

  const sendVerificationEmail = async () => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('No user signed in')
      }
      if (currentUser.emailVerified) {
        throw new Error('Email is already verified')
      }
      const settings = getActionCodeSettings('verifyEmail')
      await sendEmailVerification(currentUser, settings)
      return { success: true, message: 'Verification email sent! Please check your inbox.' }
    } catch (error) {
      throw error
    }
  }

  const checkEmailVerified = async () => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        return false
      }
      await reload(currentUser)
      const isVerified = currentUser.emailVerified
      if (isVerified && user) {
        updateUser({ emailVerified: true })
      }
      return isVerified
    } catch (error) {
      console.error('Error checking email verification:', error)
      return false
    }
  }

  const changeEmail = async (newEmail, password) => {
    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('No user signed in')
      }

      if (!password) {
        throw new Error('Password is required to change email')
      }

      // Re-authenticate user before changing email
      await signInWithEmailAndPassword(auth, currentUser.email, password)

      // Use verifyBeforeUpdateEmail to send verification to new email
      const settings = getActionCodeSettings('verifyAndChangeEmail')
      await verifyBeforeUpdateEmail(currentUser, newEmail, settings)

      return {
        success: true,
        message: 'Verification email sent to your new email address. Please verify to complete the change.'
      }
    } catch (error) {
      throw error
    }
  }

  // Proactively refresh Firebase ID token after long idle periods
  // and keep local user cache in sync to avoid \"half logged-in\" state.
  useEffect(() => {
    let visibilityHandler

    const refreshTokenIfNeeded = async () => {
      try {
        await auth.authStateReady()
        const currentUser = auth.currentUser

        if (!currentUser) {
          // No authenticated Firebase user - clear local cache
          setUser(null)
          localStorage.removeItem('bt_user_cache')
          return
        }

        // Force-refresh ID token; this will silently handle expiry
        await currentUser.getIdToken(true)
      } catch (err) {
        console.error('Auth token refresh on visibility change failed:', err)
      }
    }

    // Refresh when tab becomes visible again after being hidden for a while
    visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        refreshTokenIfNeeded()
      }
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    // Also attempt a refresh once on mount
    refreshTokenIfNeeded()

    return () => {
      if (visibilityHandler && typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', visibilityHandler)
      }
    }
  }, [setUser])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      verify2FACode,
      login,
      register,
      loginWithGoogle,
      logout,
      updateUser,
      sendVerificationEmail,
      checkEmailVerified,
      changeEmail,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

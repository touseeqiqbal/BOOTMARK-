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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Define updateUser before useEffect so it can be used in the closure
  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...userData } : userData
      console.log('🔍 [AUTH DEBUG] User updated:', updated)
      console.log('🔍 [AUTH DEBUG] businessPermissions:', updated.businessPermissions)
      return updated
    })
  }, [])

  useEffect(() => {
    // Use onAuthStateChanged which is the reliable way to detect auth state
    // It fires once immediately when auth state is determined, then on changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Get token first
          const token = await firebaseUser.getIdToken()
          localStorage.setItem('firebase_token', token)

          // Fetch ALL data in parallel to avoid multiple re-renders
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

          console.log('🔍 [AUTH DEBUG] All data fetched in parallel')
          console.log('🔍 [AUTH DEBUG] Account data:', accountData?.data)
          console.log('🔍 [AUTH DEBUG] Membership data:', membershipData?.data)

          // Set user data ONCE with all information - single re-render
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified || false,
            // Account data
            isAdmin: accountData?.data?.isAdmin === true,
            isSuperAdmin: accountData?.data?.isSuperAdmin === true,
            role: accountData?.data?.role || 'user',
            accountType: accountData?.data?.accountType || 'personal',
            companyName: accountData?.data?.companyName || '',
            accountStatus: accountData?.data?.accountStatus || 'active',
            businessPermissions: accountData?.data?.businessPermissions || [],
            // Membership data
            currentBusiness: membershipData?.data ? {
              id: membershipData.data.businessId,
              name: membershipData.data.businessName,
              membersCount: membershipData.data.membersCount
            } : null,
            isBusinessOwner: membershipData?.data?.isOwner || false,
            businessRole: membershipData?.data?.role || 'member',
            // Business customization
            businessCustomization: businessData?.data?.customization || null
          })

          // Set loading to false AFTER all data is ready
          setLoading(false)

          // Verify token in background (non-blocking, don't await)
          api.post('/auth/verify-firebase-token', { token }).catch(error => {
            console.error('Token verification failed:', error)
          })
        } catch (error) {
          console.error('Auth error:', error)
          // Set basic user data even if additional data fails
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified || false,
            isAdmin: false,
            isSuperAdmin: false,
            role: 'user',
            accountType: 'personal',
            accountStatus: 'active',
            companyName: '',
            isBusinessOwner: false,
            businessRole: 'member',
            businessPermissions: []
          })
          setLoading(false)
        }
      } else {
        // No user signed in
        setUser(null)
        localStorage.removeItem('firebase_token')
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, []) // Removed updateUser dependency to prevent unnecessary re-runs

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const token = await userCredential.user.getIdToken()

      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })

      // Check if user has 2FA enabled
      try {
        const accountResponse = await api.get('/auth/account', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (accountResponse.data?.twoFactorEnabled) {
          // User has 2FA enabled - send code and return special flag
          try {
            await api.post('/auth/2fa/send-code', {}, {
              headers: { Authorization: `Bearer ${token}` }
            })
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
      const response = await api.post('/auth/2fa/verify-code', { code }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      })
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
        const businessResponse = await api.get('/businesses/my-business', {
          headers: { Authorization: `Bearer ${token}` }
        })
        hasBusiness = !!businessResponse.data
      } catch (error) {
        // No business found or error - treat as no business
        hasBusiness = false
      }

      // Check if user has 2FA enabled
      try {
        const accountResponse = await api.get('/auth/account', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (accountResponse.data?.twoFactorEnabled) {
          // User has 2FA enabled - send code and return special flag
          try {
            await api.post('/auth/2fa/send-code', {}, {
              headers: { Authorization: `Bearer ${token}` }
            })
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
      changeEmail
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

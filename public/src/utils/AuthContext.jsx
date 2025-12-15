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
        // Set user info immediately without waiting for token
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified || false,
          isAdmin: false, // Will be updated from account endpoint
          isSuperAdmin: false, // Will be updated from account endpoint
          role: 'user',
          accountType: 'personal',
          accountStatus: 'active',
          companyName: '',
          isBusinessOwner: false,
          businessRole: 'member',
          businessPermissions: []
        }

        setUser(userData)
        setLoading(false) // Set loading to false immediately

        // Get token and do async operations in background (non-blocking)
        firebaseUser.getIdToken().then(async (token) => {
          localStorage.setItem('firebase_token', token)

          // Fetch account data from backend (async, won't block)
          api.get('/auth/account').then(response => {
            if (response.data) {
              console.log('🔍 [AUTH DEBUG] /auth/account response:', response.data)
              console.log('🔍 [AUTH DEBUG] businessPermissions from /auth/account:', response.data.businessPermissions)
              updateUser({
                isAdmin: response.data.isAdmin === true,
                isSuperAdmin: response.data.isSuperAdmin === true,
                role: response.data.role || 'user',
                accountType: response.data.accountType || 'personal',
                companyName: response.data.companyName || '',
                accountStatus: response.data.accountStatus || 'active',
                businessPermissions: response.data.businessPermissions || [] // Include business permissions
              })
            }
          }).catch(error => {
            console.error('Failed to fetch account data:', error)
          })

          // Fetch membership info to determine business role/permissions
          api.get('/businesses/my-membership').then(response => {
            if (response.data) {
              console.log('🔍 [AUTH DEBUG] /my-membership response:', response.data)
              console.log('🔍 [AUTH DEBUG] NOT overwriting businessPermissions (already set from /auth/account)')
              updateUser({
                currentBusiness: {
                  id: response.data.businessId,
                  name: response.data.businessName,
                  membersCount: response.data.membersCount
                },
                isBusinessOwner: response.data.isOwner,
                businessRole: response.data.role
                // NOTE: businessPermissions already loaded from /auth/account above
                // Don't overwrite it here!
              })
            }
          }).catch(error => {
            if (error.response?.status !== 404) {
              console.error('Failed to fetch membership info:', error)
            }
          })

          // Fetch business customization to apply theme
          api.get('/businesses/my-business').then(response => {
            if (response.data?.customization) {
              // Store in user context for quick access
              updateUser({
                businessCustomization: response.data.customization
              })
            }
          }).catch(error => {
            if (error.response?.status !== 404) {
              console.error('Failed to fetch business customization:', error)
            }
          })

          // Send token to backend for verification (async, don't block)
          api.post('/auth/verify-firebase-token', { token }).catch(error => {
            console.error('Token verification failed:', error)
          })
        }).catch(error => {
          console.error('Error getting token:', error)
        })
      } else {
        // No user signed in
        setUser(null)
        localStorage.removeItem('firebase_token')
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [updateUser])

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

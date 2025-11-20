import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import api from './api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Define updateUser before useEffect so it can be used in the closure
  const updateUser = useCallback((userData) => {
    setUser(prev => prev ? { ...prev, ...userData } : userData)
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
          isAdmin: false, // Will be updated from account endpoint
          role: 'user'
        }
        
        setUser(userData)
        setLoading(false) // Set loading to false immediately
        
        // Get token and do async operations in background (non-blocking)
        firebaseUser.getIdToken().then(async (token) => {
          localStorage.setItem('firebase_token', token)
          
          // Fetch admin status from backend (async, won't block)
          api.get('/auth/account').then(response => {
            if (response.data) {
              updateUser({
                isAdmin: response.data.isAdmin === true,
                role: response.data.role || 'user'
              })
            }
          }).catch(error => {
            console.error('Failed to fetch admin status:', error)
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

  const register = async (email, password, name) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile with name
      if (name) {
        await updateProfile(userCredential.user, { displayName: name })
      }
      
      const token = await userCredential.user.getIdToken()
      
      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })
      
      return {
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: name || userCredential.user.email?.split('@')[0],
          photoURL: userCredential.user.photoURL
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
      
      // Verify token with backend
      await api.post('/auth/verify-firebase-token', { token })
      
      return {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

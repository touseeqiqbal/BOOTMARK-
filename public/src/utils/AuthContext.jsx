import { createContext, useContext, useState, useEffect } from 'react'
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get Firebase ID token
        const token = await firebaseUser.getIdToken()
        
        // Store token in localStorage for API requests
        localStorage.setItem('firebase_token', token)
        
        // Store user info
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          photoURL: firebaseUser.photoURL
        }
        
        setUser(userData)
        
        // Send token to backend for verification
        try {
          await api.post('/auth/verify-firebase-token', { token })
        } catch (error) {
          console.error('Token verification failed:', error)
        }
      } else {
        setUser(null)
        localStorage.removeItem('firebase_token')
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

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

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
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

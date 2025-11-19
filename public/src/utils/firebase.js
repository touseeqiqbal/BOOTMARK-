import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Your web app's Firebase configuration
// Read from environment variables (for production) or use fallback values (for local dev)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBRCemB0XiP0bc05HtsyWF5B51-e_cCnpE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "phoenix-app-5a433.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "phoenix-app-5a433",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "phoenix-app-5a433.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1027690637217",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1027690637217:web:c14f4475581a9098810de0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MJ7HJNMFPF"
}

// Initialize Firebase
let app
let auth
let analytics = null

try {
  app = initializeApp(firebaseConfig)
  console.log('Firebase initialized successfully')
  
  // Initialize Analytics (only in browser environment)
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app)
    } catch (error) {
      console.warn('Analytics initialization failed:', error)
    }
  }

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app)
} catch (error) {
  console.error('Firebase initialization failed:', error)
  console.error('Firebase config:', {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'missing',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    hasAppId: !!firebaseConfig.appId
  })
  throw error
}

// Configure password reset action URL
// This tells Firebase where to redirect users when they click the reset link
const getActionCodeSettings = () => {
  if (typeof window !== 'undefined') {
    return {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: true,
    }
  }
  // Fallback for SSR
  return {
    url: '/reset-password',
    handleCodeInApp: true,
  }
}

const actionCodeSettings = getActionCodeSettings()

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

export { auth, actionCodeSettings, analytics }
export default app

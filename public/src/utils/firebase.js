import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Your web app's Firebase configuration
// Read from environment variables (for production) or use fallback values (for local dev)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
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

// Configure action code settings for email actions (password reset, email verification, email change)
const getActionCodeSettings = (action = 'resetPassword') => {
  if (typeof window !== 'undefined') {
    // Determine the continue URL based on the action
    let continueUrl
    switch (action) {
      case 'verifyEmail':
        continueUrl = `${window.location.origin}/verify-email`
        break
      case 'verifyAndChangeEmail':
        continueUrl = `${window.location.origin}/verify-email`
        break
      case 'resetPassword':
      default:
        continueUrl = `${window.location.origin}/reset-password`
        break
    }
    
    return {
      url: continueUrl,
      handleCodeInApp: true,
      // iOS and Android are optional, but can be added if you have mobile apps
      // iOS: { bundleId: 'com.example.ios' },
      // Android: { packageName: 'com.example.android', installApp: true, minimumVersion: '12' },
    }
  }
  // Fallback for SSR
  return {
    url: 'https://localhost:3000/reset-password', // Update with your actual domain
    handleCodeInApp: true,
  }
}

const actionCodeSettings = getActionCodeSettings()

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

export { auth, actionCodeSettings, getActionCodeSettings, analytics }
export default app

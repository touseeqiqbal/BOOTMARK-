import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRCemB0XiP0bc05HtsyWF5B51-e_cCnpE",
  authDomain: "phoenix-app-5a433.firebaseapp.com",
  projectId: "phoenix-app-5a433",
  storageBucket: "phoenix-app-5a433.firebasestorage.app",
  messagingSenderId: "1027690637217",
  appId: "1:1027690637217:web:c14f4475581a9098810de0",
  measurementId: "G-MJ7HJNMFPF"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics (only in browser environment)
let analytics = null
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app)
  } catch (error) {
    console.warn('Analytics initialization failed:', error)
  }
}

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Configure password reset action URL
// This tells Firebase where to redirect users when they click the reset link
const actionCodeSettings = {
  url: `${window.location.origin}/reset-password`,
  handleCodeInApp: true,
}

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

export { actionCodeSettings, analytics }
export default app

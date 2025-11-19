import axios from 'axios'
import { auth } from './firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

// Add request interceptor to include Firebase token
api.interceptors.request.use(
  async (config) => {
    try {
      // Get current user and token
      const user = auth.currentUser
      if (user) {
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
        console.log('Token added to request:', token.substring(0, 20) + '...')
      } else {
        // Try to get token from localStorage as fallback
        const storedToken = localStorage.getItem('firebase_token')
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`
          console.log('Using stored token from localStorage')
        } else {
          console.warn('No Firebase user and no stored token found')
        }
      }
    } catch (error) {
      console.error('Error getting Firebase token:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      })
    } else if (error.request) {
      console.error('API Request Error:', error.request)
    } else {
      console.error('API Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api

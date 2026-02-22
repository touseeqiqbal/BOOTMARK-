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
      // Wait for Firebase Auth to initialize
      await auth.authStateReady()

      // Get current user and token
      const user = auth.currentUser
      if (user) {
        // Get valid token (automatically refreshes if expired)
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
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
  async (error) => {
    const originalRequest = error.config

    // If error is 401 (unauthorized) and we haven't retried yet,
    // attempt to refresh the Firebase ID token and retry the request.
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await auth.authStateReady()
        const user = auth.currentUser

        if (user) {
          // Force refresh token
          const token = await user.getIdToken(true)

          // Update auth header
          const authHeader = `Bearer ${token}`
          api.defaults.headers.common['Authorization'] = authHeader
          originalRequest.headers['Authorization'] = authHeader

          // Retry request with fresh token
          return api(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // If refresh fails, you can optionally redirect to login here.
        // For now, just fall through and reject the original error.
      }
    }

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

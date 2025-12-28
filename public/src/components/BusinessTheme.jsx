import { useEffect } from 'react'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'

/**
 * BusinessTheme Component
 * Applies business-wide customization (branding, themes, colors) to all users
 * This component injects CSS variables based on the business customization settings
 */
export default function BusinessTheme() {
  const { user } = useAuth()

  useEffect(() => {
    const applyBusinessTheme = async () => {
      try {
        // Fetch business customization
        const response = await api.get('/businesses/my-business')
        const business = response.data
        const customization = business?.customization || {}

        if (!customization || Object.keys(customization).length === 0) {
          // No customization, use defaults
          return
        }

        const root = document.documentElement

        // Apply colors
        if (customization.primaryColor) {
          root.style.setProperty('--primary-color', customization.primaryColor)
          root.style.setProperty('--color-primary', customization.primaryColor)
        }
        if (customization.secondaryColor) {
          root.style.setProperty('--secondary-color', customization.secondaryColor)
          root.style.setProperty('--color-secondary', customization.secondaryColor)
        }
        if (customization.accentColor) {
          root.style.setProperty('--accent-color', customization.accentColor)
          root.style.setProperty('--color-accent', customization.accentColor)
        }

        // Apply theme
        if (customization.theme) {
          const theme = customization.theme === 'auto' 
            ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
            : customization.theme
          
          root.setAttribute('data-theme', theme)
          document.body.className = document.body.className.replace(/theme-\w+/g, '')
          document.body.classList.add(`theme-${theme}`)
        }

        // Apply font family
        if (customization.fontFamily) {
          root.style.setProperty('--font-family', `${customization.fontFamily}, sans-serif`)
          document.body.style.fontFamily = `${customization.fontFamily}, sans-serif`
        }

        // Apply favicon if provided
        if (customization.favicon) {
          let favicon = document.querySelector("link[rel~='icon']")
          if (!favicon) {
            favicon = document.createElement('link')
            favicon.rel = 'icon'
            document.head.appendChild(favicon)
          }
          favicon.href = customization.favicon
        }

        // Apply app name to document title if provided
        if (customization.appName) {
          const currentTitle = document.title
          // Only update if title hasn't been customized by individual pages
          if (currentTitle.includes('BOOTMARK') || currentTitle === 'BOOTMARK') {
            document.title = customization.appName
          }
        }

        // Store customization in localStorage for quick access
        localStorage.setItem('businessCustomization', JSON.stringify(customization))
      } catch (error) {
        // If user is not part of a business or business not found, use defaults
        if (error.response?.status !== 404) {
          console.error('Failed to fetch business customization:', error)
        }
        // Try to use cached customization
        const cached = localStorage.getItem('businessCustomization')
        if (cached) {
          try {
            const customization = JSON.parse(cached)
            const root = document.documentElement
            if (customization.primaryColor) root.style.setProperty('--primary-color', customization.primaryColor)
            if (customization.secondaryColor) root.style.setProperty('--secondary-color', customization.secondaryColor)
            if (customization.accentColor) root.style.setProperty('--accent-color', customization.accentColor)
          } catch (e) {
            console.error('Failed to apply cached customization:', e)
          }
        }
      }
    }

    if (user) {
      applyBusinessTheme()
    }
  }, [user])

  return null // This component doesn't render anything
}


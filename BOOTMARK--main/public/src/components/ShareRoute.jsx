import { useState, useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import api from '../utils/api'
import ClientPortal from '../pages/ClientPortal'
import PublicForm from '../pages/PublicForm'

export default function ShareRoute() {
  const { shareKey } = useParams()
  const [isPrivate, setIsPrivate] = useState(null) // null = checking, true = private, false = public
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkFormType()
  }, [shareKey])

  const checkFormType = async () => {
    try {
      setLoading(true)
      console.log('[ShareRoute] Checking form type for:', shareKey)
      const response = await api.get(`/public/form/${shareKey}`)
      const form = response.data
      
      // Check if form is private
      const hasPrivateLinkSetting = form.settings && form.settings.hasOwnProperty('isPrivateLink')
      const isPrivateLink = hasPrivateLinkSetting && 
                           (form.settings.isPrivateLink === true || 
                            form.settings.isPrivateLink === 'true')
      
      console.log('[ShareRoute] Form is private:', isPrivateLink)
      setIsPrivate(isPrivateLink)
    } catch (error) {
      console.error('[ShareRoute] Failed to check form type:', error)
      // If 401, it's a private form requiring authentication
      if (error.response?.status === 401) {
        console.log('[ShareRoute] 401 error - treating as private form')
        setIsPrivate(true)
      } else {
        // For other errors, default to public (will show error in PublicForm)
        console.log('[ShareRoute] Defaulting to public form')
        setIsPrivate(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  // If private, show ClientPortal
  if (isPrivate) {
    return <ClientPortal />
  }

  // If public, show PublicForm directly
  return <PublicForm />
}


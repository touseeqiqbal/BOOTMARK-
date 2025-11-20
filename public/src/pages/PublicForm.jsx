import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import FieldRenderer from '../components/FieldRenderer'
import { Eye, Download, X, ChevronLeft, ChevronRight, Save, LogIn, FileText } from 'lucide-react'
import '../styles/PublicForm.css'

export default function PublicForm() {
  const { shareKey } = useParams()
  const navigate = useNavigate()
  const { user, login, loginWithGoogle, loading: authLoading } = useAuth()
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [formData, setFormData] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [currentPage, setCurrentPage] = useState(-1) // -1 means start page, 0+ means form pages
  const [pages, setPages] = useState([{ id: '1', name: 'Page 1', order: 0 }])
  const [errors, setErrors] = useState({})
  const [requiresAuth, setRequiresAuth] = useState(false)
  const [draftId, setDraftId] = useState(null)
  
  useEffect(() => {
    // Don't fetch form until auth context has finished loading
    // This prevents false positives when checking for authentication
    if (!authLoading) {
      console.log('[PublicForm] Auth loaded, fetching form. User:', user?.email || 'not logged in', 'ShareKey:', shareKey)
      // Reset refetch flag when shareKey changes
      hasRefetchedRef.current = false
      // Reset form state when shareKey changes
      setForm(null)
      setFields([])
      setRequiresAuth(false)
      setLoading(true)
      fetchForm()
    }
  }, [shareKey, authLoading])
  
  // Track previous user state to detect login
  const prevUserRef = useRef(user)
  const hasRefetchedRef = useRef(false)
  
  // Refetch form when user auth state changes (e.g., after login)
  // This handles the case where user logs in while on the share page
  useEffect(() => {
    // Check if user just logged in (changed from null/undefined to authenticated)
    const prevUser = prevUserRef.current
    const justLoggedIn = (!prevUser || !prevUser.uid) && user && user.uid && !authLoading
    
    // Refetch if user just logged in and we haven't refetched yet
    if (justLoggedIn && !hasRefetchedRef.current) {
      console.log('[PublicForm] User just logged in, fetching form. User:', user.email)
      // Reset state to force re-fetch
      setForm(null)
      setFields([])
      setRequiresAuth(false)
      setLoading(true)
      hasRefetchedRef.current = true
      fetchForm()
    }
    
    // Update ref to track user changes
    prevUserRef.current = user
    
    // Reset refetched flag if user logs out
    if (!user) {
      hasRefetchedRef.current = false
    }
  }, [user, authLoading, shareKey])

  const fetchForm = async () => {
    try {
      const response = await api.get(`/public/form/${shareKey}`)
      console.log('[PublicForm] Form fetched:', {
        id: response.data.id,
        title: response.data.title,
        isPrivateLink: response.data.settings?.isPrivateLink,
        hasSettings: !!response.data.settings,
        settingsKeys: response.data.settings ? Object.keys(response.data.settings) : []
      })
      
      setForm(response.data)
      setFields(response.data.fields || [])
      
      // Use explicit boolean check for isPrivateLink
      // Check if property exists and is explicitly true (boolean or string 'true')
      const hasPrivateLinkSetting = response.data.settings && 
                                   response.data.settings.hasOwnProperty('isPrivateLink');
      const isPrivate = hasPrivateLinkSetting && 
                       (response.data.settings.isPrivateLink === true || 
                        response.data.settings.isPrivateLink === 'true');
      setRequiresAuth(isPrivate)
      
      console.log('[PublicForm] Has settings:', !!response.data.settings);
      console.log('[PublicForm] Has isPrivateLink property:', hasPrivateLinkSetting);
      console.log('[PublicForm] isPrivateLink value:', response.data.settings?.isPrivateLink, typeof response.data.settings?.isPrivateLink);
      console.log('[PublicForm] Requires auth:', isPrivate, 'User:', user?.email)
      
      if (response.data.pages && response.data.pages.length > 0) {
        setPages(response.data.pages)
      } else {
        setPages([{ id: '1', name: 'Page 1', order: 0 }])
      }
      // Initialize current page based on start page setting
      if (response.data.settings?.showStartPage) {
        setCurrentPage(-1) // Start with start page
      } else {
        setCurrentPage(0) // Start with first form page
      }

      // If user is authenticated and form requires auth, try to load draft
      if (isPrivate && user) {
        loadDraft()
      }
    } catch (error) {
      console.error('[PublicForm] Failed to fetch form:', error)
      console.error('[PublicForm] Error status:', error.response?.status)
      console.error('[PublicForm] Error response:', error.response?.data)
      
      if (error.response?.status === 401) {
        // Authentication required - this is expected for private links
        const isPrivateLink = error.response?.data?.isPrivateLink || error.response?.data?.requiresAuth;
        console.log('[PublicForm] 401 Error - Authentication required for private link:', isPrivateLink)
        setRequiresAuth(true)
        setForm(null) // CRITICAL: Don't show form if auth required
        setFields([]) // Clear fields too
      } else if (error.response?.status === 403) {
        // Access denied (email not in allowed list)
        console.log('[PublicForm] 403 Error - Access denied')
        alert(error.response?.data?.message || 'Access denied')
        setRequiresAuth(true)
        setForm(null)
        setFields([])
      } else {
        // Other errors
        console.log('[PublicForm] Other error:', error.response?.status)
        alert(error.response?.data?.error || 'Form not found')
        setForm(null)
        setFields([])
      }
    } finally {
      setLoading(false)
    }
  }

  const loadDraft = async () => {
    try {
      const response = await api.get(`/public/form/${shareKey}/draft`)
      if (response.data && response.data.data) {
        setFormData(response.data.data)
        setDraftId(response.data.id)
      }
    } catch (error) {
      // No draft found or error loading - that's okay
      if (error.response?.status !== 404) {
        console.error('Failed to load draft:', error)
      }
    }
  }

  const getFieldsForPage = (pageIndex) => {
    if (pages.length === 1) return fields
    
    let pageBreakCount = 0
    const pageFields = []
    
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].type === 'page-break') {
        pageBreakCount++
        if (pageBreakCount > pageIndex) break
        continue
      }
      if (pageBreakCount === pageIndex) {
        pageFields.push(fields[i])
      } else if (pageIndex === 0 && pageBreakCount === 0) {
        pageFields.push(fields[i])
      }
    }
    
    return pageFields
  }

  const getProgress = () => {
    if (currentPage === -1) return 0 // Start page shows 0% progress
    const totalPages = pages.length
    if (totalPages <= 1) return 100
    const formPageIndex = currentPage + 1 // currentPage is 0-indexed for form pages
    return (formPageIndex / totalPages) * 100
  }

  const handleStartForm = () => {
    setCurrentPage(0) // Move to first form page
    window.scrollTo(0, 0)
  }

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1)
      window.scrollTo(0, 0)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    // Clear error for this field when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  // Validate required fields
  const validateForm = () => {
    const newErrors = {}
    const allFields = fields // Check all fields across all pages
    
    allFields.forEach(field => {
      // Skip validation for non-input fields
      if (['heading', 'divider', 'page-break', 'paragraph', 'logo', 'spinner'].includes(field.type)) {
        return
      }

      if (field.required) {
        const value = formData[field.id]
        let isEmpty = false

        // Check if field is empty based on type
        if (value === undefined || value === null || value === '') {
          isEmpty = true
        } else if (Array.isArray(value)) {
          // For checkbox/multiple choice, check if array is empty or only contains empty strings
          isEmpty = value.length === 0 || value.every(v => !v || v === '')
        } else if (typeof value === 'object') {
          // For complex fields like full-name, address, appointment
          if (field.type === 'full-name') {
            isEmpty = !value.firstName && !value.lastName
          } else if (field.type === 'address') {
            isEmpty = !value.street && !value.city && !value.state && !value.zip
          } else if (field.type === 'appointment') {
            isEmpty = !value.date || !value.time
          } else if (field.type === 'input-table') {
            // Check if table has any values
            isEmpty = Object.keys(value).length === 0 || Object.values(value).every(v => !v)
          } else {
            // Generic object check
            isEmpty = Object.keys(value).length === 0 || Object.values(value).every(v => !v || v === '')
          }
        } else if (field.type === 'file' || field.type === 'image') {
          // File inputs - check if files are selected
          isEmpty = !value || (value instanceof FileList && value.length === 0)
        } else if (field.type === 'signature') {
          isEmpty = !value || value === ''
        } else if (field.type === 'captcha') {
          isEmpty = value !== true // Captcha returns boolean
        }

        if (isEmpty) {
          newErrors[field.id] = `${field.label || 'This field'} is required`
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveDraft = async () => {
    if (!user) {
      alert('Please sign in to save your progress')
      return
    }

    setSaving(true)
    try {
      const response = await api.post(`/public/form/${shareKey}/draft`, {
        data: formData
      })
      setDraftId(response.data.draftId)
      alert('Draft saved successfully! You can continue later.')
    } catch (error) {
      console.error('Failed to save draft:', error)
      if (error.response?.status === 401) {
        alert('Please sign in to save your progress')
      } else {
        alert(error.response?.data?.error || 'Failed to save draft')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields first
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0]
      if (firstErrorField) {
        const errorElement = document.querySelector(`[data-field-id="${firstErrorField}"]`)
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      return
    }
    
    // Show preview if enabled
    if (form.settings?.showPreviewBeforeSubmit && !showPreview) {
      setShowPreview(true)
      return
    }
    
    setSubmitting(true)

    try {
      await api.post(`/public/form/${shareKey}/submit`, {
        data: formData,
        draftId: draftId
      })
      setSubmitted(true)
      setFormData({})
      setShowPreview(false)
      setErrors({})
      setDraftId(null) // Clear draft after successful submission
      
      // Delete draft if it was saved
      if (draftId) {
        try {
          await api.delete(`/public/form/${shareKey}/draft`)
        } catch (e) {
          // Ignore errors when deleting draft
        }
      }
    } catch (error) {
      console.error('Failed to submit form:', error)
      if (error.response?.status === 401) {
        alert('Please sign in to submit this form')
      } else {
        alert(error.response?.data?.error || 'Failed to submit form')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const downloadPDF = () => {
    import('jspdf').then((jsPDF) => {
      const { jsPDF: JSPDF } = jsPDF
      const doc = new JSPDF()
      
      // Add logo if available
      if (form.settings?.logo) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          doc.addImage(img, 'PNG', 10, 10, 50, 20)
          doc.text(form.title, 10, 40)
          let yPos = 50
          
          fields.forEach((field, idx) => {
            if (yPos > 280) {
              doc.addPage()
              yPos = 20
            }
            const value = formData[field.id]
            if (value !== undefined && value !== null && value !== '') {
              doc.setFontSize(10)
              doc.text(`${field.label}:`, 10, yPos)
              doc.setFontSize(9)
              const valueStr = Array.isArray(value) ? value.join(', ') : String(value)
              const lines = doc.splitTextToSize(valueStr, 180)
              doc.text(lines, 10, yPos + 5)
              yPos += lines.length * 5 + 10
            }
          })
          
          doc.save(`${form.title}_submission.pdf`)
        }
        img.src = form.settings.logo
      } else {
        doc.text(form.title, 10, 20)
        let yPos = 30
        
        fields.forEach((field) => {
          if (yPos > 280) {
            doc.addPage()
            yPos = 20
          }
          const value = formData[field.id]
          if (value !== undefined && value !== null && value !== '') {
            doc.setFontSize(10)
            doc.text(`${field.label}:`, 10, yPos)
            doc.setFontSize(9)
            const valueStr = Array.isArray(value) ? value.join(', ') : String(value)
            const lines = doc.splitTextToSize(valueStr, 180)
            doc.text(lines, 10, yPos + 5)
            yPos += lines.length * 5 + 10
          }
        })
        
        doc.save(`${form.title}_submission.pdf`)
      }
    }).catch(() => {
      alert('PDF library not loaded. Please install jspdf package.')
    })
  }

  const handleLogin = async () => {
    navigate(`/login?redirect=/share/${shareKey}`)
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      // After login, fetch form again to load draft
      await fetchForm()
    } catch (error) {
      console.error('Google login failed:', error)
      alert('Google login failed. Please try again.')
    }
  }

  // Show loading while auth context is loading or form is being fetched
  if (authLoading || loading) {
    return <div className="loading">Loading form...</div>
  }

  // CRITICAL: Check if authentication is required BEFORE checking if form exists
  // This handles the case where form fetch returned 401
  if (requiresAuth && !user) {
    console.log('[PublicForm] Rendering sign-in screen - requiresAuth:', requiresAuth, 'user:', user)
    return (
      <div className="public-form-page" style={{ padding: '40px 20px' }}>
        <div className="public-form-container" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="public-form-card" style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '12px', 
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
            <h1 style={{ marginBottom: '10px' }}>Sign In Required</h1>
            <p style={{ marginBottom: '30px', color: '#666' }}>
              This form requires you to sign in to BootMark to access and submit.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                onClick={handleLogin}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <LogIn size={20} />
                Sign In
              </button>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="btn btn-secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
            <p style={{ marginTop: '20px', fontSize: '14px', color: '#999' }}>
              Don't have an account? <a href="/register" style={{ color: '#4f46e5' }}>Sign up</a>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Apply styles to page container
  const pageStyle = {
    backgroundImage: form.settings?.backgroundImage ? `url(${form.settings.backgroundImage})` : 'none',
    backgroundColor: form.settings?.pageBackgroundColor || form.settings?.backgroundColor || '#f5f5f5',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: form.settings?.fontFamily || 'Inter, sans-serif',
    fontSize: form.settings?.fontSize || '16px',
    color: form.settings?.textColor || '#1f2937',
    '--primary-color': form.settings?.primaryColor || '#4f46e5',
    '--secondary-color': form.settings?.secondaryColor || '#6366f1',
    '--border-radius': form.settings?.borderRadius || '8px',
    '--field-spacing': form.settings?.fieldSpacing || '16px',
  }

  // Apply styles to form container
  const alignment = form.settings?.formAlignment || 'center'
  const containerStyle = {
    maxWidth: form.settings?.formWidth === '100%'
      ? (form.settings?.maxWidth || '800px')
      : (form.settings?.formWidth || '800px'),
    width: form.settings?.formWidth === '100%' ? '100%' : 'auto',
    // Default to centered alignment when not specified
    margin: alignment === 'center' ? '0 auto'
      : alignment === 'left' ? '0 auto 0 0'
      : '0 0 0 auto'
  }

  // Apply styles to form card
  const cardStyle = {
    backgroundColor: form.settings?.formCardBackgroundColor || form.settings?.backgroundColor || '#ffffff',
    borderRadius: form.settings?.borderRadius || '12px',
  }

  // Button style classes
  const getButtonClass = (type = 'primary') => {
    const baseClass = `btn btn-${type}`
    const style = form.settings?.buttonStyle || 'rounded'
    if (style === 'pill') return `${baseClass} btn-pill`
    if (style === 'square') return `${baseClass} btn-square`
    return baseClass
  }

  const isOnStartPage = currentPage === -1 && form?.settings?.showStartPage
  const pageFields = isOnStartPage ? [] : getFieldsForPage(currentPage)
  const isLastPage = !isOnStartPage && currentPage === pages.length - 1
  const isFirstPage = !isOnStartPage && currentPage === 0

  return (
    <>
      {/* Inject custom CSS */}
      {form.settings?.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: form.settings.customCSS }} />
      )}
      <div className="public-form-page" style={pageStyle}>
        <div className="public-form-container" style={containerStyle}>
          <div className="public-form-card" style={cardStyle}>
          {form.settings?.logo && (
            <div className="form-logo-header">
              <img src={form.settings.logo} alt="Logo" className="form-header-logo" />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h1 className="form-title">{form.title}</h1>
            {form.settings?.isPrivateLink && user && (
              <Link 
                to={`/client/submissions/${shareKey}`}
                className="btn btn-secondary"
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none'
                }}
              >
                <FileText size={16} />
                My Submissions
              </Link>
            )}
          </div>
          
          {/* Progress Bar */}
          {form.settings?.showProgressBar && pages.length > 1 && !isOnStartPage && (
            <div className="form-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${getProgress()}%`,
                    backgroundColor: form.settings?.primaryColor || '#4f46e5'
                  }}
                />
              </div>
              <div className="progress-text">
                Page {currentPage + 1} of {pages.length}
              </div>
            </div>
          )}
          
          {submitted ? (
            <div className="submission-success">
              <div className="success-icon">✓</div>
              <h2>Thank you!</h2>
              <p>{form.settings?.confirmationMessage || 'Your submission has been received.'}</p>
              {form.settings?.isPrivateLink && (
                <Link 
                  to={`/client/submissions/${shareKey}`}
                  className="btn btn-secondary"
                  style={{
                    marginTop: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none'
                  }}
                >
                  <FileText size={18} />
                  View My Submissions
                </Link>
              )}
            </div>
          ) : isOnStartPage ? (
            <div className="start-page">
              <div className="start-page-content">
                <h2 className="start-page-title">
                  {form.settings?.startPageTitle || 'Welcome'}
                </h2>
                {form.settings?.startPageDescription && (
                  <div className="start-page-description">
                    {form.settings.startPageDescription.split('\n').map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
              <div className="start-page-actions">
                <button 
                  type="button"
                  className={`${getButtonClass('primary')} btn-large`}
                  onClick={handleStartForm}
                  style={{ 
                    backgroundColor: form.settings?.primaryColor || '#4f46e5',
                    borderRadius: form.settings?.borderRadius || '8px'
                  }}
                >
                  {form.settings?.startButtonText || 'Start'}
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="public-form">
              {pageFields.map(field => (
                <div key={field.id} data-field-id={field.id}>
                  <FieldRenderer
                    field={field}
                    value={formData[field.id]}
                    onChange={(value) => handleFieldChange(field.id, value)}
                  />
                  {errors[field.id] && (
                    <div className="field-error" style={{ 
                      color: '#ef4444', 
                      fontSize: '14px', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span>⚠</span>
                      <span>{errors[field.id]}</span>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="form-actions">
                {!isFirstPage && (
                  <button 
                    type="button"
                    className={getButtonClass('secondary')}
                    onClick={prevPage}
                    style={{ 
                      backgroundColor: form.settings?.secondaryColor || '#6366f1',
                      borderRadius: form.settings?.borderRadius || '8px'
                    }}
                  >
                    <ChevronLeft size={18} />
                    Previous
                  </button>
                )}
                {!isLastPage ? (
                  <button 
                    type="button"
                    className={getButtonClass('primary')}
                    onClick={() => {
                      // Validate current page before moving to next
                      const pageFields = getFieldsForPage(currentPage)
                      const pageErrors = {}
                      pageFields.forEach(field => {
                        if (field.required && !formData[field.id]) {
                          const value = formData[field.id]
                          let isEmpty = value === undefined || value === null || value === ''
                          if (Array.isArray(value)) {
                            isEmpty = value.length === 0 || value.every(v => !v || v === '')
                          } else if (typeof value === 'object' && value !== null) {
                            if (field.type === 'full-name') {
                              isEmpty = !value.firstName && !value.lastName
                            } else if (field.type === 'address') {
                              isEmpty = !value.street && !value.city && !value.state && !value.zip
                            } else if (field.type === 'appointment') {
                              isEmpty = !value.date || !value.time
                            } else {
                              isEmpty = Object.keys(value).length === 0
                            }
                          }
                          if (isEmpty) {
                            pageErrors[field.id] = `${field.label || 'This field'} is required`
                          }
                        }
                      })
                      if (Object.keys(pageErrors).length > 0) {
                        setErrors(prev => ({ ...prev, ...pageErrors }))
                        const firstError = Object.keys(pageErrors)[0]
                        const errorElement = document.querySelector(`[data-field-id="${firstError}"]`)
                        if (errorElement) {
                          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                        return
                      }
                      nextPage()
                    }}
                    style={{ 
                      backgroundColor: form.settings?.primaryColor || '#4f46e5',
                      borderRadius: form.settings?.borderRadius || '8px'
                    }}
                  >
                    Next
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <>
                    {form.settings?.showPreviewBeforeSubmit && !showPreview && (
                      <button 
                        type="button"
                        className={getButtonClass('secondary')}
                        onClick={() => setShowPreview(true)}
                        style={{ 
                          backgroundColor: form.settings?.secondaryColor || '#6366f1',
                          borderRadius: form.settings?.borderRadius || '8px'
                        }}
                      >
                        <Eye size={18} />
                        Preview
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className={`${getButtonClass('primary')} btn-large`}
                      disabled={submitting}
                      style={{ 
                        backgroundColor: form.settings?.primaryColor || '#4f46e5',
                        borderRadius: form.settings?.borderRadius || '8px'
                      }}
                    >
                      {submitting ? 'Submitting...' : showPreview ? 'Confirm Submit' : 'Submit'}
                    </button>
                  </>
                )}
                {/* Save and Continue Later button - only show if form requires auth */}
                {form.settings?.isPrivateLink && (
                  <button 
                    type="button"
                    className={getButtonClass('secondary')}
                    onClick={handleSaveDraft}
                    disabled={saving}
                    style={{ 
                      backgroundColor: form.settings?.secondaryColor || '#6366f1',
                      borderRadius: form.settings?.borderRadius || '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Save size={18} />
                    {saving ? 'Saving...' : 'Save and Continue Later'}
                  </button>
                )}
                {isLastPage && (
                  <>
                    <button 
                      type="button"
                      className={getButtonClass('secondary')}
                      onClick={downloadPDF}
                      style={{ 
                        backgroundColor: form.settings?.secondaryColor || '#6366f1',
                        borderRadius: form.settings?.borderRadius || '8px'
                      }}
                    >
                      <Download size={18} />
                      Download PDF
                    </button>
                    {showPreview && (
                      <button 
                        type="button"
                        className={getButtonClass('secondary')}
                        onClick={() => setShowPreview(false)}
                        style={{ 
                          backgroundColor: form.settings?.secondaryColor || '#6366f1',
                          borderRadius: form.settings?.borderRadius || '8px'
                        }}
                      >
                        <X size={18} />
                        Edit
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {showPreview && isLastPage && (
                <div className="form-preview-section">
                  <h3>Preview Your Submission</h3>
                  <div className="preview-content">
                    {fields.map(field => {
                      const value = formData[field.id]
                      if (value === undefined || value === null || value === '') return null
                      return (
                        <div key={field.id} className="preview-item">
                          <strong>{field.label}:</strong>
                          <span>
                            {Array.isArray(value) 
                              ? value.join(', ') 
                              : typeof value === 'object' 
                              ? JSON.stringify(value) 
                              : String(value)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </form>
          )}
          </div>
        </div>
      </div>
    </>
  )
}

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { FileText, Plus, Calendar, ExternalLink, LogIn, User, LogOut } from 'lucide-react'
import '../styles/ClientPortal.css'

export default function ClientPortal() {
  const { shareKey } = useParams()
  const navigate = useNavigate()
  const { user, logout, loading: authLoading } = useAuth()
  const [form, setForm] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      return
    }

    // Fetch form info first (works for both public and private forms)
    fetchForm()
  }, [shareKey, authLoading, user])

  const fetchForm = async () => {
    try {
      setLoading(true)
      console.log('[ClientPortal] Fetching form:', shareKey, 'User:', user?.email || 'not logged in')
      
      // Try to fetch form - this will work for public forms or private forms with auth
      const formResponse = await api.get(`/public/form/${shareKey}`)
      const fetchedForm = formResponse.data
      setForm(fetchedForm)

      // Check if form requires authentication
      const hasPrivateLinkSetting = fetchedForm.settings && fetchedForm.settings.hasOwnProperty('isPrivateLink')
      const isPrivateLink = hasPrivateLinkSetting && 
                           (fetchedForm.settings.isPrivateLink === true || 
                            fetchedForm.settings.isPrivateLink === 'true')

      // If form is private and user is not authenticated, don't fetch submissions
      // (will show login prompt below)
      if (isPrivateLink && !user) {
        console.log('[ClientPortal] Private form, user not authenticated')
        setSubmissions([])
        setLoading(false)
        return
      }

      // Fetch client's submissions only if user is authenticated
      if (user) {
        try {
          const submissionsResponse = await api.get(`/public/form/${shareKey}/submissions`)
          setSubmissions(submissionsResponse.data || [])
        } catch (subError) {
          // If submissions endpoint fails, just set empty array
          console.log('Could not fetch submissions:', subError)
          setSubmissions([])
        }
      } else {
        // Public form, no submissions to show
        setSubmissions([])
      }
    } catch (error) {
      console.error('[ClientPortal] Failed to fetch form:', error)
      console.error('[ClientPortal] Error status:', error.response?.status)
      
      if (error.response?.status === 401) {
        // Private form requires authentication - keep form as null to show login prompt
        console.log('[ClientPortal] 401 - Authentication required for private form')
        // Don't set form - this will trigger the login prompt UI
        setForm(null)
        setSubmissions([])
      } else if (error.response?.status === 403) {
        // Access denied
        console.log('[ClientPortal] 403 - Access denied')
        setForm(null)
        setSubmissions([])
      } else {
        // Other errors (404, 500, etc.)
        console.log('[ClientPortal] Other error:', error.response?.status)
        setForm(null)
        setSubmissions([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate(`/share/${shareKey}`)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderSubmissionValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="client-portal">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  // If form is null and user is not authenticated, it means we got a 401 (private form)
  // Show login prompt instead of "Form not found"
  if (!form && !user) {
    return (
      <div className="client-portal">
        <div className="client-portal-container">
          <div className="login-prompt-card">
            <div className="login-prompt-icon">🔒</div>
            <h1>Form Access</h1>
            <p>Please sign in to access this form and view your submissions.</p>
            <div className="login-prompt-actions">
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/login?redirect=/share/${shareKey}`)}
              >
                <LogIn size={20} />
                Sign In
              </button>
            </div>
            <p className="login-prompt-footer">
              Don't have an account? <Link to={`/register?redirect=/share/${shareKey}`}>Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check if form is private (only if we have form data)
  const hasPrivateLinkSetting = form?.settings && form.settings.hasOwnProperty('isPrivateLink')
  const isPrivateLink = hasPrivateLinkSetting && 
                       (form?.settings.isPrivateLink === true || 
                        form?.settings.isPrivateLink === 'true')

  // Show login prompt if form is private and user is not authenticated
  if (isPrivateLink && !user) {
    return (
      <div className="client-portal">
        <div className="client-portal-container">
          <div className="login-prompt-card">
            <div className="login-prompt-icon">🔒</div>
            <h1>{form?.title || 'Form Access'}</h1>
            <p>Please sign in to access this form and view your submissions.</p>
            <div className="login-prompt-actions">
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/login?redirect=/share/${shareKey}`)}
              >
                <LogIn size={20} />
                Sign In
              </button>
            </div>
            <p className="login-prompt-footer">
              Don't have an account? <Link to={`/register?redirect=/share/${shareKey}`}>Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show login prompt if form is null and user is not authenticated
  // This handles the case where we got a 401 (private form without auth)
  if (!form && !user) {
    return (
      <div className="client-portal">
        <div className="client-portal-container">
          <div className="login-prompt-card">
            <div className="login-prompt-icon">🔒</div>
            <h1>Form Access</h1>
            <p>Please sign in to access this form and view your submissions.</p>
            <div className="login-prompt-actions">
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/login?redirect=/share/${shareKey}`)}
              >
                <LogIn size={20} />
                Sign In
              </button>
            </div>
            <p className="login-prompt-footer">
              Don't have an account? <Link to={`/register?redirect=/share/${shareKey}`}>Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show form not found only if we have a user (meaning it's not an auth issue)
  if (!form && user) {
    return (
      <div className="client-portal">
        <div className="client-portal-container">
          <div className="error-message">Form not found</div>
        </div>
      </div>
    )
  }

  // If showForm is true, navigate to form filling page
  if (showForm) {
    navigate(`/share/${shareKey}/fill`)
    return null
  }

  // Show client portal with submissions
  return (
    <div className="client-portal">
      <div className="client-portal-container">
        <header className="client-portal-header">
          <div className="header-content">
            <div className="header-left">
              <h1>{form.title}</h1>
              {form.settings?.description && (
                <p className="form-description">{form.settings.description}</p>
              )}
            </div>
            <div className="header-right">
              {user && (
                <div className="user-info">
                  <User size={18} />
                  <span>{user.email}</span>
                  <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
              {!user && (
                <div className="user-info">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/login?redirect=/share/${shareKey}`)}
                  >
                    <LogIn size={16} />
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="client-portal-content">
          <div className="submissions-section">
            <div className="section-header">
              <h2>
                <FileText size={24} />
                My Submissions
              </h2>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <Plus size={20} />
                Fill Form
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state">
                <FileText size={64} />
                <h3>No Submissions Yet</h3>
                <p>You haven't submitted this form yet. Click "Fill Form" to get started.</p>
                <button 
                  className="btn btn-primary btn-large"
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={20} />
                  Fill Form Now
                </button>
              </div>
            ) : (
              <div className="submissions-list">
                {submissions.map((submission, index) => (
                  <div key={submission.id} className="submission-card">
                    <div className="submission-header">
                      <div className="submission-number">
                        <FileText size={20} />
                        <span>Submission #{submissions.length - index}</span>
                      </div>
                      <div className="submission-date">
                        <Calendar size={16} />
                        <span>{formatDate(submission.submittedAt)}</span>
                      </div>
                    </div>
                    <div className="submission-content">
                      {form.fields && form.fields.map(field => {
                        const value = submission.data?.[field.id]
                        if (value === null || value === undefined || value === '') return null
                        
                        return (
                          <div key={field.id} className="submission-field">
                            <strong>{field.label}:</strong>
                            <span>{renderSubmissionValue(value)}</span>
                          </div>
                        )
                      })}
                    </div>
                    {submission.submittedAt && (
                      <div className="submission-footer">
                        <span>Submitted: {formatDate(submission.submittedAt)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


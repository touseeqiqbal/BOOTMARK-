import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { CheckCircle, XCircle, Mail, Loader } from 'lucide-react'
import '../styles/AcceptInvite.css'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(null)

  useEffect(() => {
    if (!authLoading && user && token) {
      acceptInvitation()
    } else if (!authLoading && !user) {
      setStatus('error')
      setMessage('Please log in to accept this invitation')
    }
  }, [authLoading, user, token])

  const acceptInvitation = async () => {
    try {
      setStatus('loading')
      // Try both endpoints - by token (for email links) or by inviteId (for dashboard)
      let response;
      try {
        response = await api.post(`/forms/invites/accept/${token}`)
      } catch (tokenError) {
        // If token endpoint fails, try inviteId endpoint
        try {
          response = await api.post(`/forms/invites/${token}/accept`)
        } catch (inviteIdError) {
          throw tokenError // Throw original error
        }
      }
      
      if (response.data.success) {
        setStatus('success')
        setForm(response.data.form)
        setMessage(response.data.message || 'Invitation accepted successfully!')
        
        // Redirect to form after 2 seconds
        setTimeout(() => {
          navigate(`/form/${response.data.formId}`)
        }, 2000)
      } else {
        setStatus('error')
        setMessage(response.data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      setStatus('error')
      setMessage(error.response?.data?.error || error.response?.data?.message || 'Failed to accept invitation')
    }
  }

  if (authLoading || status === 'loading') {
    return (
      <div className="accept-invite">
        <div className="accept-invite-container">
          <Loader size={48} className="spinner" />
          <h2>Processing invitation...</h2>
          <p>Please wait while we accept your invitation.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="accept-invite">
      <div className="accept-invite-container">
        {status === 'success' ? (
          <>
            <div className="status-icon success">
              <CheckCircle size={64} />
            </div>
            <h1>Invitation Accepted!</h1>
            <p className="success-message">{message}</p>
            {form && (
              <div className="form-info">
                <h3>{form.title}</h3>
                <p>You now have access to this form. Redirecting...</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="status-icon error">
              <XCircle size={64} />
            </div>
            <h1>Unable to Accept Invitation</h1>
            <p className="error-message">{message}</p>
            <div className="actions">
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


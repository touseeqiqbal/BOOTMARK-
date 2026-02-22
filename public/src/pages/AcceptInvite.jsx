import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { CheckCircle, XCircle, Loader, Lock, User, ArrowRight } from 'lucide-react'
import '../styles/AcceptInvite.css'

export default function AcceptInvite() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [status, setStatus] = useState('verifying') // verifying, valid, error, success
  const [message, setMessage] = useState('')
  const [inviteData, setInviteData] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid invitation link: Missing token')
      return
    }

    // If already logged in, maybe warn them? But for now let's just proceed with verification
    // typically a logged in user shouldn't be clicking "accept invite" for a new account

    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const res = await api.get(`/client-invitations/verify/${token}`)
      setInviteData(res.data)
      setFormData(prev => ({ ...prev, name: res.data.name || '' }))
      setStatus('valid')
    } catch (error) {
      console.error('Verification failed:', error)
      setStatus('error')
      setMessage(error.response?.data?.error || 'Invalid or expired invitation link')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match')
      return
    }
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/client-invitations/accept', {
        token,
        password: formData.password,
        name: formData.name
      })
      setStatus('success')
    } catch (error) {
      console.error('Accept failed:', error)
      setMessage(error.response?.data?.error || 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'verifying') {
    return (
      <div className="accept-invite">
        <div className="accept-invite-container">
          <Loader size={48} className="spinner" />
          <h2>Verifying invitation...</h2>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="accept-invite">
        <div className="accept-invite-container">
          <div className="status-icon error">
            <XCircle size={64} />
          </div>
          <h1>Unable to Accept Invitation</h1>
          <p className="error-message">{message}</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="accept-invite">
        <div className="accept-invite-container">
          <div className="status-icon success">
            <CheckCircle size={64} />
          </div>
          <h1>Account Created!</h1>
          <p className="success-message">Your account has been successfully set up. You can now log in to the client portal.</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Log In to Portal
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="accept-invite">
      <div className="accept-invite-container">
        <h1>Welcome to Client Portal</h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Set up your account to access invoices, pay bills, and manage requests.
        </p>

        <form onSubmit={handleSubmit} className="accept-invite-form" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
          {message && <div style={{ color: 'red', marginBottom: '10px', fontSize: '14px' }}>{message}</div>}

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Full Name</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', padding: '8px 8px 8px 36px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Email</label>
            <input
              type="email"
              disabled
              value={inviteData?.email || ''}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#6b7280' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Create Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 6 characters"
                style={{ width: '100%', padding: '8px 8px 8px 36px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Confirm Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                style={{ width: '100%', padding: '8px 8px 8px 36px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
          >
            {submitting ? <Loader size={18} className="spinner" /> : <>Create Account <ArrowRight size={18} style={{ marginLeft: '8px' }} /></>}
          </button>
        </form>
      </div>
    </div>
  )
}


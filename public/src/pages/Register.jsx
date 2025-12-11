import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import { Chrome, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import '../styles/Login.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const { register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Check if redirected from login with email
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
    if (location.state?.message) {
      setInfo(location.state.message)
      // Clear the state
      window.history.replaceState({}, document.title)
      // Clear info message after 8 seconds
      setTimeout(() => setInfo(''), 8000)
    }
  }, [location])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await register(email, password, name)
      // Show verification message
      setShowVerificationMessage(true)
      // Wait a moment to show the message, then redirect
      setTimeout(() => {
        navigate('/business-registration')
      }, 3000)
    } catch (err) {
      setError(err.message || err.code || 'Registration failed. Please try again.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      // Check if user has a business, if not redirect to registration
      navigate('/business-registration')
    } catch (err) {
      setError(err.message || 'Google login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>BOOTMARK</h1>
        <p className="auth-subtitle">Create your account</p>

        {error && <div className="error-message">{error}</div>}

        {info && (
          <div style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e3a8a' }}>
                {info}
              </p>
            </div>
          </div>
        )}

        {showVerificationMessage && (
          <div style={{
            padding: '16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <Mail size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#1e40af', marginBottom: '4px' }}>
                Verification Email Sent!
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e3a8a' }}>
                We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link to verify your email address.
              </p>
            </div>
          </div>
        )}

        {!showVerificationMessage && (
          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label htmlFor="register-name">Name</label>
              <input
                id="register-name"
                name="name"
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                name="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                name="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        )}

        {!showVerificationMessage && (
          <>
            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button
              className="btn btn-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome size={18} />
              Sign up with Google
            </button>
          </>
        )}

        <p className="auth-footer">
          {showVerificationMessage ? (
            <span>Redirecting to business registration...</span>
          ) : (
            <>Already have an account? <Link to="/login">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Chrome, AlertCircle, Mail } from 'lucide-react'
import '../styles/Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationWarning, setShowVerificationWarning] = useState(false)
  const [role, setRole] = useState('admin') // NEW: Role selection (admin or client)
  const { login, loginWithGoogle, user, loading: authLoading, sendVerificationEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Check for success message from password reset
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)
      // Clear the state
      window.history.replaceState({}, document.title)
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    }
  }, [location])

  // Check if user is already logged in and redirect them (only if on login page)
  useEffect(() => {
    // Only redirect if we're actually on the login page
    if (location.pathname === '/login' && !authLoading && user) {
      const searchParams = new URLSearchParams(location.search)
      const redirect = searchParams.get('redirect')
      const redirectPath = redirect && redirect.startsWith('/') ? redirect : '/dashboard'
      // User already logged in, redirecting

      // Small delay to ensure everything is ready
      setTimeout(() => {
        navigate(redirectPath, { replace: true })
      }, 100)
    }
  }, [user, authLoading, location.pathname, location.search, navigate])

  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search)
    const redirect = searchParams.get('redirect')
    console.log('[Login] Redirect path:', redirect || (role === 'admin' ? '/dashboard' : '/client/dashboard'))

    // If there's a specific redirect, use it
    if (redirect && redirect.startsWith('/')) {
      return redirect
    }

    // Otherwise, redirect based on role
    return role === 'admin' ? '/dashboard' : '/client/dashboard'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First, check if user exists
      try {
        const checkResponse = await api.post('/auth/check-user', { email })

        if (!checkResponse.data.exists) {
          // User doesn't exist, redirect to signup
          setLoading(false)
          navigate('/register', {
            state: {
              email: email,
              message: 'No account found with this email. Please sign up first.'
            }
          })
          return
        }
      } catch (checkError) {
        // If check endpoint doesn't exist, continue with normal login
        console.warn('User check endpoint not available:', checkError)
      }

      // User exists, proceed with login
      const result = await login(email, password)

      // Check if 2FA is required
      if (result.requires2FA) {
        // Store temp token and redirect to 2FA verification
        localStorage.setItem('2fa_temp_token', result.token)
        localStorage.setItem('2fa_user_email', result.user.email)
        navigate('/verify-2fa', {
          state: {
            email: result.user.email,
            redirect: getRedirectPath()
          }
        })
        setLoading(false)
        return
      }

      // Check if email is verified
      if (result.user && !result.user.emailVerified) {
        setShowVerificationWarning(true)
      }

      // Check account status after login
      try {
        const accountResponse = await api.get('/auth/account')
        if (accountResponse.data?.accountStatus && accountResponse.data.accountStatus !== 'active') {
          // Account is pending or rejected, redirect to review page
          navigate('/account-review')
          setLoading(false)
          return
        }
      } catch (accountError) {
        console.warn('Failed to check account status:', accountError)
        // Continue with normal redirect if status check fails
      }

      const redirectPath = getRedirectPath()

      // Wait a moment for auth state to update, then redirect
      setTimeout(() => {
        if (redirectPath && redirectPath.startsWith('/share/')) {
          navigate(redirectPath)
        } else {
          navigate(redirectPath)
        }
      }, 200)
    } catch (err) {
      // Check if error is "user not found"
      const errorMessage = err.message || err.code || 'Login failed. Please check your credentials.'

      if (errorMessage.toLowerCase().includes('user not found') ||
        errorMessage.toLowerCase().includes('no user') ||
        err.code === 'auth/user-not-found') {
        // Redirect to signup
        setLoading(false)
        navigate('/register', {
          state: {
            email: email,
            message: 'No account found with this email. Please sign up first.'
          }
        })
        return
      }

      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle()

      // Check if 2FA is required
      if (result.requires2FA) {
        localStorage.setItem('2fa_temp_token', result.token)
        localStorage.setItem('2fa_user_email', result.user.email)
        navigate('/verify-2fa', {
          state: {
            email: result.user.email,
            redirect: getRedirectPath()
          }
        })
        setLoading(false)
        return
      }

      // Check if user is new or doesn't have business registration
      if (result.isNewUser || !result.hasBusiness) {
        // New user or no business → redirect to business registration
        navigate('/business-registration')
        setLoading(false)
        return
      }

      // Check account status after login
      try {
        const accountResponse = await api.get('/auth/account')
        if (accountResponse.data?.accountStatus && accountResponse.data.accountStatus !== 'active') {
          navigate('/account-review')
          setLoading(false)
          return
        }
      } catch (accountError) {
        console.warn('Failed to check account status:', accountError)
      }

      const redirectPath = getRedirectPath()

      // Wait a moment for auth state to update, then redirect
      setTimeout(() => {
        if (redirectPath && redirectPath.startsWith('/share/')) {
          navigate(redirectPath)
        } else {
          navigate(redirectPath)
        }
      }, 200)
    } catch (err) {
      setError(err.message || 'Google login failed')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>BOOTMARK</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{success}</div>}

        {showVerificationWarning && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                Email Not Verified
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#78350f', marginBottom: '8px' }}>
                Please verify your email address to access all features. Check your inbox for the verification link.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  try {
                    await sendVerificationEmail()
                    setSuccess('Verification email sent! Please check your inbox.')
                    setTimeout(() => setSuccess(''), 5000)
                  } catch (err) {
                    setError(err.message || 'Failed to send verification email')
                  }
                }}
                style={{ marginTop: '8px' }}
              >
                <Mail size={14} />
                Resend Verification Email
              </button>
            </div>
          </div>
        )}

        {/* Role Selection Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div
            onClick={() => setRole('admin')}
            style={{
              padding: '16px',
              border: role === 'admin' ? '2px solid #4f46e5' : '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              background: role === 'admin' ? '#eef2ff' : '#ffffff'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏢</div>
            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Business Owner</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Access admin dashboard</div>
          </div>

          <div
            onClick={() => setRole('client')}
            style={{
              padding: '16px',
              border: role === 'client' ? '2px solid #4f46e5' : '2px solid #e5e7eb',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              background: role === 'client' ? '#eef2ff' : '#ffffff'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
            <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>Client</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>View invoices & work orders</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : `Sign in as ${role === 'admin' ? 'Admin' : 'Client'}`}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          className="btn btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <Chrome size={18} />
          Sign in with Google
        </button>

        <p className="auth-footer">
          <Link to="/forgot-password" style={{ display: 'block', marginBottom: '10px', color: '#4f46e5' }}>
            Forgot password?
          </Link>
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  )
}


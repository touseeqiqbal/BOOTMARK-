import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import { Chrome } from 'lucide-react'
import '../styles/Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle, user, loading: authLoading } = useAuth()
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
      console.log('[Login] User already logged in on login page, redirecting to:', redirectPath)
      
      // Small delay to ensure everything is ready
      setTimeout(() => {
        navigate(redirectPath, { replace: true })
      }, 100)
    }
  }, [user, authLoading, location.pathname, location.search, navigate])

  const getRedirectPath = () => {
    const searchParams = new URLSearchParams(location.search)
    const redirect = searchParams.get('redirect')
    console.log('[Login] Redirect path:', redirect || '/dashboard')
    // Ensure redirect is a valid path
    if (redirect && redirect.startsWith('/')) {
      return redirect
    }
    return '/dashboard'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      const redirectPath = getRedirectPath()
      console.log('[Login] Login successful, redirect path:', redirectPath)
      
      // Wait a moment for auth state to update, then redirect
      setTimeout(() => {
        if (redirectPath && redirectPath.startsWith('/share/')) {
          console.log('[Login] Redirecting to share link:', redirectPath)
          navigate(redirectPath)
        } else {
          navigate(redirectPath)
        }
      }, 200)
    } catch (err) {
      setError(err.message || err.code || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
      const redirectPath = getRedirectPath()
      console.log('[Login] Google login successful, redirect path:', redirectPath)
      
      // Wait a moment for auth state to update, then redirect
      setTimeout(() => {
        if (redirectPath && redirectPath.startsWith('/share/')) {
          console.log('[Login] Redirecting to share link:', redirectPath)
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
          <h1>BootMark Landscaping Management</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message" style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#166534', padding: '12px', borderRadius: '6px', marginBottom: '20px' }}>{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
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


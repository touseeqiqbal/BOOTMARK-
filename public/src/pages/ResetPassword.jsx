import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { confirmPasswordReset } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { CheckCircle, XCircle } from 'lucide-react'
import '../styles/Login.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oobCode, setOobCode] = useState(null)

  useEffect(() => {
    // Firebase can send the code as 'oobCode' or 'code' parameter
    // When handleCodeInApp is true, Firebase uses 'oobCode' parameter
    const code = searchParams.get('oobCode') || searchParams.get('code')
    const mode = searchParams.get('mode')
    const apiKey = searchParams.get('apiKey')
    
    // Reset password params check
    
    if (code) {
      // If we have a code, use it regardless of mode
      // Firebase sometimes doesn't include mode when handleCodeInApp is true
      setOobCode(code)
    } else {
      // Check if this is a Firebase deep link that needs to be handled
      const link = window.location.href
      if (link.includes('mode=resetPassword') || link.includes('oobCode=') || link.includes('code=')) {
        // Try to extract code from the full URL
        const urlParams = new URLSearchParams(link.split('?')[1] || '')
        const extractedCode = urlParams.get('oobCode') || urlParams.get('code')
        if (extractedCode) {
          setOobCode(extractedCode)
          return
        }
      }
      setError('Invalid or missing reset code. Please use the link from your email.')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!oobCode) {
      setError('Invalid reset code')
      return
    }

    setLoading(true)

    try {
      console.log('Attempting to reset password with code:', oobCode ? 'present' : 'missing')
      await confirmPasswordReset(auth, oobCode, password)
      console.log('Password reset successful')
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please login with your new password.' } })
      }, 3000)
    } catch (err) {
      console.error('Password reset error:', err)
      let errorMessage = 'Failed to reset password.'
      if (err.code === 'auth/invalid-action-code') {
        errorMessage = 'This password reset link has expired or is invalid. Please request a new one.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.'
      } else if (err.code === 'auth/expired-action-code') {
        errorMessage = 'This password reset link has expired. Please request a new one.'
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled. Please contact support.'
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!oobCode && !error) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="auth-container">
        <div className="auth-card">
          <h1>BOOTMARK</h1>
        <p className="auth-subtitle">Set new password</p>
        
        {error && (
          <div className="error-message">
            <XCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}
        
        {success ? (
          <div className="success-message">
            <CheckCircle size={48} color="#10b981" style={{ marginBottom: '20px' }} />
            <h2>Password reset successful!</h2>
            <p>Your password has been reset. Redirecting to login...</p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Enter your new password below.
            </p>
            
            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  name="new-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Must be at least 6 characters
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            
            <p className="auth-footer">
              <Link to="/login">Back to Login</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

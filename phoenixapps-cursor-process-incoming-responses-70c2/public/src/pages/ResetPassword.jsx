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
    const code = searchParams.get('oobCode') || searchParams.get('code')
    const mode = searchParams.get('mode')
    
    if (code && mode === 'resetPassword') {
      setOobCode(code)
    } else if (code) {
      // If we have a code but no mode, assume it's a reset password code
      setOobCode(code)
    } else {
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
      await confirmPasswordReset(auth, oobCode, password)
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please login with your new password.' } })
      }, 3000)
    } catch (err) {
      let errorMessage = 'Failed to reset password.'
      if (err.code === 'auth/invalid-action-code') {
        errorMessage = 'This password reset link has expired or is invalid. Please request a new one.'
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.'
      } else {
        errorMessage = err.message || errorMessage
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
        <h1>Phoenix Form Builder</h1>
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
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Must be at least 6 characters
                </small>
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
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

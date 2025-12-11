import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, actionCodeSettings } from '../utils/firebase'
import { ArrowLeft, Mail } from 'lucide-react'
import '../styles/Login.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      // Validate email format
      if (!email || !email.includes('@')) {
        setError('Please enter a valid email address')
        setLoading(false)
        return
      }

      console.log('Sending password reset email to:', email)
      console.log('Action code settings:', actionCodeSettings)
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      setSuccess(true)
      console.log('Password reset email sent successfully')
    } catch (err) {
      console.error('Password reset error:', err)
      let errorMessage = 'Failed to send password reset email'
      
      // Provide more specific error messages
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address'
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later'
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
        <div className="auth-card">
          <h1>BOOTMARK</h1>
        <p className="auth-subtitle">Reset your password</p>
        
        {error && <div className="error-message">{error}</div>}
        
        {success ? (
          <div className="success-message">
            <Mail size={48} color="#10b981" style={{ marginBottom: '20px' }} />
            <h2>Check your email</h2>
            <p>We've sent a password reset link to <strong>{email}</strong></p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
              Please check your inbox and click the link to reset your password.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <p className="auth-footer">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

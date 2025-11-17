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
      await sendPasswordResetEmail(auth, email, actionCodeSettings)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to send password reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Phoenix Form Builder</h1>
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

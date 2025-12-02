import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { applyActionCode } from 'firebase/auth'
import { auth } from '../utils/firebase'
import { CheckCircle, XCircle, Mail } from 'lucide-react'
import '../styles/Login.css'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [oobCode, setOobCode] = useState(null)
  const [mode, setMode] = useState(null)

  useEffect(() => {
    // Firebase can send the code as 'oobCode' or 'code' parameter
    const code = searchParams.get('oobCode') || searchParams.get('code')
    const actionMode = searchParams.get('mode')
    
    console.log('Verify email params:', { code: code ? 'present' : 'missing', mode: actionMode })
    
    if (code) {
      setOobCode(code)
      setMode(actionMode || 'verifyEmail')
    } else {
      // Check if this is a Firebase deep link that needs to be handled
      const link = window.location.href
      if (link.includes('mode=verifyEmail') || link.includes('mode=verifyAndChangeEmail') || link.includes('oobCode=') || link.includes('code=')) {
        const urlParams = new URLSearchParams(link.split('?')[1] || '')
        const extractedCode = urlParams.get('oobCode') || urlParams.get('code')
        const extractedMode = urlParams.get('mode')
        if (extractedCode) {
          setOobCode(extractedCode)
          setMode(extractedMode || 'verifyEmail')
          return
        }
      }
      setError('Invalid or missing verification code. Please use the link from your email.')
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    if (oobCode && mode) {
      handleVerification()
    }
  }, [oobCode, mode])

  const handleVerification = async () => {
    if (!oobCode) return

    setLoading(true)
    setError('')

    try {
      console.log('Attempting to verify email with code:', oobCode ? 'present' : 'missing', 'mode:', mode)
      
      // Apply the action code (verifies email or completes email change)
      await applyActionCode(auth, oobCode)
      
      console.log('Email verification successful')
      setSuccess(true)
      
      // Reload the current user to get updated email verification status
      if (auth.currentUser) {
        await auth.currentUser.reload()
      }
      
      // Redirect to login or account settings after 3 seconds
      setTimeout(() => {
        if (auth.currentUser) {
          navigate('/account-settings', { state: { message: 'Email verified successfully!' } })
        } else {
          navigate('/login', { state: { message: 'Email verified successfully! Please login.' } })
        }
      }, 3000)
    } catch (err) {
      console.error('Email verification error:', err)
      let errorMessage = 'Failed to verify email.'
      if (err.code === 'auth/invalid-action-code') {
        errorMessage = 'This verification link has expired or is invalid. Please request a new verification email.'
      } else if (err.code === 'auth/expired-action-code') {
        errorMessage = 'This verification link has expired. Please request a new verification email.'
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

  if (loading && !error && !success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>BootMark Landscaping Management</h1>
          <p className="auth-subtitle">Verifying your email...</p>
          <div className="loading">Please wait...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>BootMark Landscaping Management</h1>
        <p className="auth-subtitle">
          {mode === 'verifyAndChangeEmail' ? 'Email Change Verification' : 'Email Verification'}
        </p>
        
        {error && (
          <div className="error-message">
            <XCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {error}
          </div>
        )}
        
        {success ? (
          <div className="success-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle size={64} color="#10b981" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '12px', color: '#10b981' }}>
              {mode === 'verifyAndChangeEmail' ? 'Email Changed Successfully!' : 'Email Verified!'}
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              {mode === 'verifyAndChangeEmail' 
                ? 'Your email address has been successfully changed. You can now use your new email to login.'
                : 'Your email has been verified successfully. You now have full access to all features.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {auth.currentUser ? (
                <Link to="/account-settings" className="btn btn-primary">
                  Go to Account Settings
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  Go to Login
                </Link>
              )}
              <Link to="/dashboard" className="btn btn-secondary">
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : !oobCode ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Mail size={64} color="#6b7280" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '12px' }}>Verification Link Required</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Please use the verification link from your email to verify your email address.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
              <Link to="/account-settings" className="btn btn-secondary">
                Account Settings
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


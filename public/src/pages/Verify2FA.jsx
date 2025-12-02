import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Shield, Mail, RefreshCw, ArrowLeft } from 'lucide-react'
import '../styles/Login.css'

export default function Verify2FA() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verify2FACode } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [email, setEmail] = useState(location.state?.email || localStorage.getItem('2fa_user_email') || '')
  const [redirectPath, setRedirectPath] = useState(location.state?.redirect || '/dashboard')
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes in seconds

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // Only allow digits
    
    const newCode = [...code]
    newCode[index] = value.slice(-1) // Only take last character
    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setCode(digits)
      setError('')
      // Focus last input
      const lastInput = document.getElementById('code-5')
      if (lastInput) lastInput.focus()
    }
  }

  const handleResendCode = async () => {
    setSendingCode(true)
    setError('')
    try {
      const tempToken = localStorage.getItem('2fa_temp_token')
      if (!tempToken) {
        setError('Session expired. Please login again.')
        navigate('/login')
        return
      }

      await api.post('/auth/2fa/send-code', {}, {
        headers: { Authorization: `Bearer ${tempToken}` }
      })
      
      setTimeLeft(600) // Reset timer
      setCode(['', '', '', '', '', ''])
      setError('')
      // Focus first input
      document.getElementById('code-0')?.focus()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code. Please try again.')
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    
    const fullCode = code.join('')
    if (fullCode.length !== 6) {
      setError('Please enter the complete 6-digit code')
      return
    }

    setLoading(true)

    try {
      const tempToken = localStorage.getItem('2fa_temp_token')
      if (!tempToken) {
        setError('Session expired. Please login again.')
        navigate('/login')
        return
      }

      await verify2FACode(fullCode, tempToken)
      
      // After 2FA verification, the user is already authenticated via Firebase
      // Just need to verify the token with backend one more time to complete the session
      try {
        await api.post('/auth/verify-firebase-token', { token: tempToken })
      } catch (verifyError) {
        console.warn('Token verification after 2FA failed:', verifyError)
        // Continue anyway - user is authenticated
      }
      
      // Clear temp token
      localStorage.removeItem('2fa_temp_token')
      localStorage.removeItem('2fa_user_email')
      
      // Check account status
      try {
        const accountResponse = await api.get('/auth/account')
        if (accountResponse.data?.accountStatus && accountResponse.data.accountStatus !== 'active') {
          navigate('/account-review')
          return
        }
      } catch (accountError) {
        // Continue with normal redirect if status check fails
      }
      
      // Redirect to intended destination
      setTimeout(() => {
        if (redirectPath && redirectPath.startsWith('/share/')) {
          navigate(redirectPath)
        } else {
          navigate(redirectPath)
        }
      }, 200)
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.')
      setCode(['', '', '', '', '', ''])
      document.getElementById('code-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    localStorage.removeItem('2fa_temp_token')
    localStorage.removeItem('2fa_user_email')
    navigate('/login')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Shield size={48} color="#4f46e5" style={{ marginBottom: '16px' }} />
          <h1>Two-Factor Authentication</h1>
          <p className="auth-subtitle">
            We've sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleVerify}>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
              Enter Verification Code
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center',
              marginBottom: '8px'
            }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="input"
                  style={{
                    width: '50px',
                    height: '60px',
                    textAlign: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    letterSpacing: '4px'
                  }}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            {timeLeft > 0 ? (
              <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                Code expires in: <strong>{formatTime(timeLeft)}</strong>
              </p>
            ) : (
              <p style={{ textAlign: 'center', fontSize: '14px', color: '#dc2626', marginTop: '8px' }}>
                Code expired. Please request a new one.
              </p>
            )}
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading || code.join('').length !== 6 || timeLeft === 0}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            className="btn btn-link"
            onClick={handleResendCode}
            disabled={sendingCode || timeLeft > 540} // Don't allow resend if less than 1 minute has passed
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#4f46e5',
              textDecoration: 'none',
              marginBottom: '16px'
            }}
          >
            <RefreshCw size={16} style={{ animation: sendingCode ? 'spin 1s linear infinite' : 'none' }} />
            {sendingCode ? 'Sending...' : 'Resend Code'}
          </button>

          <button
            type="button"
            className="btn btn-link"
            onClick={handleBack}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#6b7280',
              margin: '0 auto'
            }}
          >
            <ArrowLeft size={16} />
            Back to Login
          </button>
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../utils/AuthContext'
import { Chrome, Mail, CheckCircle, AlertCircle } from 'lucide-react'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { validatePassword, getPasswordStrength } from '../utils/formValidation'
import '../styles/Login.css'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)
  const [role, setRole] = useState('admin') // NEW: Role selection (admin or client)
  const { register, loginWithGoogle } = useAuth()
  const { t } = useTranslation()
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
    
    // Validate password
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    
    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)

    try {
      const result = await register(email, password, name)
      // Show verification message
      setShowVerificationMessage(true)
      // Wait a moment to show the message, then redirect based on role
      setTimeout(() => {
        if (role === 'admin') {
          navigate('/business-registration')
        } else {
          // Client registration - go directly to client portal
          navigate('/client/dashboard')
        }
      }, 3000)
    } catch (err) {
      setError(err.message || err.code || t('common.error'))
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await loginWithGoogle()

      // Check if user already has business registration
      if (result.hasBusiness && !result.isNewUser) {
        // Existing user with business → redirect based on role
        if (role === 'admin') {
          navigate('/dashboard')
        } else {
          navigate('/client/dashboard')
        }
        setLoading(false)
        return
      }

      // New user or no business → redirect based on role
      if (role === 'admin') {
        navigate('/business-registration')
      } else {
        navigate('/client/dashboard')
      }
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Google login failed')
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <LanguageSwitcher />
      </div>
      <div className="auth-card">
        <h1>{t('auth.signInTitle')}</h1>
        <p className="auth-subtitle">{t('auth.signUpSubtitle')}</p>

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
                {t('auth.verificationEmailSent')}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#1e3a8a' }}>
                We've sent a verification email to <strong>{email}</strong>. Please check your inbox.
              </p>
            </div>
          </div>
        )}

        {/* Role Selection Cards */}
        {!showVerificationMessage && (
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
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{t('auth.businessOwner')}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('auth.accessAdminDashboard')}</div>
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
              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{t('auth.client')}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>{t('auth.viewInvoicesWorkOrders')}</div>
            </div>
          </div>
        )}

        {!showVerificationMessage && (
          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="form-group">
              <label htmlFor="register-name">{t('common.name')}</label>
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
              <label htmlFor="register-email">{t('auth.email')}</label>
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
              <label htmlFor="register-password">{t('auth.password')}</label>
              <input
                id="register-password"
                name="password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters with uppercase, lowercase, and number"
              />
              {password && (
                <div style={{ marginTop: '8px' }}>
                  {(() => {
                    const strength = getPasswordStrength(password)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          flex: 1,
                          height: '4px',
                          background: '#e5e7eb',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(strength.strength / 6) * 100}%`,
                            height: '100%',
                            background: strength.color,
                            transition: 'all 0.3s'
                          }} />
                        </div>
                        <span style={{ fontSize: '12px', color: strength.color, fontWeight: '500' }}>
                          {strength.label}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}
              <small style={{ color: '#6b7280', fontSize: '12px', display: 'block', marginTop: '4px' }}>
                Must be at least 8 characters with uppercase, lowercase, and number
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="register-confirm-password">Confirm Password</label>
              <input
                id="register-confirm-password"
                name="confirm-password"
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Re-enter your password"
              />
              {confirmPassword && password !== confirmPassword && (
                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Passwords do not match
                </span>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? t('common.loading') : `${t('auth.register')} (${role === 'admin' ? t('auth.businessOwner') : t('auth.client')})`}
            </button>
          </form>
        )}

        {!showVerificationMessage && (
          <>
            <div className="auth-divider">
              <span>{t('auth.orContinueWith')}</span>
            </div>

            <button
              className="btn btn-google"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome size={18} />
              {t('auth.signUpWith')} {t('auth.google')}
            </button>
          </>
        )}

        <p className="auth-footer">
          {showVerificationMessage ? (
            <span>Redirecting...</span>
          ) : (
            <>{t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.login')}</Link></>
          )}
        </p>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Chrome, AlertCircle, Mail, CheckCircle } from 'lucide-react'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { validateEmail, validateRequired } from '../utils/formValidation'
import '../styles/Login.css'

import ConfirmModal from '../components/ui/ConfirmModal'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [showVerificationWarning, setShowVerificationWarning] = useState(false)
  const [role, setRole] = useState('admin')

  // Role mismatch handling
  const [showRoleMismatch, setShowRoleMismatch] = useState(false)
  const [roleMismatchConfig, setRoleMismatchConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    redirectPath: ''
  })

  // Form validation state
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const { login, loginWithGoogle, user, loading: authLoading, sendVerificationEmail } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  // Check for success message from password reset
  useEffect(() => {
    if (location.state?.message) {
      setSuccess(location.state.message)
      window.history.replaceState({}, document.title)
      setTimeout(() => setSuccess(''), 5000)
    }
  }, [location])

  // Check if user is already logged in
  useEffect(() => {
    if (location.pathname === '/login' && !authLoading && user) {
      const searchParams = new URLSearchParams(location.search)
      const redirect = searchParams.get('redirect')
      const redirectPath = redirect && redirect.startsWith('/') ? redirect : '/dashboard'
      setTimeout(() => {
        navigate(redirectPath, { replace: true })
      }, 100)
    }
  }, [user, authLoading, location.pathname, location.search, navigate])

  const getRedirectPath = (targetRole) => {
    const searchParams = new URLSearchParams(location.search)
    const redirect = searchParams.get('redirect')

    if (redirect && redirect.startsWith('/')) {
      return redirect
    }
    return targetRole === 'client' ? '/client/dashboard' : '/dashboard'
  }

  const handleRoleMismatchResolve = () => {
    navigate(roleMismatchConfig.redirectPath)
    setShowRoleMismatch(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Check if user exists first
      try {
        const checkResponse = await api.post('/auth/check-user', { email })
        if (!checkResponse.data.exists) {
          setLoading(false)
          navigate('/register', {
            state: { email: email, message: t('auth.userNotFound') }
          })
          return
        }
      } catch (checkError) {
        console.warn('User check endpoint not available:', checkError)
      }

      // 2. Perform Login
      const result = await login(email, password)

      // 3. Check 2FA
      if (result.requires2FA) {
        localStorage.setItem('2fa_temp_token', result.token)
        localStorage.setItem('2fa_user_email', result.user.email)
        navigate('/verify-2fa', {
          state: {
            email: result.user.email,
            redirect: getRedirectPath(role)
          }
        })
        setLoading(false)
        return
      }

      // 4. Check Email Verification
      if (result.user && !result.user.emailVerified) {
        setShowVerificationWarning(true)
      }

      // 5. Fetch Account Details & Check Role Mismatch
      try {
        const accountResponse = await api.get('/auth/account')
        const accountRole = accountResponse.data?.role || 'user'
        const accountStatus = accountResponse.data?.accountStatus

        // Check Account Status
        if (accountStatus && accountStatus !== 'active') {
          navigate('/account-review')
          setLoading(false)
          return
        }

        // --- ROLE MISMATCH CHECK ---
        // Case A: User selected "Business Owner" but is a "Client"
        if (role === 'admin' && accountRole === 'client') {
          setRoleMismatchConfig({
            title: 'Client Account Detected',
            message: 'You are logging in with a Client account, but "Business Owner" was selected. Would you like to go to the Client Portal?',
            confirmText: 'Go to Client Portal',
            redirectPath: '/client/dashboard'
          })
          setShowRoleMismatch(true)
          setLoading(false)
          return
        }

        // Case B: User selected "Client" but is a "Business Owner/Admin"
        if (role === 'client' && (accountRole === 'owner' || accountRole === 'admin' || accountResponse.data?.isAdmin)) {
          setRoleMismatchConfig({
            title: 'Business Account Detected',
            message: 'You are logging in with a Business account, but "Client" was selected. Would you like to go to the Business Dashboard?',
            confirmText: 'Go to Dashboard',
            redirectPath: '/dashboard'
          })
          setShowRoleMismatch(true)
          setLoading(false)
          return
        }

      } catch (accountError) {
        console.warn('Failed to check account details:', accountError)
      }

      // 6. Normal Redirect (No mismatch found)
      const redirectPath = getRedirectPath(role)
      setTimeout(() => {
        navigate(redirectPath)
      }, 200)

    } catch (err) {
      const errorMessage = err.message || err.code || t('auth.loginFailed')
      if (errorMessage.toLowerCase().includes('user not found') || err.code === 'auth/user-not-found') {
        setLoading(false)
        navigate('/register', {
          state: { email: email, message: t('auth.userNotFound') }
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

      if (result.requires2FA) {
        localStorage.setItem('2fa_temp_token', result.token)
        localStorage.setItem('2fa_user_email', result.user.email)
        navigate('/verify-2fa', {
          state: { email: result.user.email, redirect: getRedirectPath(role) }
        })
        setLoading(false)
        return
      }

      if (result.isNewUser || !result.hasBusiness) {
        navigate('/business-registration')
        setLoading(false)
        return
      }

      // Check role mismatch for Google Login too
      try {
        const accountResponse = await api.get('/auth/account')
        const accountRole = accountResponse.data?.role || 'user'

        if (accountResponse.data?.accountStatus && accountResponse.data.accountStatus !== 'active') {
          navigate('/account-review')
          setLoading(false)
          return
        }

        if (role === 'admin' && accountRole === 'client') {
          setRoleMismatchConfig({
            title: 'Client Account Detected',
            message: 'You logged in with a Client account. Switching to Client Portal.',
            confirmText: 'Go to Client Portal',
            redirectPath: '/client/dashboard'
          })
          setShowRoleMismatch(true)
          setLoading(false)
          return
        }
        if (role === 'client' && (accountRole === 'owner' || accountRole === 'admin' || accountResponse.data?.isAdmin)) {
          setRoleMismatchConfig({
            title: 'Business Account Detected',
            message: 'You logged in with a Business account. Switching to Dashboard.',
            confirmText: 'Go to Dashboard',
            redirectPath: '/dashboard'
          })
          setShowRoleMismatch(true)
          setLoading(false)
          return
        }

      } catch (e) { console.warn(e) }

      const redirectPath = getRedirectPath(role)
      setTimeout(() => {
        navigate(redirectPath)
      }, 200)
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

      {/* Role Mismatch Modal */}
      <ConfirmModal
        isOpen={showRoleMismatch}
        onClose={() => setShowRoleMismatch(false)}
        onConfirm={handleRoleMismatchResolve}
        title={roleMismatchConfig.title}
        message={roleMismatchConfig.message}
        confirmText={roleMismatchConfig.confirmText}
        cancelText="Cancel"
        variant="primary"
      />

      <div className="auth-card">
        <h1>{t('auth.signInTitle')}</h1>
        <p className="auth-subtitle">{t('auth.signInSubtitle')}</p>

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
                {t('auth.emailNotVerified')}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#78350f', marginBottom: '8px' }}>
                {t('auth.emailNotVerifiedMessage')}
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  try {
                    await sendVerificationEmail()
                    setSuccess(t('auth.verificationEmailSent'))
                    setTimeout(() => setSuccess(''), 5000)
                  } catch (err) {
                    setError(err.message || 'Failed to send verification email')
                  }
                }}
                style={{ marginTop: '8px' }}
              >
                <Mail size={14} />
                {t('auth.resendVerificationEmail')}
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

        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="form-group">
            <label htmlFor="email">
              {t('auth.email')} <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="email"
                name="email"
                type="email"
                className={`input ${emailError ? 'input-error' : emailTouched && !emailError ? 'input-success' : ''}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailTouched) {
                    const error = validateEmail(e.target.value) || validateRequired(e.target.value, 'Email')
                    setEmailError(error || '')
                  }
                }}
                onBlur={() => {
                  setEmailTouched(true)
                  const error = validateEmail(email) || validateRequired(email, 'Email')
                  setEmailError(error || '')
                }}
                autoComplete="email"
                required
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailTouched && !emailError && email && (
                <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)' }} aria-hidden="true" />
              )}
            </div>
            {emailError && (
              <span id="email-error" className="field-error" role="alert">
                {emailError}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              {t('auth.password')} <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type="password"
                className={`input ${passwordError ? 'input-error' : passwordTouched && !passwordError ? 'input-success' : ''}`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (passwordTouched) {
                    const error = validateRequired(e.target.value, 'Password')
                    setPasswordError(error || '')
                  }
                }}
                onBlur={() => {
                  setPasswordTouched(true)
                  const error = validateRequired(password, 'Password')
                  setPasswordError(error || '')
                }}
                inputMode="text"
                autoComplete="current-password"
                required
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordTouched && !passwordError && password && (
                <CheckCircle size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)' }} aria-hidden="true" />
              )}
            </div>
            {passwordError && (
              <span id="password-error" className="field-error" role="alert">
                {passwordError}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signInAs', { role: role === 'admin' ? t('auth.businessOwner') : t('auth.client') })}
          </button>
        </form>

        <div className="auth-divider">
          <span>{t('auth.orContinueWith')}</span>
        </div>

        <button
          className="btn btn-google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <Chrome size={18} />
          {t('auth.signInWith')} {t('auth.google')}
        </button>

        <p className="auth-footer">
          <Link to="/forgot-password" style={{ display: 'block', marginBottom: '10px', color: '#4f46e5' }}>
            {t('auth.forgotPassword')}
          </Link>
          {t('auth.dontHaveAccount')} <Link to="/register">{t('auth.register')}</Link>
        </p>
      </div>
    </div>
  )
}


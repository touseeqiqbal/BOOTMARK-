import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { ArrowLeft, User, Lock, Bell, Building, Save, Mail, CreditCard, CheckCircle, XCircle, Loader, AlertCircle, RefreshCw, Settings, ChevronLeft, Palette } from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import PageHeader from '../components/ui/PageHeader'
import '../styles/AccountSettings.css'

export default function AccountSettings() {
  const { user, updateUser, sendVerificationEmail, checkEmailVerified, changeEmail } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [emailVerified, setEmailVerified] = useState(user?.emailVerified || false)
  const [checkingVerification, setCheckingVerification] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)
  const [changingEmail, setChangingEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailChangePassword, setEmailChangePassword] = useState('')
  const [activeTab, setActiveTab] = useState('personal')

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: '',
    accountType: 'personal', // personal or business
    accountStatus: 'active',
    isAdmin: false,
    isSuperAdmin: false,
    role: 'user'
  })

  // Update emailVerified when user changes
  useEffect(() => {
    if (user?.emailVerified !== undefined) {
      setEmailVerified(user.emailVerified)
    }
  }, [user?.emailVerified])

  // Account Security
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  })

  // Notifications
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    formSubmissions: true,
    weeklyReports: false,
    productUpdates: true,
    securityAlerts: true,
    notificationMethod: 'email' // email, browser, both
  })

  // Personal & Business Info
  const [businessInfo, setBusinessInfo] = useState({
    companyName: '', // Company/Business name for invoices
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    businessType: '',
    taxId: '',
    companyLogo: '', // Company logo URL or base64
    companyEmail: '', // Company email for invoices
    companyPhone: '' // Company phone for invoices
  })

  // SMTP Configuration
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: ''
  })
  const [smtpLoading, setSmtpLoading] = useState(false)
  const [smtpTesting, setSmtpTesting] = useState(false)

  // QuickBooks Integration
  const [quickbooksStatus, setQuickbooksStatus] = useState({
    connected: false,
    realmId: null,
    companyName: null,
    lastSync: null
  })
  const [quickbooksLoading, setQuickbooksLoading] = useState(false)

  // Payment Gateway (Authorize.net) Configuration
  const [paymentConfig, setPaymentConfig] = useState({
    apiLoginId: '',
    transactionKey: '',
    environment: 'sandbox'
  })
  const [paymentLoading, setPaymentLoading] = useState(false)

  useEffect(() => {
    fetchAccountData()
    fetchSmtpConfig()
    fetchQuickbooksStatus()
    fetchPaymentConfig()

    // Check for QuickBooks callback
    const urlParams = new URLSearchParams(window.location.search)
    const qbStatus = urlParams.get('quickbooks')
    if (qbStatus === 'success') {
      setMessage({ type: 'success', text: 'QuickBooks connected successfully!' })
      setTimeout(() => {
        window.history.replaceState({}, '', '/account-settings')
        fetchQuickbooksStatus()
      }, 2000)
    } else if (qbStatus === 'error') {
      setMessage({ type: 'error', text: 'Failed to connect QuickBooks. Please try again.' })
      setTimeout(() => {
        window.history.replaceState({}, '', '/account-settings')
      }, 3000)
    }
  }, [])

  const fetchAccountData = async () => {
    try {
      setLoading(true)
      // Fetch user account data from backend
      const response = await api.get('/auth/account')
      if (response.data) {
        const data = response.data
        setPersonalInfo(prev => ({
          ...prev,
          name: data.name || user?.name || '',
          email: data.email || user?.email || '',
          companyName: data.companyName || '',
          accountType: data.accountType || 'personal',
          accountStatus: data.accountStatus || 'active',
          isAdmin: ['admin', 'super_admin', 'super-admin', 'owner'].includes(data.role),
          isSuperAdmin: ['super_admin', 'super-admin', 'owner'].includes(data.role),
          role: data.role || 'user'
        }))
        setNotifications(data.notifications || notifications)
        setBusinessInfo(data.businessInfo || businessInfo)
        setSecurity(prev => ({
          ...prev,
          twoFactorEnabled: data.twoFactorEnabled === true
        }))
      }
    } catch (error) {
      console.error('Failed to fetch account data:', error)
      // Use default values from user context
      setPersonalInfo(prev => ({
        ...prev,
        name: user?.name || '',
        email: user?.email || ''
      }))
    } finally {
      setLoading(false)
    }
  }

  const fetchSmtpConfig = async () => {
    try {
      const response = await api.get('/auth/account/smtp')
      if (response.data) {
        setSmtpConfig(prev => ({
          ...prev,
          host: response.data.host || '',
          port: response.data.port || 587,
          secure: response.data.secure || false,
          user: response.data.user || '',
          from: response.data.from || '',
          password: response.data.passwordSet ? '••••••••' : '' // Don't show actual password
        }))
      }
    } catch (error) {
      console.error('Failed to fetch SMTP config:', error)
    }
  }

  const fetchQuickbooksStatus = async () => {
    try {
      setQuickbooksLoading(true)
      const response = await api.get('/quickbooks/status')
      if (response.data) {
        setQuickbooksStatus(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch QuickBooks status:', error)
    } finally {
      setQuickbooksLoading(false)
    }
  }

  const fetchPaymentConfig = async () => {
    try {
      const response = await api.get('/payments/config')
      if (response.data) {
        setPaymentConfig({
          apiLoginId: response.data.apiLoginId || '',
          transactionKey: '',
          environment: response.data.environment || 'sandbox'
        })
      }
    } catch (error) {
      console.error('Failed to fetch payment config:', error)
    }
  }

  const handlePaymentConfigUpdate = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const response = await api.put('/payments/config', paymentConfig)

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Payment configuration updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      }
    } catch (error) {
      console.error('Failed to update payment config:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update payment configuration' })
    } finally {
      setSaving(false)
    }
  }

  const handlePersonalInfoUpdate = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      const response = await api.put('/auth/account', {
        name: personalInfo.name,
        email: personalInfo.email,
        companyName: personalInfo.companyName,
        accountType: personalInfo.accountType
      })

      if (response.data) {
        updateUser(response.data.user)
        setMessage({ type: 'success', text: 'Personal information updated successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      }
    } catch (error) {
      console.error('Failed to update personal info:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update personal information' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (security.newPassword !== security.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (security.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      // Use Firebase to update password
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth')
      const { auth } = await import('../utils/firebase')

      if (auth.currentUser && auth.currentUser.email) {
        // Re-authenticate user first (required for password change)
        if (security.currentPassword) {
          const credential = EmailAuthProvider.credential(
            auth.currentUser.email,
            security.currentPassword
          )
          await reauthenticateWithCredential(auth.currentUser, credential)
        }

        // Update password
        await updatePassword(auth.currentUser, security.newPassword)
        setMessage({ type: 'success', text: 'Password updated successfully!' })
        setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '', twoFactorEnabled: security.twoFactorEnabled })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'error', text: 'No user logged in' })
      }
    } catch (error) {
      console.error('Failed to update password:', error)
      let errorMessage = 'Failed to update password'
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect'
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak'
      } else if (error.message) {
        errorMessage = error.message
      }
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      setSendingVerification(true)
      setMessage({ type: '', text: '' })

      const result = await sendVerificationEmail()
      setMessage({ type: 'success', text: result.message || 'Verification email sent! Please check your inbox.' })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } catch (error) {
      console.error('Failed to send verification email:', error)
      let errorMessage = 'Failed to send verification email'
      if (error.message) {
        errorMessage = error.message
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.'
      }
      setMessage({ type: 'error', text: errorMessage })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setSendingVerification(false)
    }
  }

  const handleCheckVerification = async () => {
    try {
      setCheckingVerification(true)
      const isVerified = await checkEmailVerified()
      if (isVerified) {
        setEmailVerified(true)
        setMessage({ type: 'success', text: 'Email verified successfully!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      } else {
        setMessage({ type: 'info', text: 'Email is not yet verified. Please check your inbox and click the verification link.' })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      console.error('Failed to check verification:', error)
      setMessage({ type: 'error', text: 'Failed to check verification status' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } finally {
      setCheckingVerification(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail || !emailChangePassword) {
      setMessage({ type: 'error', text: 'Please enter both new email and current password' })
      return
    }

    if (newEmail === personalInfo.email) {
      setMessage({ type: 'error', text: 'New email must be different from current email' })
      return
    }

    try {
      setChangingEmail(true)
      setMessage({ type: '', text: '' })

      const result = await changeEmail(newEmail, emailChangePassword)
      setMessage({ type: 'success', text: result.message || 'Verification email sent to your new email address!' })
      setNewEmail('')
      setEmailChangePassword('')
      setChangingEmail(false)
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } catch (error) {
      console.error('Failed to change email:', error)
      let errorMessage = 'Failed to change email'
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'Current password is incorrect'
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already in use by another account'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address'
      } else if (error.message) {
        errorMessage = error.message
      }
      setMessage({ type: 'error', text: errorMessage })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setChangingEmail(false)
    }
  }

  const handleNotificationsUpdate = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      await api.put('/auth/account/notifications', notifications)
      setMessage({ type: 'success', text: 'Notification preferences updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to update notifications:', error)
      setMessage({ type: 'error', text: 'Failed to update notification preferences' })
    } finally {
      setSaving(false)
    }
  }

  const handleBusinessInfoUpdate = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      await api.put('/auth/account/business', businessInfo)
      setMessage({ type: 'success', text: 'Business information updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to update business info:', error)
      setMessage({ type: 'error', text: 'Failed to update business information' })
    } finally {
      setSaving(false)
    }
  }

  const handleSmtpUpdate = async () => {
    try {
      setSmtpLoading(true)
      setMessage({ type: '', text: '' })

      await api.put('/auth/account/smtp', smtpConfig)
      setMessage({ type: 'success', text: 'SMTP configuration updated successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      fetchSmtpConfig()
    } catch (error) {
      console.error('Failed to update SMTP config:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update SMTP configuration' })
    } finally {
      setSmtpLoading(false)
    }
  }

  const handleSmtpTest = async () => {
    try {
      setSmtpTesting(true)
      setMessage({ type: '', text: '' })

      const response = await api.post('/auth/account/smtp/test')
      if (response.data.success) {
        setMessage({ type: 'success', text: response.data.message || 'Test email sent successfully!' })
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to send test email' })
      }
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } catch (error) {
      console.error('Failed to test SMTP:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send test email' })
    } finally {
      setSmtpTesting(false)
    }
  }

  const handleQuickbooksConnect = async () => {
    try {
      setQuickbooksLoading(true)
      const response = await api.get('/quickbooks/auth-url')
      if (response.data.authUrl) {
        window.location.href = response.data.authUrl
      }
    } catch (error) {
      console.error('Failed to get QuickBooks auth URL:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to connect QuickBooks' })
      setQuickbooksLoading(false)
    }
  }

  const handleQuickbooksDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect QuickBooks?')) return

    try {
      setQuickbooksLoading(true)
      await api.post('/quickbooks/disconnect')
      setMessage({ type: 'success', text: 'QuickBooks disconnected successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      fetchQuickbooksStatus()
    } catch (error) {
      console.error('Failed to disconnect QuickBooks:', error)
      setMessage({ type: 'error', text: 'Failed to disconnect QuickBooks' })
    } finally {
      setQuickbooksLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading account settings...</div>
  }

  return (
    <div className="dashboard animate-fadeIn">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile, security, and integrations"
        actions={
          <button className="btn-modern btn-modern-secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
        }
      />

      <div className="container" style={{ paddingTop: 0, marginTop: '24px', maxWidth: '100%', paddingLeft: '40px', paddingRight: '40px' }}>
        {message.text && (
          <div className={`badge badge-${message.type === 'error' ? 'error' : message.type === 'success' ? 'success' : 'info'}`} style={{ width: '100%', marginBottom: '24px', padding: '12px', justifyContent: 'center' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '15px' }}>{message.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '40px', alignItems: 'start' }}>
          {/* Settings Sidebar */}
          <div className="modern-card" style={{ padding: '12px', position: 'sticky', top: '100px' }}>
            {[
              { id: 'personal', label: 'Personal Info', icon: User },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'business', label: 'Business Profile', icon: Building },
              { id: 'customization', label: 'Branding', icon: Settings },
              { id: 'smtp', label: 'SMTP Config', icon: Mail },
              { id: 'integrations', label: 'Integrations', icon: CreditCard }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--primary-50)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--primary-700)' : 'var(--text-secondary)',
                  fontWeight: activeTab === tab.id ? '800' : '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '4px',
                  textAlign: 'left'
                }}
                className={activeTab === tab.id ? '' : 'hover-bg-secondary'}
              >
                <tab.icon size={18} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content Area */}
          <div className="settings-content-area">
            {/* Quick Access Notification */}
            {activeTab === 'personal' && (
              <div
                className="modern-card animate-fadeIn"
                style={{
                  marginBottom: '24px',
                  background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
                  padding: '20px',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={() => navigate('/number-format-settings')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ padding: '10px', background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-md)' }}>
                    <Settings size={28} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Number Format Auto-Generation</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>Customize prefixes and sequencing for invoices, customers, and work orders.</p>
                  </div>
                  <ChevronLeft size={24} style={{ transform: 'rotate(180deg)' }} />
                </div>
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={28} color="var(--primary-600)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Personal Information</h2>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>Manage your basic profile and account status</p>
                  </div>
                </div>

                <div className="forms-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="label-modern">Full Name</label>
                    <input
                      type="text"
                      className="input-modern"
                      value={personalInfo.name}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label-modern">Email address</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="email"
                        className="input-modern"
                        value={personalInfo.email}
                        disabled
                        style={{ flex: 1, backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                        placeholder="your.email@example.com"
                      />
                      {emailVerified ? (
                        <span className="badge badge-success">
                          <CheckCircle size={14} /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-error">
                          <XCircle size={14} /> Unverified
                        </span>
                      )}
                    </div>
                    {!emailVerified && (
                      <div className="modern-card" style={{ background: 'var(--warning-50)', border: '1px solid var(--warning-200)', marginTop: '12px', padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <AlertCircle size={24} color="var(--warning-600)" />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--warning-800)' }}>Account not verified</h4>
                            <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: 'var(--warning-700)', fontWeight: '500' }}>Please confirm your email to access all platform features.</p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn-modern btn-modern-primary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleResendVerification}>Resend Email</button>
                              <button className="btn-modern btn-modern-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleCheckVerification}>Check Status</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setChangingEmail(!changingEmail)}
                      style={{ marginTop: '8px' }}
                    >
                      {changingEmail ? 'Cancel' : 'Change Email Address'}
                    </button>
                  </div>
                  {changingEmail && (
                    <div className="form-group" style={{
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      marginTop: '12px'
                    }}>
                      <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                        New Email Address
                      </label>
                      <input
                        type="email"
                        className="input"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new.email@example.com"
                        style={{ marginBottom: '12px' }}
                      />
                      <label style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>
                        Current Password (required for security)
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={emailChangePassword}
                        onChange={(e) => setEmailChangePassword(e.target.value)}
                        placeholder="Enter your current password"
                        style={{ marginBottom: '12px' }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleChangeEmail}
                        disabled={!newEmail || !emailChangePassword || changingEmail}
                      >
                        {changingEmail && (
                          <>
                            <Loader size={14} className="spinner" />
                            Sending Verification...
                          </>
                        ) || 'Send Verification to New Email'}
                      </button>
                      <p style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                        A verification email will be sent to your new email address. Click the link in that email to complete the change.
                      </p>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Company Name (Optional)</label>
                    <input
                      type="text"
                      className="input"
                      value={personalInfo.companyName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your company name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Account Type</label>
                    <select
                      className="input"
                      value={personalInfo.accountType}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, accountType: e.target.value }))}
                    >
                      <option value="personal">Personal</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="label-modern">Account Status</label>
                    <div style={{ marginTop: '8px' }}>
                      <span className={`badge ${personalInfo.accountStatus === 'active' ? 'badge-success' : 'badge-error'}`}>
                        {personalInfo.accountStatus.charAt(0).toUpperCase() + personalInfo.accountStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Permissions</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {personalInfo.isSuperAdmin || personalInfo.role === 'owner' ? (
                        <span className="badge badge-purple" style={{ padding: '8px 16px' }}>
                          {personalInfo.role === 'owner' ? 'Owner' : 'Super Administrator'}
                        </span>
                      ) : personalInfo.isAdmin ? (
                        <span className="badge badge-success" style={{ padding: '8px 16px' }}>Administrator</span>
                      ) : (
                        <span className="badge badge-info" style={{ padding: '8px 16px' }}>Standard User</span>
                      )}
                    </div>
                    <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>
                      {(personalInfo.isSuperAdmin || personalInfo.role === 'owner')
                        ? 'Full system control and ownership.'
                        : personalInfo.isAdmin
                          ? 'Billing, user management, and system configuration.'
                          : 'Standard functional access.'}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '12px' }}>
                    <button className="btn-modern btn-modern-primary" onClick={handlePersonalInfoUpdate} disabled={saving}>
                      <Save size={18} /> {saving ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--error-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={28} color="var(--error-600)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Account Security</h2>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>Manage password and access controls</p>
                  </div>
                </div>

                <div className="forms-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="label-modern">Current Password</label>
                    <input
                      type="password"
                      className="input-modern"
                      value={security.currentPassword}
                      onChange={(e) => setSecurity(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">New Password</label>
                      <input
                        type="password"
                        className="input-modern"
                        value={security.newPassword}
                        onChange={(e) => setSecurity(prev => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">Confirm Password</label>
                      <input
                        type="password"
                        className="input-modern"
                        value={security.confirmPassword}
                        onChange={(e) => setSecurity(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Two-Factor Authentication</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Email-based verification for login</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={security.twoFactorEnabled}
                          onChange={async (e) => {
                            // Integration logic remains same
                            const enabled = e.target.checked;
                            setSecurity(prev => ({ ...prev, twoFactorEnabled: enabled }));
                            try {
                              setSaving(true);
                              const response = await api.put('/auth/2fa/toggle', { enabled });
                              if (response.data?.success) {
                                setMessage({ type: 'success', text: response.data.message });
                                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                              }
                            } catch (err) {
                              setSecurity(prev => ({ ...prev, twoFactorEnabled: !enabled }));
                              setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update 2FA' });
                            } finally {
                              setSaving(false);
                            }
                          }}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '12px' }}>
                    <button className="btn-modern btn-modern-primary" onClick={handlePasswordUpdate} disabled={saving}>
                      <Save size={18} /> {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bell size={28} color="var(--primary-600)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Notification Preferences</h2>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>Choose how and when you want to be notified</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Master Email Switch</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Enable or disable all email alerts</p>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                    {[
                      { id: 'formSubmissions', label: 'Form Submissions', desc: 'Alerts for new entries' },
                      { id: 'weeklyReports', label: 'Weekly Reports', desc: 'Summary of performance' },
                      { id: 'productUpdates', label: 'Product Updates', desc: 'New feature releases' },
                      { id: 'securityAlerts', label: 'Security Alerts', desc: 'Account access logs' }
                    ].map(item => (
                      <div key={item.id} className="modern-card" style={{
                        padding: '16px',
                        background: 'var(--bg-primary)',
                        opacity: notifications.emailNotifications ? 1 : 0.5,
                        transition: 'opacity 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{item.label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{item.desc}</div>
                          </div>
                          <label className="switch" style={{ transform: 'scale(0.8)' }}>
                            <input
                              type="checkbox"
                              checked={notifications[item.id]}
                              onChange={(e) => setNotifications(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              disabled={!notifications.emailNotifications}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="label-modern">Default Delivery Method</label>
                    <select
                      className="input-modern"
                      value={notifications.notificationMethod}
                      onChange={(e) => setNotifications(prev => ({ ...prev, notificationMethod: e.target.value }))}
                    >
                      <option value="email">Email Only</option>
                      <option value="browser">Browser Only</option>
                      <option value="both">Both Email & Browser</option>
                    </select>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    <button className="btn-modern btn-modern-primary" onClick={handleNotificationsUpdate} disabled={saving}>
                      <Save size={18} /> {saving ? 'Saving...' : 'Save Notification Policy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'business' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building size={28} color="var(--primary-600)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Business Profile</h2>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>Legal company details for documents and invoices</p>
                  </div>
                </div>

                <div className="forms-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="label-modern">Company Legal Name</label>
                    <input
                      type="text"
                      className="input-modern"
                      value={businessInfo.companyName || ''}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Acme Landscaping LLC"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">Support Email</label>
                      <input
                        type="email"
                        className="input-modern"
                        value={businessInfo.companyEmail || ''}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, companyEmail: e.target.value }))}
                        placeholder="billing@acme.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">Official Website</label>
                      <input
                        type="url"
                        className="input-modern"
                        value={businessInfo.website || ''}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://acme.com"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label-modern">Postal Address</label>
                    <input
                      type="text"
                      className="input-modern"
                      value={businessInfo.address}
                      onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Corporate Way"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">City</label>
                      <input
                        type="text"
                        className="input-modern"
                        value={businessInfo.city}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, city: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">State / Prov</label>
                      <input
                        type="text"
                        className="input-modern"
                        value={businessInfo.state}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, state: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">ZIP Code</label>
                      <input
                        type="text"
                        className="input-modern"
                        value={businessInfo.zipCode}
                        onChange={(e) => setBusinessInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="label-modern">Company Logo</label>
                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '500' }}>Used on professional invoices, exports, and shared documents.</p>
                    <ImageUpload
                      label=""
                      value={businessInfo.companyLogo || ''}
                      onChange={(value) => setBusinessInfo(prev => ({ ...prev, companyLogo: value }))}
                      accept="image/*"
                      maxSize={2 * 1024 * 1024}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '12px' }}>
                    <button className="btn-modern btn-modern-primary" onClick={handleBusinessInfoUpdate} disabled={saving}>
                      <Save size={18} /> {saving ? 'Saving...' : 'Update Corporate Profile'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--primary-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={28} color="var(--primary-600)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Mail Configuration (SMTP)</h2>
                    <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>Configure dedicated email delivery for your business</p>
                  </div>
                </div>

                <div className="forms-grid" style={{ gridTemplateColumns: '1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label className="label-modern">SMTP Host</label>
                    <input
                      type="text"
                      className="input-modern"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">Port</label>
                      <input
                        type="number"
                        className="input-modern"
                        value={smtpConfig.port}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '100%' }}>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={smtpConfig.secure}
                          onChange={(e) => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                        />
                        <span className="slider round"></span>
                      </label>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-secondary)' }}>Use SSL/TLS (Port 465)</span>
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">Username / Auth</label>
                      <input
                        type="email"
                        className="input-modern"
                        value={smtpConfig.user}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                        placeholder="user@domain.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">Password</label>
                      <input
                        type="password"
                        className="input-modern"
                        value={smtpConfig.password}
                        onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', gap: '12px' }}>
                    <button className="btn-modern btn-modern-primary" onClick={handleSmtpUpdate} disabled={smtpLoading}>
                      <Save size={18} /> {smtpLoading ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button className="btn-modern btn-modern-secondary" onClick={handleSmtpTest} disabled={smtpTesting}>
                      {smtpTesting ? <Loader size={18} className="spinner" /> : <RefreshCw size={18} />}
                      {smtpTesting ? 'Testing...' : 'Send Test Mail'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* QuickBooks Integration */}
                <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CreditCard size={24} color="var(--primary-600)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>QuickBooks Online</h3>
                      <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: '600' }}>Sync customers and invoices automatically</p>
                    </div>
                  </div>

                  {quickbooksStatus.connected ? (
                    <div style={{ padding: '24px', background: 'var(--success-50)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--success-200)', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <CheckCircle size={32} color="var(--success-600)" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--success-800)' }}>Connected to {quickbooksStatus.companyName}</div>
                          <div style={{ fontSize: '13px', color: 'var(--success-700)', fontWeight: '600' }}>Last synced: {quickbooksStatus.lastSync ? new Date(quickbooksStatus.lastSync).toLocaleString() : 'Never'}</div>
                        </div>
                        <button className="btn-modern btn-modern-secondary" onClick={handleQuickbooksDisconnect} style={{ background: 'white', color: 'var(--error-600)' }}>
                          Disconnect
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '24px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '24px', textAlign: 'center' }}>
                      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontWeight: '600' }}>Authorize BOOTMARK to sync data with your QuickBooks account.</p>
                      <button className="btn-modern btn-modern-primary" onClick={handleQuickbooksConnect}>
                        Connect QuickBooks Account
                      </button>
                    </div>
                  )}
                </div>

                {/* Authorize.net */}
                <div className="modern-card animate-fadeIn" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={24} color="var(--primary-600)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', margin: 0 }}>Authorize.net Payment Gateway</h3>
                      <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: '600' }}>Accept credit card payments on invoices</p>
                    </div>
                  </div>

                  <div className="forms-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
                    <div className="form-group">
                      <label className="label-modern">API Login ID</label>
                      <input
                        type="text"
                        className="input-modern"
                        value={paymentConfig.apiLoginId}
                        onChange={(e) => setPaymentConfig(prev => ({ ...prev, apiLoginId: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">Transaction Key</label>
                      <input
                        type="password"
                        className="input-modern"
                        value={paymentConfig.transactionKey}
                        onChange={(e) => setPaymentConfig(prev => ({ ...prev, transactionKey: e.target.value }))}
                        placeholder="••••••••••••••••"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label-modern">Environment</label>
                      <select
                        className="input-modern"
                        value={paymentConfig.environment}
                        onChange={(e) => setPaymentConfig(prev => ({ ...prev, environment: e.target.value }))}
                      >
                        <option value="sandbox">Sandbox (Testing)</option>
                        <option value="production">Production (Live)</option>
                      </select>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                      <button className="btn-modern btn-modern-primary" onClick={handlePaymentConfigUpdate} disabled={saving}>
                        <Save size={18} /> {saving ? 'Saving...' : 'Save Payment Gateway'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customization' && (
              <div className="modern-card animate-fadeIn" style={{ padding: '48px', textAlign: 'center' }}>
                <Palette size={64} color="var(--primary-600)" style={{ marginBottom: '24px', opacity: 0.8 }} />
                <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>White-label Branding</h2>
                <p style={{ margin: '0 auto 32px auto', color: 'var(--text-tertiary)', fontSize: '16px', fontWeight: '600', maxWidth: '480px' }}>
                  Customize themes, favicons, and advanced app-wide features for your team and clients.
                </p>
                <button className="btn-modern btn-modern-primary" onClick={() => navigate('/app-customization')}>
                  Open Branding Interface <ChevronLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

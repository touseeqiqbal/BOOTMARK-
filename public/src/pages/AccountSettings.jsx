import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { ArrowLeft, User, Lock, Bell, Building, Save, Mail, CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react'
import '../styles/AccountSettings.css'

export default function AccountSettings() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    companyName: '',
    accountType: 'personal', // personal or business
    accountStatus: 'active'
  })

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
    taxId: ''
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

  useEffect(() => {
    fetchAccountData()
    fetchSmtpConfig()
    fetchQuickbooksStatus()
    
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
          accountStatus: data.accountStatus || 'active'
        }))
        setNotifications(data.notifications || notifications)
        setBusinessInfo(data.businessInfo || businessInfo)
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
    <div className="account-settings">
      <header className="settings-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <h1>Account Settings</h1>
          </div>
        </div>
      </header>

      <div className="container">
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Personal Information */}
        <section className="settings-section">
          <div className="section-header">
            <User size={24} />
            <div>
              <h2>Personal Information</h2>
              <p>Update your name, email address, company name, and account status.</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                className="input"
                value={personalInfo.name}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="input"
                value={personalInfo.email}
                onChange={(e) => setPersonalInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="your.email@example.com"
              />
            </div>
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
            <div className="form-group">
              <label>Account Status</label>
              <div className="status-badge">
                <span className={`status ${personalInfo.accountStatus}`}>
                  {personalInfo.accountStatus.charAt(0).toUpperCase() + personalInfo.accountStatus.slice(1)}
                </span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handlePersonalInfoUpdate} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </section>

        {/* Account Security */}
        <section className="settings-section">
          <div className="section-header">
            <Lock size={24} />
            <div>
              <h2>Account Security</h2>
              <p>Update your password and manage additional security settings.</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                className="input"
                value={security.currentPassword}
                onChange={(e) => setSecurity(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                className="input"
                value={security.newPassword}
                onChange={(e) => setSecurity(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                className="input"
                value={security.confirmPassword}
                onChange={(e) => setSecurity(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={security.twoFactorEnabled}
                  onChange={(e) => setSecurity(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                />
                <span>Enable Two-Factor Authentication (Coming Soon)</span>
              </label>
            </div>
            <button className="btn btn-primary" onClick={handlePasswordUpdate} disabled={saving}>
              <Save size={18} />
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="settings-section">
          <div className="section-header">
            <Bell size={24} />
            <div>
              <h2>Notifications</h2>
              <p>Select the notifications you want - and how you'd like to receive them.</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                />
                <span>Enable Email Notifications</span>
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.formSubmissions}
                  onChange={(e) => setNotifications(prev => ({ ...prev, formSubmissions: e.target.checked }))}
                  disabled={!notifications.emailNotifications}
                />
                <span>Form Submissions</span>
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.weeklyReports}
                  onChange={(e) => setNotifications(prev => ({ ...prev, weeklyReports: e.target.checked }))}
                  disabled={!notifications.emailNotifications}
                />
                <span>Weekly Reports</span>
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.productUpdates}
                  onChange={(e) => setNotifications(prev => ({ ...prev, productUpdates: e.target.checked }))}
                  disabled={!notifications.emailNotifications}
                />
                <span>Product Updates</span>
              </label>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={notifications.securityAlerts}
                  onChange={(e) => setNotifications(prev => ({ ...prev, securityAlerts: e.target.checked }))}
                  disabled={!notifications.emailNotifications}
                />
                <span>Security Alerts</span>
              </label>
            </div>
            <div className="form-group">
              <label>Notification Method</label>
              <select
                className="input"
                value={notifications.notificationMethod}
                onChange={(e) => setNotifications(prev => ({ ...prev, notificationMethod: e.target.value }))}
              >
                <option value="email">Email Only</option>
                <option value="browser">Browser Only</option>
                <option value="both">Both Email & Browser</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleNotificationsUpdate} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </section>

        {/* Personal & Business Info */}
        <section className="settings-section">
          <div className="section-header">
            <Building size={24} />
            <div>
              <h2>Personal & Business Info</h2>
              <p>Help maintain a safe and trustworthy form builder.</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  className="input"
                  value={businessInfo.firstName}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  className="input"
                  value={businessInfo.lastName}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                className="input"
                value={businessInfo.phone}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(123) 456-7890"
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                className="input"
                value={businessInfo.address}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Street address"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  className="input"
                  value={businessInfo.city}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="form-group">
                <label>State/Province</label>
                <input
                  type="text"
                  className="input"
                  value={businessInfo.state}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div className="form-group">
                <label>ZIP/Postal Code</label>
                <input
                  type="text"
                  className="input"
                  value={businessInfo.zipCode}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, zipCode: e.target.value }))}
                  placeholder="ZIP code"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                className="input"
                value={businessInfo.country}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
              />
            </div>
            <div className="form-group">
              <label>Website (Optional)</label>
              <input
                type="url"
                className="input"
                value={businessInfo.website}
                onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
            {personalInfo.accountType === 'business' && (
              <>
                <div className="form-group">
                  <label>Business Type</label>
                  <input
                    type="text"
                    className="input"
                    value={businessInfo.businessType}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, businessType: e.target.value }))}
                    placeholder="e.g., LLC, Corporation, Sole Proprietorship"
                  />
                </div>
                <div className="form-group">
                  <label>Tax ID / EIN (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={businessInfo.taxId}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, taxId: e.target.value }))}
                    placeholder="Tax identification number"
                  />
                </div>
              </>
            )}
            <button className="btn btn-primary" onClick={handleBusinessInfoUpdate} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Information'}
            </button>
          </div>
        </section>

        {/* SMTP Configuration */}
        <section className="settings-section">
          <div className="section-header">
            <Mail size={24} />
            <div>
              <h2>SMTP Email Configuration</h2>
              <p>Configure your email settings to send form submission notifications.</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-group">
              <label>SMTP Host</label>
              <input
                type="text"
                className="input"
                value={smtpConfig.host}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>SMTP Port</label>
                <input
                  type="number"
                  className="input"
                  value={smtpConfig.port}
                  onChange={(e) => setSmtpConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                  placeholder="587"
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={smtpConfig.secure}
                    onChange={(e) => setSmtpConfig(prev => ({ ...prev, secure: e.target.checked }))}
                  />
                  <span>Use SSL/TLS (Port 465)</span>
                </label>
              </div>
            </div>
            <div className="form-group">
              <label>SMTP Username/Email</label>
              <input
                type="email"
                className="input"
                value={smtpConfig.user}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, user: e.target.value }))}
                placeholder="your-email@gmail.com"
              />
            </div>
            <div className="form-group">
              <label>SMTP Password</label>
              <input
                type="password"
                className="input"
                value={smtpConfig.password}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder={smtpConfig.password === '••••••••' ? 'Password is set (enter new password to change)' : 'Enter SMTP password'}
              />
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                For Gmail, use an App Password. For other providers, use your regular password.
              </small>
            </div>
            <div className="form-group">
              <label>From Email Address</label>
              <input
                type="email"
                className="input"
                value={smtpConfig.from}
                onChange={(e) => setSmtpConfig(prev => ({ ...prev, from: e.target.value }))}
                placeholder="noreply@yourdomain.com"
              />
            </div>
            <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleSmtpUpdate} disabled={smtpLoading}>
                <Save size={18} />
                {smtpLoading ? 'Saving...' : 'Save SMTP Settings'}
              </button>
              <button className="btn btn-secondary" onClick={handleSmtpTest} disabled={smtpTesting || smtpLoading}>
                {smtpTesting ? <Loader size={18} className="spinner" /> : <Mail size={18} />}
                {smtpTesting ? 'Testing...' : 'Send Test Email'}
              </button>
            </div>
          </div>
        </section>

        {/* QuickBooks Integration */}
        <section className="settings-section">
          <div className="section-header">
            <CreditCard size={24} />
            <div>
              <h2>QuickBooks Integration</h2>
              <p>Connect your QuickBooks account to sync form submissions as customers and invoices.</p>
            </div>
          </div>
          <div className="section-content">
            {quickbooksLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Loader size={20} className="spinner" />
                <span>Loading QuickBooks status...</span>
              </div>
            ) : quickbooksStatus.connected ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '15px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
                  <CheckCircle size={20} color="#22c55e" />
                  <div>
                    <strong style={{ color: '#22c55e' }}>QuickBooks Connected</strong>
                    {quickbooksStatus.companyName && (
                      <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                        Company: {quickbooksStatus.companyName}
                      </p>
                    )}
                    {quickbooksStatus.lastSync && (
                      <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '12px' }}>
                        Last sync: {new Date(quickbooksStatus.lastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={handleQuickbooksDisconnect} disabled={quickbooksLoading}>
                  <XCircle size={18} />
                  Disconnect QuickBooks
                </button>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                  Connect your QuickBooks account to automatically sync form submissions. You'll be redirected to QuickBooks to authorize the connection.
                </p>
                <button className="btn btn-primary" onClick={handleQuickbooksConnect} disabled={quickbooksLoading}>
                  {quickbooksLoading ? <Loader size={18} className="spinner" /> : <CreditCard size={18} />}
                  {quickbooksLoading ? 'Connecting...' : 'Connect QuickBooks'}
                </button>
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#9ca3af' }}>
                  Note: You'll need to set up QuickBooks OAuth credentials in your environment variables first.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

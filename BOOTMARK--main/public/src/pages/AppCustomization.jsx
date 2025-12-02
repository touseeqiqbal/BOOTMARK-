import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { 
  Palette, Save, Image, Globe, Mail, Bell, 
  Smartphone, Monitor, CheckCircle, Loader 
} from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import '../styles/AppCustomization.css'
import { hasPermission } from '../utils/permissionUtils'

export default function AppCustomization() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [accessDenied, setAccessDenied] = useState(false)

  const [customization, setCustomization] = useState({
    // Branding
    logo: '',
    favicon: '',
    companyName: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#667eea',
    accentColor: '#764ba2',
    
    // App Settings
    appName: 'BootMark',
    appDescription: 'Landscaping Management Platform',
    appUrl: '',
    
    // Theme
    theme: 'light', // light, dark, auto
    fontFamily: 'Inter',
    
    // Features
    features: {
      forms: true,
      analytics: true,
      invoices: true,
      customers: true,
      workflows: true,
      teamCollaboration: true,
      reports: true,
      integrations: true
    },
    
    // Notifications
    notifications: {
      email: true,
      sms: false,
      push: false
    },
    
    // Custom Domain
    customDomain: '',
    
    // API Access
    apiEnabled: false,
    apiKey: ''
  })

  useEffect(() => {
    if (!authLoading) {
      // Check for business.settings permission or legacy settings permission
      const hasAccess = hasPermission(user, 'business.settings') || 
                       hasPermission(user, 'settings') ||
                       user?.isBusinessOwner ||
                       user?.isAdmin
      if (!hasAccess) {
        setAccessDenied(true)
        setLoading(false)
      } else {
        setAccessDenied(false)
        fetchCustomization()
      }
    }
  }, [authLoading, user])

  const fetchCustomization = async () => {
    try {
      const response = await api.get('/businesses/my-business')
      if (response.data.customization) {
        setCustomization(prev => ({
          ...prev,
          ...response.data.customization
        }))
      }
    } catch (error) {
      console.error('Failed to fetch customization:', error)
      if (error.response?.status === 404) {
        navigate('/business-registration')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      await api.put('/businesses/update', {
        customization: customization
      })
      setMessage({ 
        type: 'success', 
        text: 'Customization settings saved successfully! Changes will apply to all users in your business. They may need to refresh their browser to see the updates.' 
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const generateApiKey = () => {
    const key = `sk_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`
    setCustomization(prev => ({ ...prev, apiKey: key }))
  }

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>
  }

  if (accessDenied) {
    return (
      <div className="app-customization-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <Palette size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
        <h2>You don&apos;t have permission to customize the app.</h2>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Only business owners or admins with settings access can use this page.
        </p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="app-customization-container">
      <div className="customization-header">
        <div>
          <h1>App Customization</h1>
          <p>Customize your company app with branding, themes, and features</p>
          <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', fontWeight: 'normal' }}>
            <strong>Note:</strong> Changes you make here will apply to all users in your business account. 
            All team members will see the same branding, colors, and theme settings.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader size={18} className="spinner" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' && <CheckCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="customization-sections">
        {/* Branding Section */}
        <section className="customization-section">
          <div className="section-header">
            <Palette size={24} />
            <div>
              <h2>Branding</h2>
              <p>Customize your app's visual identity</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Company Logo</label>
                <ImageUpload
                  label=""
                  value={customization.logo}
                  onChange={(value) => setCustomization({ ...customization, logo: value })}
                  accept="image/*"
                  maxSize={2 * 1024 * 1024}
                />
              </div>
              <div className="form-group">
                <label>Favicon</label>
                <ImageUpload
                  label=""
                  value={customization.favicon}
                  onChange={(value) => setCustomization({ ...customization, favicon: value })}
                  accept="image/*"
                  maxSize={512 * 1024}
                />
              </div>
              <div className="form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  className="input"
                  value={customization.companyName}
                  onChange={(e) => setCustomization({ ...customization, companyName: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>
              <div className="form-group">
                <label>Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    className="input"
                    value={customization.primaryColor}
                    onChange={(e) => setCustomization({ ...customization, primaryColor: e.target.value })}
                    placeholder="#4f46e5"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Secondary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={customization.secondaryColor}
                    onChange={(e) => setCustomization({ ...customization, secondaryColor: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    className="input"
                    value={customization.secondaryColor}
                    onChange={(e) => setCustomization({ ...customization, secondaryColor: e.target.value })}
                    placeholder="#667eea"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Accent Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={customization.accentColor}
                    onChange={(e) => setCustomization({ ...customization, accentColor: e.target.value })}
                    className="color-picker"
                  />
                  <input
                    type="text"
                    className="input"
                    value={customization.accentColor}
                    onChange={(e) => setCustomization({ ...customization, accentColor: e.target.value })}
                    placeholder="#764ba2"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* App Settings Section */}
        <section className="customization-section">
          <div className="section-header">
            <Monitor size={24} />
            <div>
              <h2>App Settings</h2>
              <p>Configure your app name and basic information</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-grid">
              <div className="form-group">
                <label>App Name</label>
                <input
                  type="text"
                  className="input"
                  value={customization.appName}
                  onChange={(e) => setCustomization({ ...customization, appName: e.target.value })}
                  placeholder="BootMark"
                />
              </div>
              <div className="form-group">
                <label>App Description</label>
                <textarea
                  className="input"
                  value={customization.appDescription}
                  onChange={(e) => setCustomization({ ...customization, appDescription: e.target.value })}
                  placeholder="Landscaping Management Platform"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>App URL</label>
                <div className="input-with-icon">
                  <Globe size={18} className="input-icon" />
                  <input
                    type="url"
                    className="input"
                    value={customization.appUrl}
                    onChange={(e) => setCustomization({ ...customization, appUrl: e.target.value })}
                    placeholder="https://yourcompany.app.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Theme</label>
                <select
                  className="input"
                  value={customization.theme}
                  onChange={(e) => setCustomization({ ...customization, theme: e.target.value })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Font Family</label>
                <select
                  className="input"
                  value={customization.fontFamily}
                  onChange={(e) => setCustomization({ ...customization, fontFamily: e.target.value })}
                >
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="customization-section">
          <div className="section-header">
            <CheckCircle size={24} />
            <div>
              <h2>Features</h2>
              <p>Enable or disable features for your app</p>
            </div>
          </div>
          <div className="section-content">
            <div className="features-grid">
              {Object.entries(customization.features).map(([key, value]) => (
                <label key={key} className="feature-toggle">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setCustomization({
                      ...customization,
                      features: { ...customization.features, [key]: e.target.checked }
                    })}
                  />
                  <span>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="customization-section">
          <div className="section-header">
            <Bell size={24} />
            <div>
              <h2>Notifications</h2>
              <p>Configure notification preferences</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customization.notifications.email}
                  onChange={(e) => setCustomization({
                    ...customization,
                    notifications: { ...customization.notifications, email: e.target.checked }
                  })}
                />
                <Mail size={18} />
                <span>Email Notifications</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customization.notifications.sms}
                  onChange={(e) => setCustomization({
                    ...customization,
                    notifications: { ...customization.notifications, sms: e.target.checked }
                  })}
                />
                <Smartphone size={18} />
                <span>SMS Notifications</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={customization.notifications.push}
                  onChange={(e) => setCustomization({
                    ...customization,
                    notifications: { ...customization.notifications, push: e.target.checked }
                  })}
                />
                <Bell size={18} />
                <span>Push Notifications</span>
              </label>
            </div>
          </div>
        </section>

        {/* Advanced Section */}
        <section className="customization-section">
          <div className="section-header">
            <Globe size={24} />
            <div>
              <h2>Advanced</h2>
              <p>Custom domain and API access</p>
            </div>
          </div>
          <div className="section-content">
            <div className="form-grid">
              <div className="form-group">
                <label>Custom Domain</label>
                <input
                  type="text"
                  className="input"
                  value={customization.customDomain}
                  onChange={(e) => setCustomization({ ...customization, customDomain: e.target.value })}
                  placeholder="app.yourcompany.com"
                />
                <small>Configure DNS settings to point to your app</small>
              </div>
              <div className="form-group">
                <label>API Access</label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={customization.apiEnabled}
                    onChange={(e) => setCustomization({ ...customization, apiEnabled: e.target.checked })}
                  />
                  <span>Enable API Access</span>
                </label>
                {customization.apiEnabled && (
                  <div className="api-key-section">
                    <div className="input-with-icon">
                      <input
                        type="text"
                        className="input"
                        value={customization.apiKey}
                        readOnly
                        placeholder="Click Generate to create API key"
                      />
                      <button
                        className="btn btn-secondary"
                        onClick={generateApiKey}
                        style={{ marginTop: '8px' }}
                      >
                        Generate API Key
                      </button>
                    </div>
                    <small>Keep this key secure. It provides full access to your app's API.</small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}


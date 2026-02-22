import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Building2, CheckCircle } from 'lucide-react'
import '../styles/Login.css' // Use auth-style layout instead of dashboard

export default function BusinessRegistration() {
  const { user, loading: authLoading, updateUser } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Wait for auth to load before checking business
    if (authLoading || !user) return

    checkExistingBusiness()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user])

  const checkExistingBusiness = async () => {
    try {
      const response = await api.get('/businesses/my-business')
      // User already has a business, redirect to dashboard
      if (response.data) {
        if (response.data.status === 'pending-review') {
          navigate('/account-review')
        } else {
          navigate('/dashboard')
        }
      } else {
        setChecking(false)
      }
    } catch (error) {
      // No business found (404) or other error - allow registration
      if (error.response?.status === 404) {
        setChecking(false)
      } else {
        console.error('Error checking business:', error)
        setChecking(false)
      }
    }
  }

  // Simplified form data - only essential fields
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    country: '',
    city: '',
    state: '',
    zipCode: '',
    currency: 'USD',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    // Owner info from user
    owner: {
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      position: 'Owner',
      role: 'admin'
    }
  })

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' },
    { value: 'INR', label: 'Indian Rupee (INR)' },
    { value: 'PKR', label: 'Pakistani Rupee (PKR)' }
  ]

  const businessTypes = [
    'Sole Proprietorship',
    'Partnership',
    'LLC',
    'Corporation',
    'Non-Profit'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate required fields
    if (!formData.businessName || !formData.businessType || !formData.country ||
      !formData.city || !formData.state || !formData.zipCode) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      const businessData = {
        ...formData,
        ownerId: user?.uid,
        createdAt: new Date().toISOString(),
        status: 'pending-review'
      }

      const response = await api.post('/businesses/register', businessData)

      if (response.data.success) {
        // Refresh user data
        try {
          const accountResponse = await api.get('/auth/account')
          if (accountResponse.data) {
            updateUser({
              accountType: accountResponse.data.accountType || 'business',
              isAdmin: accountResponse.data.isAdmin === true,
              role: accountResponse.data.role || 'owner',
              accountStatus: accountResponse.data.accountStatus || 'pending-approval'
            })
          }
        } catch (err) {
          console.error('Failed to refresh user data:', err)
        }

        setSuccess(true)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking || authLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <CheckCircle size={64} style={{ color: '#10b981', margin: '0 auto 24px' }} />
          <h2>Application Submitted!</h2>
          <p style={{ color: '#6b7280', marginBottom: '8px' }}>Thanks for registering your business. Our team is reviewing your application.</p>
          <p style={{ color: '#6b7280' }}>We will notify you by email once your account is approved.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '24px', width: '100%' }}
            onClick={() => navigate('/account-review')}
          >
            View Review Status
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Building2 size={48} style={{ color: '#4f46e5', margin: '0 auto 16px' }} />
          <h1>Register Your Business</h1>
          <p className="auth-subtitle">Get started in minutes with just the essentials</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Business Name */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Business Name <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter your business name"
                required
              />
            </div>

            {/* Business Type */}
            <div className="form-group">
              <label>Business Type <span className="required">*</span></label>
              <select
                className="input"
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                required
              >
                <option value="">Select Type</option>
                {businessTypes.map(type => (
                  <option key={type} value={type.toLowerCase().replace(' ', '-')}>{type}</option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div className="form-group">
              <label>Currency <span className="required">*</span></label>
              <select
                className="input"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                {currencies.map(curr => (
                  <option key={curr.value} value={curr.value}>{curr.label}</option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="form-group">
              <label>Country <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Country"
                required
              />
            </div>

            {/* City */}
            <div className="form-group">
              <label>City <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                required
              />
            </div>

            {/* State */}
            <div className="form-group">
              <label>State/Province <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State or Province"
                required
              />
            </div>

            {/* Zip Code */}
            <div className="form-group">
              <label>Zip/Postal Code <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="Zip Code"
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151' }}>Owner Information</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              <strong>{formData.owner.firstName} {formData.owner.lastName}</strong> ({formData.owner.email})
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#6b7280' }}>
          Your application will be reviewed by our team. You'll receive an email notification once approved.
        </p>
      </div>
    </div>
  )
}

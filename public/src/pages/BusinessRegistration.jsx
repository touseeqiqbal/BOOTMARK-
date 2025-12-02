import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { 
  Building2, Calendar, Upload, Phone, Globe, MapPin, 
  DollarSign, Globe2, PhoneCall, Clock, 
  User, Briefcase, ArrowRight, ArrowLeft, CheckCircle 
} from 'lucide-react'
import ImageUpload from '../components/ImageUpload'
import '../styles/BusinessRegistration.css'

export default function BusinessRegistration() {
  const { user, loading: authLoading, updateUser } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
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
        // Expected - user doesn't have a business yet
        setChecking(false)
      } else {
        // Unexpected error - log it but still allow registration
        console.error('Error checking business:', error)
        setChecking(false)
      }
    }
  }

  // Step 1: Business Details
  const [businessDetails, setBusinessDetails] = useState({
    businessName: '',
    startDate: '',
    logo: '',
    businessContactNumber: '',
    country: '',
    city: '',
    landmark: '',
    currency: '',
    website: '',
    alternateContactNumber: '',
    state: '',
    zipCode: '',
    timezone: ''
  })

  // Step 2: Business Settings
  const [businessSettings, setBusinessSettings] = useState({
    businessType: '',
    taxId: '',
    industry: '',
    numberOfEmployees: '',
    subscriptionPlan: 'basic', // basic, professional, enterprise
    features: {
      forms: true,
      analytics: true,
      invoices: true,
      customers: true,
      workflows: true,
      teamCollaboration: true
    }
  })

  // Step 3: Owner Information
  const [ownerInfo, setOwnerInfo] = useState({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: '',
    position: 'Owner',
    role: 'admin'
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

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Dubai',
    'Asia/Karachi',
    'Asia/Kolkata',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate business details
      if (!businessDetails.businessName || !businessDetails.country || 
          !businessDetails.city || !businessDetails.currency || 
          !businessDetails.state || !businessDetails.zipCode || 
          !businessDetails.timezone) {
        setError('Please fill in all required fields')
        return
      }
    } else if (currentStep === 2) {
      // Validate business settings
      if (!businessSettings.businessType) {
        setError('Please select a business type')
        return
      }
    } else if (currentStep === 3) {
      // Validate owner info
      if (!ownerInfo.firstName || !ownerInfo.lastName || !ownerInfo.email) {
        setError('Please fill in all required owner information')
        return
      }
    }
    setError('')
    setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    setError('')
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const businessData = {
        ...businessDetails,
        ...businessSettings,
        owner: ownerInfo,
        ownerId: user?.uid,
        createdAt: new Date().toISOString(),
        status: 'active'
      }

      const response = await api.post('/businesses/register', businessData)
      
      if (response.data.success) {
        // Refresh user data (status will now be pending)
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
      <div className="business-registration-container">
        <div className="business-registration-card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="business-registration-container">
        <div className="business-registration-card success-card">
          <CheckCircle size={64} className="success-icon" />
          <h2>Application Submitted for Review</h2>
          <p>Thanks for sharing your business details. Our team is reviewing your application.</p>
          <p>We will notify you by email once your account is approved.</p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '20px' }}
            onClick={() => navigate('/account-review')}
          >
            View Review Status
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="business-registration-container">
      <div className="business-registration-card">
        <div className="registration-header">
          <h1>Register and Get Started in minutes</h1>
        </div>

        {/* Progress Steps */}
        <div className="steps-indicator">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > 1 ? <CheckCircle size={20} /> : '1'}</div>
            <div className="step-label">Business</div>
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">{currentStep > 2 ? <CheckCircle size={20} /> : '2'}</div>
            <div className="step-label">Business Settings</div>
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Owner</div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Step 1: Business Details */}
        {currentStep === 1 && (
          <div className="registration-step">
            <h2>Business details</h2>
            <div className="form-grid">
              <div className="form-column">
                <div className="form-group">
                  <label>Business Name: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Briefcase size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={businessDetails.businessName}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, businessName: e.target.value })}
                      placeholder="Business Name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Start Date:</label>
                  <div className="input-with-icon">
                    <Calendar size={18} className="input-icon" />
                    <input
                      type="date"
                      className="input"
                      value={businessDetails.startDate}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, startDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload Logo:</label>
                  <div className="logo-upload-section">
                    <ImageUpload
                      label=""
                      value={businessDetails.logo}
                      onChange={(value) => setBusinessDetails({ ...businessDetails, logo: value })}
                      accept="image/*"
                      maxSize={2 * 1024 * 1024}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Business contact number:</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      className="input"
                      value={businessDetails.businessContactNumber}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, businessContactNumber: e.target.value })}
                      placeholder="Business contact number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Country: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Globe size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={businessDetails.country}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, country: e.target.value })}
                      placeholder="Country"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>City: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <MapPin size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={businessDetails.city}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, city: e.target.value })}
                      placeholder="City"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Landmark: <span className="required">*</span></label>
                  <input
                    type="text"
                    className="input"
                    value={businessDetails.landmark}
                    onChange={(e) => setBusinessDetails({ ...businessDetails, landmark: e.target.value })}
                    placeholder="Landmark"
                    required
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <label>Currency: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <DollarSign size={18} className="input-icon" />
                    <select
                      className="input"
                      value={businessDetails.currency}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, currency: e.target.value })}
                      required
                    >
                      <option value="">Select Currency</option>
                      {currencies.map(curr => (
                        <option key={curr.value} value={curr.value}>{curr.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Website:</label>
                  <div className="input-with-icon">
                    <Globe2 size={18} className="input-icon" />
                    <input
                      type="url"
                      className="input"
                      value={businessDetails.website}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, website: e.target.value })}
                      placeholder="Website"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Alternate contact number:</label>
                  <div className="input-with-icon">
                    <PhoneCall size={18} className="input-icon" />
                    <input
                      type="tel"
                      className="input"
                      value={businessDetails.alternateContactNumber}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, alternateContactNumber: e.target.value })}
                      placeholder="Alternate contact number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>State: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <MapPin size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={businessDetails.state}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, state: e.target.value })}
                      placeholder="State"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Zip Code: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <MapPin size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={businessDetails.zipCode}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, zipCode: e.target.value })}
                      placeholder="Zip/Postal Code"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Time zone: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Clock size={18} className="input-icon" />
                    <select
                      className="input"
                      value={businessDetails.timezone}
                      onChange={(e) => setBusinessDetails({ ...businessDetails, timezone: e.target.value })}
                      required
                    >
                      <option value="">Select Timezone</option>
                      {timezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Business Settings */}
        {currentStep === 2 && (
          <div className="registration-step">
            <h2>Business Settings</h2>
            <div className="form-grid">
              <div className="form-column">
                <div className="form-group">
                  <label>Business Type: <span className="required">*</span></label>
                  <select
                    className="input"
                    value={businessSettings.businessType}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, businessType: e.target.value })}
                    required
                  >
                    <option value="">Select Business Type</option>
                    <option value="sole-proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="non-profit">Non-Profit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Tax ID / EIN:</label>
                  <input
                    type="text"
                    className="input"
                    value={businessSettings.taxId}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, taxId: e.target.value })}
                    placeholder="Tax ID or EIN"
                  />
                </div>

                <div className="form-group">
                  <label>Industry:</label>
                  <input
                    type="text"
                    className="input"
                    value={businessSettings.industry}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, industry: e.target.value })}
                    placeholder="Industry"
                  />
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <label>Number of Employees:</label>
                  <select
                    className="input"
                    value={businessSettings.numberOfEmployees}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, numberOfEmployees: e.target.value })}
                  >
                    <option value="">Select Range</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="201-500">201-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Subscription Plan:</label>
                  <select
                    className="input"
                    value={businessSettings.subscriptionPlan}
                    onChange={(e) => setBusinessSettings({ ...businessSettings, subscriptionPlan: e.target.value })}
                  >
                    <option value="basic">Basic</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Features Enabled:</label>
                  <div className="features-checkbox-group">
                    {Object.entries(businessSettings.features).map(([key, value]) => (
                      <label key={key} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setBusinessSettings({
                            ...businessSettings,
                            features: { ...businessSettings.features, [key]: e.target.checked }
                          })}
                        />
                        <span>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Owner Information */}
        {currentStep === 3 && (
          <div className="registration-step">
            <h2>Owner Information</h2>
            <div className="form-grid">
              <div className="form-column">
                <div className="form-group">
                  <label>First Name: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={ownerInfo.firstName}
                      onChange={(e) => setOwnerInfo({ ...ownerInfo, firstName: e.target.value })}
                      placeholder="First Name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Last Name: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      type="text"
                      className="input"
                      value={ownerInfo.lastName}
                      onChange={(e) => setOwnerInfo({ ...ownerInfo, lastName: e.target.value })}
                      placeholder="Last Name"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email: <span className="required">*</span></label>
                  <div className="input-with-icon">
                    <Globe2 size={18} className="input-icon" />
                    <input
                      type="email"
                      className="input"
                      value={ownerInfo.email}
                      onChange={(e) => setOwnerInfo({ ...ownerInfo, email: e.target.value })}
                      placeholder="Email"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-column">
                <div className="form-group">
                  <label>Phone:</label>
                  <div className="input-with-icon">
                    <Phone size={18} className="input-icon" />
                    <input
                      type="tel"
                      className="input"
                      value={ownerInfo.phone}
                      onChange={(e) => setOwnerInfo({ ...ownerInfo, phone: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Position:</label>
                  <input
                    type="text"
                    className="input"
                    value={ownerInfo.position}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, position: e.target.value })}
                    placeholder="Position"
                  />
                </div>

                <div className="form-group">
                  <label>Role:</label>
                  <select
                    className="input"
                    value={ownerInfo.role}
                    onChange={(e) => setOwnerInfo({ ...ownerInfo, role: e.target.value })}
                  >
                    <option value="admin">Administrator</option>
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="step-navigation">
          {currentStep > 1 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrevious}
              disabled={loading}
            >
              <ArrowLeft size={18} />
              Previous
            </button>
          )}
          <div className="spacer" />
          {currentStep < 3 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNext}
              disabled={loading}
            >
              Next
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { 
  CheckCircle, XCircle, Clock, Building2, Mail, Phone, 
  MapPin, Calendar, User, RefreshCw, ArrowLeft, Shield
} from 'lucide-react'
import PermissionSelector from '../components/PermissionSelector'
import '../styles/BusinessApprovals.css'

export default function BusinessApprovals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pendingBusinesses, setPendingBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [error, setError] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingId, setRejectingId] = useState(null)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [approvingBusinessId, setApprovingBusinessId] = useState(null)
  const [selectedPermissions, setSelectedPermissions] = useState([])

  useEffect(() => {
    if (!user?.isSuperAdmin) {
      navigate('/dashboard')
      return
    }
    fetchPendingApprovals()
  }, [user, navigate])

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true)
      const response = await api.get('/businesses/pending-approvals')
      setPendingBusinesses(response.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load pending approvals')
      console.error('Error fetching pending approvals:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (businessId) => {
    const business = pendingBusinesses.find(b => b.id === businessId)
    if (!business) return

    // Show permission selector modal
    setApprovingBusinessId(businessId)
    setSelectedPermissions([])
    setShowPermissionModal(true)
  }

  const handleConfirmApproval = async (permissions) => {
    if (!approvingBusinessId) return

    setProcessing(approvingBusinessId)
    setError('')
    setShowPermissionModal(false)
    
    try {
      await api.post(`/businesses/${approvingBusinessId}/approve`, {
        permissions: permissions || []
      })
      await fetchPendingApprovals()
      alert('Business approved successfully! The owner will receive an email notification.')
      setApprovingBusinessId(null)
      setSelectedPermissions([])
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve business')
      console.error('Error approving business:', err)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (businessId) => {
    const business = pendingBusinesses.find(b => b.id === businessId)
    if (!business) return

    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    if (!confirm(`Reject ${business.businessName}? This action cannot be undone.`)) {
      return
    }

    setProcessing(businessId)
    setError('')
    try {
      await api.post(`/businesses/${businessId}/reject`, { reason: rejectionReason })
      setRejectionReason('')
      setRejectingId(null)
      await fetchPendingApprovals()
      alert('Business rejected. The owner will receive an email notification.')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject business')
      console.error('Error rejecting business:', err)
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  if (loading) {
    return (
      <div className="business-approvals-container">
        <div className="loading">Loading pending approvals...</div>
      </div>
    )
  }

  return (
    <div className="business-approvals-container">
      <div className="approvals-header">
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
        <div>
          <h1>Business Approvals</h1>
          <p>Review and approve pending business registrations</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchPendingApprovals} disabled={loading}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '20px 0' }}>
          {error}
        </div>
      )}

      {pendingBusinesses.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
          <h2>All caught up!</h2>
          <p>No pending business approvals at this time.</p>
        </div>
      ) : (
        <div className="approvals-grid">
          {pendingBusinesses.map((business) => (
            <div key={business.id} className="approval-card">
              <div className="approval-card-header">
                <div className="business-logo-section">
                  {business.logo ? (
                    <img src={business.logo} alt={business.businessName} className="business-logo" />
                  ) : (
                    <div className="business-logo-placeholder">
                      <Building2 size={32} />
                    </div>
                  )}
                  <div>
                    <h3>{business.businessName}</h3>
                    <div className="status-badge pending">
                      <Clock size={14} />
                      Pending Review
                    </div>
                  </div>
                </div>
                <div className="submission-date">
                  <Calendar size={14} />
                  Submitted: {formatDate(business.createdAt)}
                </div>
              </div>

              <div className="approval-card-body">
                <div className="info-section">
                  <h4>Business Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Building2 size={16} />
                      <span><strong>Type:</strong> {business.businessType || 'N/A'}</span>
                    </div>
                    <div className="info-item">
                      <MapPin size={16} />
                      <span><strong>Location:</strong> {business.city}, {business.state}, {business.country}</span>
                    </div>
                    {business.website && (
                      <div className="info-item">
                        <span><strong>Website:</strong> <a href={business.website} target="_blank" rel="noopener noreferrer">{business.website}</a></span>
                      </div>
                    )}
                    {business.industry && (
                      <div className="info-item">
                        <span><strong>Industry:</strong> {business.industry}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="info-section">
                  <h4>Owner Information</h4>
                  <div className="info-grid">
                    {business.owner && (
                      <>
                        <div className="info-item">
                          <User size={16} />
                          <span><strong>Name:</strong> {business.owner.firstName} {business.owner.lastName}</span>
                        </div>
                        <div className="info-item">
                          <Mail size={16} />
                          <span><strong>Email:</strong> {business.owner.email}</span>
                        </div>
                        {business.owner.phone && (
                          <div className="info-item">
                            <Phone size={16} />
                            <span><strong>Phone:</strong> {business.owner.phone}</span>
                          </div>
                        )}
                        {business.owner.position && (
                          <div className="info-item">
                            <span><strong>Position:</strong> {business.owner.position}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {business.businessContactNumber && (
                  <div className="info-section">
                    <h4>Contact</h4>
                    <div className="info-item">
                      <Phone size={16} />
                      <span>{business.businessContactNumber}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="approval-card-actions">
                {rejectingId === business.id ? (
                  <div className="rejection-form">
                    <textarea
                      className="input"
                      placeholder="Reason for rejection (required)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      style={{ marginBottom: '12px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleReject(business.id)}
                        disabled={processing === business.id || !rejectionReason.trim()}
                      >
                        {processing === business.id ? 'Rejecting...' : 'Confirm Reject'}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setRejectingId(null)
                          setRejectionReason('')
                        }}
                        disabled={processing === business.id}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => handleApprove(business.id)}
                      disabled={processing === business.id}
                    >
                      <CheckCircle size={18} />
                      {processing === business.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => setRejectingId(business.id)}
                      disabled={processing === business.id}
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permission Selector Modal */}
      <PermissionSelector
        isOpen={showPermissionModal}
        onClose={() => {
          setShowPermissionModal(false)
          setApprovingBusinessId(null)
          setSelectedPermissions([])
        }}
        onConfirm={handleConfirmApproval}
        selectedPermissions={selectedPermissions}
        title={`Set Permissions for ${pendingBusinesses.find(b => b.id === approvingBusinessId)?.businessName || 'Business'}`}
      />
    </div>
  )
}


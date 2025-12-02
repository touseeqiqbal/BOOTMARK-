import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { 
  Building2, Users, Shield, CheckCircle, XCircle, 
  ArrowLeft, RefreshCw, Save, Settings, Search, Trash2, KeyRound, Loader
} from 'lucide-react'
import '../styles/BusinessPermissions.css'

export default function BusinessPermissions() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [businessAdmins, setBusinessAdmins] = useState([])
  const [availablePermissions, setAvailablePermissions] = useState({})
  const [permissionsByCategory, setPermissionsByCategory] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [adminPermissions, setAdminPermissions] = useState({}) // userId -> [permissionIds]
  const [deletingBusinessId, setDeletingBusinessId] = useState(null)
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState(null)

  useEffect(() => {
    if (!user?.isSuperAdmin) {
      navigate('/dashboard')
      return
    }
    fetchData()
  }, [user, navigate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Fetch all businesses
      const businessesRes = await api.get('/businesses/all')
      setBusinesses(businessesRes.data || [])
      
      // Fetch available permissions
      const permissionsRes = await api.get('/businesses/permissions/available')
      setAvailablePermissions(permissionsRes.data.permissions || {})
      setPermissionsByCategory(permissionsRes.data.byCategory || {})
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBusiness = async (business) => {
    try {
      setSelectedBusiness(business)
      setError('')
      setSuccess('')
      
      const response = await api.get(`/businesses/${business.id}/permissions`)
      const admins = response.data.admins || []
      setBusinessAdmins(admins)
      
      // Initialize permissions state
      const permissionsMap = {}
      admins.forEach(admin => {
        permissionsMap[admin.userId] = admin.businessPermissions || []
      })
      setAdminPermissions(permissionsMap)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load business permissions')
      console.error('Error fetching business permissions:', err)
    }
  }

  const handleTogglePermission = (userId, permissionId) => {
    setAdminPermissions(prev => {
      const current = prev[userId] || []
      const updated = current.includes(permissionId)
        ? current.filter(p => p !== permissionId)
        : [...current, permissionId]
      return { ...prev, [userId]: updated }
    })
  }

  const handleSavePermissions = async (userId) => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')
      
      const permissions = adminPermissions[userId] || []
      
      const response = await api.put(`/businesses/${selectedBusiness.id}/permissions/${userId}`, {
        permissions
      })
      
      if (response.data?.success) {
        const adminName = businessAdmins.find(a => a.userId === userId)?.name || 'admin'
        const updatedPermissions = response.data.permissions || []
        
        setSuccess(`Permissions updated successfully for ${adminName} (${updatedPermissions.length} permissions)`)
        
        // Update local state immediately
        setAdminPermissions(prev => ({
          ...prev,
          [userId]: updatedPermissions
        }))
        
        // Refresh business admins to show updated permissions from server
        await handleSelectBusiness(selectedBusiness)
        
        setTimeout(() => setSuccess(''), 5000)
      } else {
        throw new Error('Failed to update permissions')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update permissions'
      setError(errorMessage)
      console.error('Error updating permissions:', err)
      alert(`Error: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBusiness = async (business) => {
    const businessName = business.businessName || 'this business'
    
    if (!confirm(`⚠️ WARNING: Delete Business\n\nAre you sure you want to delete "${businessName}"?\n\nThis will:\n- Deactivate the business owner's account\n- Deactivate all member accounts (if not in other businesses)\n- Remove the business from the system\n\nForms, submissions, invoices, and customers will remain but will be orphaned.\n\nThis action CANNOT be undone!`)) {
      return
    }

    try {
      setDeletingBusinessId(business.id)
      setError('')
      setSuccess('')
      
      const response = await api.delete(`/businesses/${business.id}`)
      
      if (response.data?.success) {
        setSuccess(`Business "${business.businessName}" deleted successfully`)
        
        // Remove from local state
        setBusinesses(prev => prev.filter(b => b.id !== business.id))
        
        // Clear selection if deleted business was selected
        if (selectedBusiness?.id === business.id) {
          setSelectedBusiness(null)
          setBusinessAdmins([])
          setAdminPermissions({})
        }
        
        setTimeout(() => setSuccess(''), 3000)
      } else {
        throw new Error('Failed to delete business')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to delete business'
      setError(errorMessage)
      console.error('Error deleting business:', err)
      alert(`Error: ${errorMessage}`)
    } finally {
      setDeletingBusinessId(null)
    }
  }

  const handleSelectAll = (userId, category) => {
    const categoryPermissions = permissionsByCategory[category] || []
    const categoryIds = categoryPermissions.map(p => p.id)
    const current = adminPermissions[userId] || []
    const allSelected = categoryIds.every(id => current.includes(id))
    
    setAdminPermissions(prev => {
      const currentPerms = prev[userId] || []
      if (allSelected) {
        // Deselect all in category
        return {
          ...prev,
          [userId]: currentPerms.filter(p => !categoryIds.includes(p))
        }
      } else {
        // Select all in category
        const newPerms = [...new Set([...currentPerms, ...categoryIds])]
        return {
          ...prev,
          [userId]: newPerms
        }
      }
    })
  }

  const handleResetPassword = async (userId, userName, userEmail) => {
    if (!confirm(`Are you sure you want to send a password reset email to ${userName || userEmail}?`)) {
      return
    }

    try {
      setResettingPasswordUserId(userId)
      setError('')
      setSuccess('')
      
      const response = await api.post(`/businesses/members/${userId}/reset-password`)
      
      if (response.data?.success) {
        setSuccess(`Password reset email sent successfully to ${userEmail}`)
        setTimeout(() => setSuccess(''), 5000)
        
        // If email failed but link was generated, show it
        if (response.data?.resetLink && response.data?.warning) {
          const shouldShowLink = window.confirm(
            `${response.data.message}\n\n${response.data.warning}\n\nWould you like to copy the reset link to share manually?`
          )
          if (shouldShowLink) {
            navigator.clipboard.writeText(response.data.resetLink).then(() => {
              alert('Reset link copied to clipboard!')
            }).catch(() => {
              alert(`Reset link:\n\n${response.data.resetLink}`)
            })
          }
        }
      } else {
        throw new Error(response.data?.error || 'Failed to send password reset email')
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to send password reset email'
      setError(errorMessage)
      console.error('Error resetting password:', err)
      setTimeout(() => setError(''), 5000)
    } finally {
      setResettingPasswordUserId(null)
    }
  }

  const filteredBusinesses = businesses.filter(business =>
    business.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.businessId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user?.isSuperAdmin) {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You do not have the necessary permissions to view this page.</p>
        <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="business-permissions-page">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
        <div>
          <h1>
            <Shield size={24} />
            Business Permissions Management
          </h1>
          <p>Manage permissions for business members (owners and team members)</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <XCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      <div className="permissions-layout">
        {/* Businesses List */}
        <div className="businesses-panel">
          <div className="panel-header">
            <h2>
              <Building2 size={20} />
              Businesses
            </h2>
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>
              <RefreshCw size={16} />
            </button>
          </div>
          
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="businesses-list">
            {filteredBusinesses.length === 0 ? (
              <div className="empty-state">
                <p>No businesses found</p>
              </div>
            ) : (
              filteredBusinesses.map(business => (
                <div
                  key={business.id}
                  className={`business-card ${selectedBusiness?.id === business.id ? 'active' : ''}`}
                >
                  <div 
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={() => handleSelectBusiness(business)}
                  >
                    <div className="business-card-header">
                      <Building2 size={18} />
                      <strong>{business.businessName || 'Unnamed Business'}</strong>
                    </div>
                    <div className="business-card-meta">
                      <span className={`status-badge status-${business.status || 'pending'}`}>
                        {business.status || 'pending'}
                      </span>
                      <span className="business-id">{business.businessId}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteBusiness(business)
                    }}
                    disabled={deletingBusinessId === business.id}
                    title="Delete business"
                    style={{ marginLeft: '8px', flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="permissions-panel">
          {!selectedBusiness ? (
            <div className="empty-state">
              <Shield size={48} color="#9ca3af" />
              <h3>Select a Business</h3>
              <p>Select a business from the list to manage member permissions</p>
            </div>
          ) : businessAdmins.length === 0 ? (
            <div className="empty-state">
              <Users size={48} color="#9ca3af" />
              <h3>No Members Found</h3>
              <p>This business has no members yet (only the owner).</p>
            </div>
          ) : (
            <>
              <div className="panel-header">
                <div>
                  <h2>
                    <Users size={20} />
                    {selectedBusiness.businessName} - Members
                  </h2>
                  <p className="subtitle">{businessAdmins.length} member{businessAdmins.length !== 1 ? 's' : ''} (owner + team members)</p>
                </div>
              </div>

              <div className="admins-list">
                {businessAdmins.map(admin => {
                  const userPerms = adminPermissions[admin.userId] || []
                  const categories = Object.keys(permissionsByCategory)
                  
                  return (
                    <div key={admin.userId} className="admin-card">
                      <div className="admin-header">
                        <div className="admin-info">
                          <strong>{admin.name || admin.email}</strong>
                          <span className="admin-email">{admin.email}</span>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {admin.isOwner && (
                              <span className="badge badge-primary">Owner</span>
                            )}
                            {!admin.isOwner && admin.role && (
                              <span className="badge" style={{ 
                                backgroundColor: admin.role === 'admin' ? '#3b82f6' : '#6b7280',
                                color: '#fff',
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '4px'
                              }}>
                                {admin.role === 'admin' ? 'Admin' : 'Member'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleResetPassword(admin.userId, admin.name, admin.email)}
                            disabled={resettingPasswordUserId === admin.userId}
                            title="Reset password"
                          >
                            {resettingPasswordUserId === admin.userId ? (
                              <Loader size={16} className="spinner" />
                            ) : (
                              <KeyRound size={16} />
                            )}
                          </button>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSavePermissions(admin.userId)}
                            disabled={saving}
                          >
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Permissions'}
                          </button>
                        </div>
                        {admin.isOwner && (
                          <div className="owner-note" style={{ fontSize: '12px', color: '#8b5cf6', fontStyle: 'italic', marginLeft: '8px' }}>
                            Owner (Super Admin can manage)
                          </div>
                        )}
                      </div>

                      {admin.isOwner && (
                        <div style={{ 
                          padding: '16px', 
                          backgroundColor: '#f3f4f6', 
                          borderRadius: '8px', 
                          marginBottom: '16px',
                          fontSize: '14px',
                          color: '#6b7280'
                        }}>
                          <strong>Note:</strong> This user is the business owner. As a super admin, you can manage their permissions. 
                          By default, owners have all permissions, but you can restrict them if needed.
                        </div>
                      )}

                      <div className="permissions-grid">
                        {categories.map(category => {
                          const categoryPerms = permissionsByCategory[category] || []
                          const selectedInCategory = categoryPerms.filter(p => userPerms.includes(p.id))
                          const allSelected = categoryPerms.length > 0 && selectedInCategory.length === categoryPerms.length
                          
                          return (
                            <div key={category} className="permission-category">
                              <div className="category-header">
                                <h4>{category}</h4>
                                <button
                                  className="btn btn-link btn-sm"
                                  onClick={() => handleSelectAll(admin.userId, category)}
                                >
                                  {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                              <div className="permissions-list">
                                {categoryPerms.map(permission => {
                                  const isSelected = userPerms.includes(permission.id)
                                  return (
                                    <label
                                      key={permission.id}
                                      className={`permission-item ${isSelected ? 'selected' : ''}`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleTogglePermission(admin.userId, permission.id)}
                                      />
                                      <div className="permission-content">
                                        <strong>{permission.name}</strong>
                                        <span>{permission.description}</span>
                                      </div>
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


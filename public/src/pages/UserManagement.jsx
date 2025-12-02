import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Shield, UserCheck, UserX, Search, KeyRound, CheckCircle, XCircle, Loader } from 'lucide-react'
import '../styles/UserManagement.css'
import { hasPermission } from '../utils/permissionUtils'

export default function UserManagement() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [resettingMemberId, setResettingMemberId] = useState('')
  const [accessDenied, setAccessDenied] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    createNewUser: false, // Toggle between adding existing user vs creating new
    role: 'member',
    permissions: []
  })

  const availablePermissions = [
    { id: 'forms', label: 'Manage Forms' },
    { id: 'submissions', label: 'View Submissions' },
    { id: 'customers', label: 'Manage Customers' },
    { id: 'invoices', label: 'Manage Invoices' },
    { id: 'analytics', label: 'View Analytics' },
    { id: 'settings', label: 'Manage Settings' }
  ]

  const roles = [
    { value: 'owner', label: 'Owner' },
    { value: 'admin', label: 'Administrator' },
    { value: 'manager', label: 'Manager' },
    { value: 'member', label: 'Member' }
  ]

  useEffect(() => {
    if (!authLoading) {
      // Allow access if user has either the dedicated users.manage permission
      // or the broader settings permission (backwards compatibility / full admin).
      const canManageUsers = hasPermission(user, 'users.manage') || hasPermission(user, 'settings')
      if (!canManageUsers) {
        setAccessDenied(true)
        setLoading(false)
      } else {
        setAccessDenied(false)
        fetchMembers()
      }
    }
  }, [authLoading, user])

  const fetchMembers = async () => {
    try {
      const response = await api.get('/businesses/members')
      setMembers(response.data)
    } catch (error) {
      console.error('Failed to fetch members:', error)
      if (error.response?.status === 404) {
        // User doesn't have a business yet
        navigate('/business-registration')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    try {
      if (formData.createNewUser) {
        // Create new user with password
        if (!formData.name || !formData.password) {
          alert('Name and password are required for new users')
          return
        }
        await api.post('/businesses/members/create', formData)
      } else {
        // Add existing user
        await api.post('/businesses/members', formData)
      }
      setShowAddModal(false)
      setFormData({ email: '', name: '', password: '', createNewUser: false, role: 'member', permissions: [] })
      fetchMembers()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to add member')
    }
  }

  const handleEditMember = (member) => {
    setSelectedMember(member)
    setFormData({
      email: member.email,
      role: member.role,
      permissions: member.permissions || []
    })
    setShowEditModal(true)
  }

  const handleUpdateMember = async () => {
    try {
      await api.put(`/businesses/members/${selectedMember.userId}`, {
        role: formData.role,
        permissions: formData.permissions
      })
      setShowEditModal(false)
      setSelectedMember(null)
      fetchMembers()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update member')
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      await api.delete(`/businesses/members/${memberId}`)
      fetchMembers()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to remove member')
    }
  }

  const [message, setMessage] = useState({ type: '', text: '' })

  const handleResetPassword = async (member) => {
    if (!member?.userId) return
    setResettingMemberId(member.userId)
    setMessage({ type: '', text: '' })
    try {
      const response = await api.post(`/businesses/members/${member.userId}/reset-password`)
      if (response.data?.success) {
        setMessage({ 
          type: 'success', 
          text: response.data.message || `Password reset email sent successfully to ${member.email}` 
        })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
        
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
        setMessage({ type: 'error', text: response.data?.error || 'Failed to send password reset email' })
        setTimeout(() => setMessage({ type: '', text: '' }), 5000)
      }
    } catch (error) {
      let errorMessage = error.response?.data?.error || 'Failed to send password reset email'
      
      // Provide helpful message if SMTP is not configured
      if (errorMessage.includes('SMTP') || errorMessage.includes('email service not configured')) {
        errorMessage = 'Email service is not configured. Please configure SMTP settings in Account Settings, or contact your administrator to set up default SMTP configuration.'
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      })
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)
    } finally {
      setResettingMemberId('')
    }
  }

  const togglePermission = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const filteredMembers = members.filter(member => {
    const searchLower = searchTerm.toLowerCase()
    return (
      member.email?.toLowerCase().includes(searchLower) ||
      member.user?.name?.toLowerCase().includes(searchLower) ||
      member.role?.toLowerCase().includes(searchLower)
    )
  })

  if (authLoading || loading) {
    return <div className="loading">Loading...</div>
  }

  if (accessDenied) {
    return (
      <div className="user-management-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <Shield size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
        <h2>You don&apos;t have permission to manage team members.</h2>
        <p style={{ color: '#6b7280', marginTop: '8px' }}>
          Only business owners or admins with settings access can manage users.
        </p>
        <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <div>
          <h1>User Management</h1>
          <p>Manage your team members and their access</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Member
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          color: message.type === 'success' ? '#166534' : '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {message.type === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <XCircle size={20} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="search-bar">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search members by name, email, or role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="members-grid">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>No members found</h3>
            <p>{searchTerm ? 'Try adjusting your search' : 'Add your first team member to get started'}</p>
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div key={member.userId} className="member-card">
              <div className="member-header">
                <div className="member-avatar">
                  {member.user?.photoURL ? (
                    <img src={member.user.photoURL} alt={member.user.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {member.user?.name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <h3>{member.user?.name || 'Unknown User'}</h3>
                  <p className="member-email">
                    <Mail size={14} />
                    {member.email}
                  </p>
                </div>
                <div className="member-actions">
                  <button
                    className="icon-btn"
                    onClick={() => handleResetPassword(member)}
                    title="Send password reset email"
                    disabled={resettingMemberId === member.userId}
                  >
                    {resettingMemberId === member.userId ? (
                      <Loader size={18} className="spinner" />
                    ) : (
                      <KeyRound size={18} />
                    )}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => handleEditMember(member)}
                    title="Edit member"
                  >
                    <Edit size={18} />
                  </button>
                  {member.userId !== user?.uid && (
                    <button
                      className="icon-btn danger"
                      onClick={() => handleRemoveMember(member.userId)}
                      title="Remove member"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              <div className="member-details">
                <div className="member-role">
                  <Shield size={16} />
                  <span className={`role-badge role-${member.role}`}>
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
                {member.permissions && member.permissions.length > 0 && (
                  <div className="member-permissions">
                    <span className="permissions-label">Permissions:</span>
                    <div className="permissions-list">
                      {member.permissions.map(perm => (
                        <span key={perm} className="permission-tag">{perm}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="member-meta">
                  <small>Added {new Date(member.addedAt).toLocaleDateString()}</small>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false)
          setFormData({ email: '', name: '', password: '', createNewUser: false, role: 'member', permissions: [] })
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Team Member</h2>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.createNewUser}
                  onChange={(e) => setFormData({ ...formData, createNewUser: e.target.checked, email: '', name: '', password: '' })}
                />
                <span>Create new user account</span>
              </label>
            </div>

            <div className="form-group">
              <label>Email Address <span className="required">*</span></label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            {formData.createNewUser && (
              <>
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password <span className="required">*</span></label>
                  <input
                    type="password"
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    minLength={6}
                    required
                  />
                  <small>User will use this password to login</small>
                </div>
              </>
            )}
            <div className="form-group">
              <label>Role</label>
              <select
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Permissions</label>
              <div className="permissions-checkbox-group">
                {availablePermissions.map(perm => (
                  <label key={perm.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAddMember}>
                {formData.createNewUser ? 'Create User & Add' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Team Member</h2>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                disabled
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Permissions</label>
              <div className="permissions-checkbox-group">
                {availablePermissions.map(perm => (
                  <label key={perm.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleUpdateMember}>
                Update Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


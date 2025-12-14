import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { ArrowLeft, UserPlus, Users, Mail, Shield, Edit, Eye, Trash2 } from 'lucide-react'
import '../styles/TeamCollaboration.css'

export default function TeamCollaboration() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [formRes, membersRes, invitesRes] = await Promise.all([
        api.get(`/forms/${id}`),
        api.get(`/forms/${id}/members`),
        api.get(`/forms/${id}/invites`)
      ])
      setForm(formRes.data)
      setMembers(membersRes.data || [])
      setInvites(invitesRes.data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      if (error.response?.status === 404) {
        // Endpoints might not exist yet, initialize empty
        setMembers([])
        setInvites([])
      }
    } finally {
      setLoading(false)
    }
  }

  const sendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    try {
      await api.post(`/forms/${id}/invites`, {
        email: inviteEmail,
        role: inviteRole
      })
      setMessage({ type: 'success', text: 'Invitation sent successfully!' })
      setInviteEmail('')
      setInviteRole('editor')
      setShowInviteModal(false)
      fetchData()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to send invite:', error)
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send invitation' })
    }
  }

  const removeMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await api.delete(`/forms/${id}/members/${memberId}`)
      setMembers(members.filter(m => m.id !== memberId))
      setMessage({ type: 'success', text: 'Member removed successfully' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to remove member:', error)
      setMessage({ type: 'error', text: 'Failed to remove member' })
    }
  }

  const updateMemberRole = async (memberId, newRole) => {
    try {
      await api.put(`/forms/${id}/members/${memberId}`, { role: newRole })
      setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m))
      setMessage({ type: 'success', text: 'Role updated successfully' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to update role:', error)
      setMessage({ type: 'error', text: 'Failed to update role' })
    }
  }

  const cancelInvite = async (inviteId) => {
    try {
      await api.delete(`/forms/${id}/invites/${inviteId}`)
      setInvites(invites.filter(i => i.id !== inviteId))
      setMessage({ type: 'success', text: 'Invitation cancelled' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    } catch (error) {
      console.error('Failed to cancel invite:', error)
      setMessage({ type: 'error', text: 'Failed to cancel invitation' })
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!form) {
    return <div className="loading">Form not found</div>
  }

  return (
    <div className="team-collaboration">
      <header className="team-header">
        <div className="container">
          <div className="header-content">
            <button className="btn btn-secondary" onClick={() => navigate(`/form/${id}`)}>
              <ArrowLeft size={18} />
              Back to Form
            </button>
            <h1>{form.title} - Team Collaboration</h1>
            <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
              <UserPlus size={18} />
              Invite Member
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {/* Team Members */}
        <section className="team-section">
          <div className="section-header">
            <Users size={24} />
            <h2>Team Members</h2>
          </div>
          <div className="members-list">
            {members.length === 0 ? (
              <div className="empty-state">
                <p>No team members yet. Invite someone to collaborate!</p>
              </div>
            ) : (
              members.map(member => (
                <div key={member.id} className="member-card">
                  <div className="member-info">
                    <div className="member-avatar">
                      {member.name?.charAt(0).toUpperCase() || member.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="member-name">{member.name || member.email}</div>
                      <div className="member-email">{member.email}</div>
                    </div>
                  </div>
                  <div className="member-actions">
                    <select
                      className="input role-select"
                      value={member.role || 'viewer'}
                      onChange={(e) => updateMemberRole(member.id, e.target.value)}
                      disabled={member.isOwner}
                    >
                      <option value="owner">Owner</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {!member.isOwner && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Pending Invitations */}
        {invites.length > 0 && (
          <section className="team-section">
            <div className="section-header">
              <Mail size={24} />
              <h2>Pending Invitations</h2>
            </div>
            <div className="invites-list">
              {invites.map(invite => (
                <div key={invite.id} className="invite-card">
                  <div className="invite-info">
                    <Mail size={20} />
                    <div>
                      <div className="invite-email">{invite.email}</div>
                      <div className="invite-role">Role: {invite.role}</div>
                      <div className="invite-date">
                        Sent: {new Date(invite.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => cancelInvite(invite.id)}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Role Permissions Info */}
        <section className="team-section">
          <div className="section-header">
            <Shield size={24} />
            <h2>Role Permissions</h2>
          </div>
          <div className="permissions-info">
            <div className="permission-item">
              <div className="permission-role">
                <Shield size={20} />
                <strong>Owner</strong>
              </div>
              <ul>
                <li>Full access to form</li>
                <li>Can edit, delete, and manage team</li>
                <li>Can change settings</li>
              </ul>
            </div>
            <div className="permission-item">
              <div className="permission-role">
                <Edit size={20} />
                <strong>Editor</strong>
              </div>
              <ul>
                <li>Can edit form fields and settings</li>
                <li>Can view submissions</li>
                <li>Cannot delete form or manage team</li>
              </ul>
            </div>
            <div className="permission-item">
              <div className="permission-role">
                <Eye size={20} />
                <strong>Viewer</strong>
              </div>
              <ul>
                <li>Can view form and submissions</li>
                <li>Cannot make any changes</li>
                <li>Read-only access</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal invite-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invite Team Member</h2>
              <button className="close-btn" onClick={() => setShowInviteModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  className="input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  className="input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="editor">Editor - Can edit form</option>
                  <option value="viewer">Viewer - Read only</option>
                </select>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={sendInvite}>
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

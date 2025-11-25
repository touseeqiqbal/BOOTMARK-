import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText, Search, Download, ExternalLink } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers')
      setCustomers(response.data)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (customer) => {
    setSelectedCustomer(customer)
    setEditForm({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || ''
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    try {
      await api.put(`/customers/${selectedCustomer.id}`, editForm)
      setShowEditModal(false)
      fetchCustomers()
    } catch (error) {
      console.error('Failed to update customer:', error)
      alert('Failed to update customer')
    }
  }

  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return
    
    try {
      await api.delete(`/customers/${customerId}`)
      fetchCustomers()
    } catch (error) {
      console.error('Failed to delete customer:', error)
      alert('Failed to delete customer')
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'Submissions', 'Created At'].join(','),
      ...customers.map(c => [
        `"${c.name || ''}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.address || ''}"`,
        c.submissionCount || 0,
        c.createdAt || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm)
  )

  if (loading) {
    return <div className="loading">Loading customers...</div>
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="dashboard-brand">
              <img src={logo} alt="BootMark Logo" className="brand-logo" />
              <div className="brand-text">
                <h1 className="brand-title">BootMark Landscaping Management</h1>
                <span className="brand-subtitle">Customer Portal</span>
              </div>
            </div>
            <div className="header-actions">
              <span className="user-name">{user?.name || user?.email}</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </button>
              <button className="btn btn-secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Customers ({customers.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {filteredCustomers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No customers found</p>
            {searchTerm && <p style={{ fontSize: '14px', marginTop: '8px' }}>Try adjusting your search</p>}
          </div>
        ) : (
          <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="form-card" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>{customer.name}</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEdit(customer)
                      }}
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="btn btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(customer.id)
                      }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
                  {customer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Mail size={14} />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Phone size={14} />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div style={{ marginBottom: '6px' }}>
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                    <FileText size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    {customer.submissionCount || 0} submissions
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/customer/${customer.id}/submissions`)}
                  >
                    View Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Customer</h2>
            <div style={{ marginBottom: '16px' }}>
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>Address</label>
              <textarea
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '60px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label>Notes</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


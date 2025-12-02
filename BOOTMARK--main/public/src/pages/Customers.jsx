import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText, Search, Download, ExternalLink, GitMerge, Upload, Square, CheckSquare } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [sourceCustomerForMerge, setSourceCustomerForMerge] = useState(null)
  const [merging, setMerging] = useState(false)
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [accessDenied, setAccessDenied] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission(user, 'customers')) {
        setAccessDenied(true)
        setLoading(false)
      } else {
        setAccessDenied(false)
        fetchCustomers()
      }
    }
  }, [authLoading, user])

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
      setSelectedCustomers(prev => {
        const next = new Set(prev)
        next.delete(customerId)
        return next
      })
      fetchCustomers()
    } catch (error) {
      console.error('Failed to delete customer:', error)
      alert('Failed to delete customer')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCustomers.size === 0) return
    const count = selectedCustomers.size
    if (!confirm(`Are you sure you want to delete ${count} customer(s)?`)) return
    
    try {
      await Promise.all(Array.from(selectedCustomers).map(id => api.delete(`/customers/${id}`)))
      setSelectedCustomers(new Set())
      setShowBulkActions(false)
      fetchCustomers()
      alert(`Successfully deleted ${count} customer(s)`)
    } catch (error) {
      console.error('Failed to delete customers:', error)
      alert('Failed to delete some customers')
    }
  }

  const handleBulkExport = () => {
    if (selectedCustomers.size === 0) return
    
    const selected = customers.filter(c => selectedCustomers.has(c.id))
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Address', 'Submissions', 'Created At'].join(','),
      ...selected.map(c => [
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
    a.download = `customers-selected-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // Skip header row
      const dataRows = lines.slice(1)
      let imported = 0
      let errors = 0

      for (const row of dataRows) {
        try {
          const values = row.split(',').map(v => v.replace(/"/g, '').trim())
          const customerData = {
            name: values[0] || '',
            email: values[1] || '',
            phone: values[2] || '',
            address: values[3] || ''
          }

          if (!customerData.name) {
            errors++
            continue
          }

          await api.post('/customers', customerData)
          imported++
        } catch (err) {
          console.error('Error importing row:', err)
          errors++
        }
      }

      alert(`Import complete: ${imported} imported, ${errors} errors`)
      fetchCustomers()
    } catch (error) {
      console.error('Failed to import customers:', error)
      alert('Failed to import customers. Please check the file format.')
    }
    
    event.target.value = ''
  }

  const handleSelectAll = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.id)))
      setShowBulkActions(true)
    }
  }

  const handleToggleSelect = (customerId) => {
    setSelectedCustomers(prev => {
      const next = new Set(prev)
      if (next.has(customerId)) {
        next.delete(customerId)
      } else {
        next.add(customerId)
      }
      if (next.size === 0) {
        setShowBulkActions(false)
      } else {
        setShowBulkActions(true)
      }
      return next
    })
  }

  const handleMerge = (sourceCustomer) => {
    setSourceCustomerForMerge(sourceCustomer)
    setShowMergeModal(true)
  }

  const handleConfirmMerge = async (targetCustomerId) => {
    if (!sourceCustomerForMerge) return
    
    if (!confirm(`Are you sure you want to merge "${sourceCustomerForMerge.name}" into the selected customer? This will update all submissions and invoices.`)) {
      return
    }

    setMerging(true)
    try {
      const response = await api.post('/customers/merge', {
        sourceCustomerId: sourceCustomerForMerge.id,
        targetCustomerId: targetCustomerId
      })
      
      if (response.data.success) {
        alert(`Successfully merged customers! Updated ${response.data.updatedSubmissions} submissions and ${response.data.updatedInvoices} invoices.`)
        setShowMergeModal(false)
        setSourceCustomerForMerge(null)
        fetchCustomers()
      } else {
        throw new Error(response.data.error || 'Merge failed')
      }
    } catch (error) {
      console.error('Failed to merge customers:', error)
      alert(error.response?.data?.error || error.message || 'Failed to merge customers')
    } finally {
      setMerging(false)
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

  if (authLoading || loading) {
    return <div className="loading">Loading customers...</div>
  }

  if (accessDenied) {
    return (
      <div className="dashboard">
        <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <Users size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
          <h2>You don&apos;t have permission to view customers.</h2>
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            Contact your workspace admin to request access.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
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
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={18} />
              Import CSV
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={18} />
              Export All CSV
            </button>
          </div>
        </div>

        {showBulkActions && selectedCustomers.size > 0 && (
          <div style={{ 
            padding: '12px 16px', 
            backgroundColor: '#eff6ff', 
            borderRadius: '8px', 
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '500' }}>
              {selectedCustomers.size} customer(s) selected
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleBulkExport}>
                <Download size={16} />
                Export Selected
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <Trash2 size={16} />
                Delete Selected
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                setSelectedCustomers(new Set())
                setShowBulkActions(false)
              }}>
                Clear Selection
              </button>
            </div>
          </div>
        )}

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
          <>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn btn-link btn-sm"
                onClick={handleSelectAll}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
              >
                {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
                {selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filteredCustomers.map((customer) => {
                const isSelected = selectedCustomers.has(customer.id)
                return (
                  <div key={customer.id} className="form-card" style={{ cursor: 'pointer', position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      left: '12px', 
                      zIndex: 10 
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(customer.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', paddingLeft: '32px' }}>
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
                        handleMerge(customer)
                      }}
                      title="Merge with another customer"
                      style={{ color: '#3b82f6' }}
                    >
                      <GitMerge size={16} />
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
                )
              })}
            </div>
          </>
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

      {showMergeModal && sourceCustomerForMerge && (
        <div className="modal-overlay" onClick={() => !merging && setShowMergeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <h2>Merge Customer</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              Select the customer to merge <strong>"{sourceCustomerForMerge.name}"</strong> into. 
              All submissions and invoices will be updated to point to the selected customer.
            </p>
            
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <strong>Source Customer (will be merged):</strong>
              <div style={{ marginTop: '8px' }}>
                <div><strong>Name:</strong> {sourceCustomerForMerge.name}</div>
                {sourceCustomerForMerge.email && <div><strong>Email:</strong> {sourceCustomerForMerge.email}</div>}
                {sourceCustomerForMerge.phone && <div><strong>Phone:</strong> {sourceCustomerForMerge.phone}</div>}
                <div><strong>Submissions:</strong> {sourceCustomerForMerge.submissionCount || 0}</div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Select Target Customer (will keep this one):
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleConfirmMerge(e.target.value)
                  }
                }}
                disabled={merging}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">-- Select customer to merge into --</option>
                {customers
                  .filter(c => c.id !== sourceCustomerForMerge.id)
                  .map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.email ? `(${customer.email})` : ''} - {customer.submissionCount || 0} submissions
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowMergeModal(false)
                  setSourceCustomerForMerge(null)
                }}
                disabled={merging}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { FileText, Plus, Edit, Trash2, Send, Download, Search, CheckCircle, XCircle, Clock } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: '',
    invoiceNumber: '',
    items: [{ name: '', description: '', quantity: 1, price: 0 }],
    notes: '',
    dueDate: ''
  })
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [invoicesRes, customersRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers')
      ])
      setInvoices(invoicesRes.data)
      setCustomers(customersRes.data)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setInvoiceForm({
      customerId: '',
      invoiceNumber: `INV-${Date.now()}`,
      items: [{ name: '', description: '', quantity: 1, price: 0 }],
      notes: '',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    setShowCreateModal(true)
  }

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice)
    setInvoiceForm({
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      items: invoice.items || [{ name: '', description: '', quantity: 1, price: 0 }],
      notes: invoice.notes || '',
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : ''
    })
    setShowEditModal(true)
  }

  const handleSave = async () => {
    try {
      if (selectedInvoice) {
        await api.put(`/invoices/${selectedInvoice.id}`, invoiceForm)
      } else {
        await api.post('/invoices', invoiceForm)
      }
      setShowCreateModal(false)
      setShowEditModal(false)
      setSelectedInvoice(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save invoice:', error)
      alert('Failed to save invoice')
    }
  }

  const handleDelete = async (invoiceId) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return
    
    try {
      await api.delete(`/invoices/${invoiceId}`)
      fetchData()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const handleSendToQuickBooks = async (invoiceId) => {
    try {
      const response = await api.post(`/quickbooks/invoice/${invoiceId}/send`)
      alert('Invoice sent to QuickBooks successfully!')
      fetchData()
    } catch (error) {
      console.error('Failed to send invoice to QuickBooks:', error)
      alert(error.response?.data?.error || 'Failed to send invoice to QuickBooks')
    }
  }

  const handleExportPDF = async (invoice) => {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      const customer = customers.find(c => c.id === invoice.customerId)
      
      // Header
      doc.setFontSize(20)
      doc.text('INVOICE', 14, 20)
      doc.setFontSize(12)
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 14, 30)
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 14, 36)
      if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 14, 42)
      }
      
      // Customer info
      let yPos = 60
      if (customer) {
        doc.setFontSize(14)
        doc.text('Bill To:', 14, yPos)
        doc.setFontSize(11)
        yPos += 7
        doc.text(customer.name, 14, yPos)
        yPos += 6
        if (customer.email) {
          doc.text(customer.email, 14, yPos)
          yPos += 6
        }
        if (customer.address) {
          doc.text(customer.address, 14, yPos)
          yPos += 6
        }
      }
      
      yPos += 10
      // Items table
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Description', 14, yPos)
      doc.text('Qty', 120, yPos)
      doc.text('Price', 140, yPos)
      doc.text('Amount', 170, yPos)
      
      yPos += 7
      doc.setLineWidth(0.5)
      doc.line(14, yPos, 190, yPos)
      yPos += 5
      
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      invoice.items.forEach(item => {
        doc.text(item.name || item.description || 'Item', 14, yPos)
        doc.text(String(item.quantity), 120, yPos)
        doc.text(`$${item.price.toFixed(2)}`, 140, yPos)
        doc.text(`$${(item.quantity * item.price).toFixed(2)}`, 170, yPos)
        yPos += 7
      })
      
      yPos += 5
      doc.line(14, yPos, 190, yPos)
      yPos += 8
      
      // Totals
      doc.setFont(undefined, 'bold')
      doc.text('Subtotal:', 140, yPos)
      doc.text(`$${invoice.subtotal.toFixed(2)}`, 170, yPos)
      yPos += 7
      doc.text('Tax:', 140, yPos)
      doc.text(`$${invoice.tax.toFixed(2)}`, 170, yPos)
      yPos += 7
      doc.setFontSize(12)
      doc.text('Total:', 140, yPos)
      doc.text(`$${invoice.total.toFixed(2)}`, 170, yPos)
      
      if (invoice.notes) {
        yPos += 15
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        doc.text('Notes:', 14, yPos)
        yPos += 6
        const notesLines = doc.splitTextToSize(invoice.notes, 180)
        doc.text(notesLines, 14, yPos)
      }
      
      doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF')
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ['Invoice Number', 'Customer', 'Subtotal', 'Tax', 'Total', 'Status', 'Due Date', 'Created At'].join(','),
      ...invoices.map(inv => {
        const customer = customers.find(c => c.id === inv.customerId)
        return [
          `"${inv.invoiceNumber}"`,
          `"${customer?.name || 'Unknown'}"`,
          inv.subtotal.toFixed(2),
          inv.tax.toFixed(2),
          inv.total.toFixed(2),
          inv.status,
          inv.dueDate || '',
          inv.createdAt || ''
        ].join(',')
      })
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={16} color="#22c55e" />
      case 'sent':
        return <Send size={16} color="#3b82f6" />
      case 'overdue':
        return <XCircle size={16} color="#ef4444" />
      default:
        return <Clock size={16} color="#6b7280" />
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const customer = customers.find(c => c.id === invoice.customerId)
    return (
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (loading) {
    return <div className="loading">Loading invoices...</div>
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
                <span className="brand-subtitle">Invoice Management</span>
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
          <h2>Invoices ({invoices.length})</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              <Download size={18} />
              Export CSV
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={18} />
              Create Invoice
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px', position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search invoices..."
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

        {filteredInvoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p>No invoices found</p>
          </div>
        ) : (
          <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {filteredInvoices.map((invoice) => {
              const customer = customers.find(c => c.id === invoice.customerId)
              return (
                <div key={invoice.id} className="form-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px' }}>{invoice.invoiceNumber}</h3>
                      <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
                        {customer?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {getStatusIcon(invoice.status)}
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>{invoice.status}</span>
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Subtotal:</span>
                      <span style={{ fontSize: '12px' }}>${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>Tax:</span>
                      <span style={{ fontSize: '12px' }}>${invoice.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>Total:</span>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>${invoice.total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleExportPDF(invoice)}
                      title="Export PDF"
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleEdit(invoice)}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    {!invoice.quickbooksId && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleSendToQuickBooks(invoice.id)}
                        title="Send to QuickBooks"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    {invoice.quickbooksId && (
                      <span style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} />
                        Synced
                      </span>
                    )}
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleDelete(invoice.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
          setSelectedInvoice(null)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{selectedInvoice ? 'Edit Invoice' : 'Create Invoice'}</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label>Customer</label>
              <select
                value={invoiceForm.customerId}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Invoice Number</label>
              <input
                type="text"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Items</label>
              {invoiceForm.items.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => {
                      const newItems = [...invoiceForm.items]
                      newItems[idx].name = e.target.value
                      setInvoiceForm({ ...invoiceForm, items: newItems })
                    }}
                    style={{ width: '100%', padding: '6px', marginBottom: '6px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                  />
                  <textarea
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...invoiceForm.items]
                      newItems[idx].description = e.target.value
                      setInvoiceForm({ ...invoiceForm, items: newItems })
                    }}
                    style={{ width: '100%', padding: '6px', marginBottom: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '50px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...invoiceForm.items]
                        newItems[idx].quantity = parseFloat(e.target.value) || 0
                        setInvoiceForm({ ...invoiceForm, items: newItems })
                      }}
                      style={{ flex: 1, padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...invoiceForm.items]
                        newItems[idx].price = parseFloat(e.target.value) || 0
                        setInvoiceForm({ ...invoiceForm, items: newItems })
                      }}
                      style={{ flex: 1, padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                    />
                    {invoiceForm.items.length > 1 && (
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          const newItems = invoiceForm.items.filter((_, i) => i !== idx)
                          setInvoiceForm({ ...invoiceForm, items: newItems })
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, { name: '', description: '', quantity: 1, price: 0 }] })}
              >
                Add Item
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Due Date</label>
              <input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label>Notes</label>
              <textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '80px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                setShowCreateModal(false)
                setShowEditModal(false)
                setSelectedInvoice(null)
              }}>
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


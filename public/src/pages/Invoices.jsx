import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { FileText, Plus, Edit, Trash2, Send, Download, Search, CheckCircle, XCircle, Clock, Upload, Square, CheckSquare, CreditCard } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'

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
  const { user, logout, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [accessDenied, setAccessDenied] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission(user, 'invoices')) {
        setAccessDenied(true)
        setLoading(false)
      } else {
        setAccessDenied(false)
        fetchData()
      }
    }
  }, [authLoading, user])

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
      setSelectedInvoices(prev => {
        const next = new Set(prev)
        next.delete(invoiceId)
        return next
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      alert('Failed to delete invoice')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) return
    const count = selectedInvoices.size
    if (!confirm(`Are you sure you want to delete ${count} invoice(s)?`)) return
    
    try {
      await Promise.all(Array.from(selectedInvoices).map(id => api.delete(`/invoices/${id}`)))
      setSelectedInvoices(new Set())
      setShowBulkActions(false)
      fetchData()
      alert(`Successfully deleted ${count} invoice(s)`)
    } catch (error) {
      console.error('Failed to delete invoices:', error)
      alert('Failed to delete some invoices')
    }
  }

  const handleBulkExport = () => {
    if (selectedInvoices.size === 0) return
    
    const selected = invoices.filter(inv => selectedInvoices.has(inv.id))
    const csvContent = [
      ['Invoice Number', 'Customer', 'Subtotal', 'Tax', 'Total', 'Status', 'Due Date', 'Created At'].join(','),
      ...selected.map(inv => {
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
    a.download = `invoices-selected-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      
      // Skip header row
      const dataRows = lines.slice(1)
      let imported = 0
      let errors = 0

      for (const row of dataRows) {
        try {
          const values = row.split(',').map(v => v.replace(/"/g, '').trim())
          const invoiceData = {
            invoiceNumber: values[0] || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            customerId: '', // Will need to match by customer name
            subtotal: parseFloat(values[2]) || 0,
            tax: parseFloat(values[3]) || 0,
            total: parseFloat(values[4]) || 0,
            status: values[5] || 'draft',
            dueDate: values[6] || '',
            items: [{ name: 'Imported Item', quantity: 1, price: parseFloat(values[2]) || 0 }]
          }

          // Try to find customer by name
          const customerName = values[1]
          if (customerName) {
            const customer = customers.find(c => c.name === customerName)
            if (customer) {
              invoiceData.customerId = customer.id
            }
          }

          await api.post('/invoices', invoiceData)
          imported++
        } catch (err) {
          console.error('Error importing row:', err)
          errors++
        }
      }

      alert(`Import complete: ${imported} imported, ${errors} errors`)
      fetchData()
    } catch (error) {
      console.error('Failed to import invoices:', error)
      alert('Failed to import invoices. Please check the file format.')
    }
    
    // Reset file input
    event.target.value = ''
  }

  const handleSelectAll = () => {
    if (selectedInvoices.size === filteredInvoices.length) {
      setSelectedInvoices(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map(inv => inv.id)))
      setShowBulkActions(true)
    }
  }

  const handleToggleSelect = (invoiceId) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev)
      if (next.has(invoiceId)) {
        next.delete(invoiceId)
      } else {
        next.add(invoiceId)
      }
      if (next.size === 0) {
        setShowBulkActions(false)
      } else {
        setShowBulkActions(true)
      }
      return next
    })
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

  const handleSendEmail = async (invoice) => {
    const customer = customers.find(c => c.id === invoice.customerId)
    const email = prompt('Enter email address to send invoice:', customer?.email || '')
    
    if (!email || !email.includes('@')) {
      if (email !== null) {
        alert('Please enter a valid email address')
      }
      return
    }

    // Ask if user wants to include payment link
    const includePaymentLink = confirm('Include payment link in email? (Customer can pay online)')

    try {
      const response = await api.post(`/invoices/${invoice.id}/send`, { 
        to: email,
        includePaymentLink 
      })
      if (response.data.success) {
        alert('Invoice sent successfully!')
        fetchData()
      } else {
        alert(response.data.error || 'Failed to send invoice')
      }
    } catch (error) {
      console.error('Failed to send invoice:', error)
      alert(error.response?.data?.error || 'Failed to send invoice. Make sure SMTP is configured in Account Settings.')
    }
  }

  const handleCreatePaymentLink = async (invoice) => {
    try {
      const response = await api.post(`/payments/invoice/${invoice.id}/link`)
      if (response.data.success) {
        // Copy to clipboard
        navigator.clipboard.writeText(response.data.paymentUrl)
        alert('Payment link created and copied to clipboard!')
      } else {
        alert('Failed to create payment link')
      }
    } catch (error) {
      console.error('Failed to create payment link:', error)
      alert(error.response?.data?.error || 'Failed to create payment link. Make sure payment gateway is configured.')
    }
  }

  const handlePayNow = (invoice) => {
    // Create payment link and redirect
    api.post(`/payments/invoice/${invoice.id}/link`)
      .then(response => {
        if (response.data.success) {
          window.open(response.data.paymentUrl, '_blank')
        } else {
          alert('Failed to create payment link')
        }
      })
      .catch(error => {
        console.error('Failed to create payment link:', error)
        alert(error.response?.data?.error || 'Failed to create payment link')
      })
  }

  const formatMoney = (value = 0) => {
    const amount = Number(value || 0)
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const handleExportPDF = async (invoice) => {
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const autoTable = autoTableModule.default || autoTableModule
      const customer = customers.find(c => c.id === invoice.customerId)
      const items = invoice.items || []

      let branding = {}
      try {
        const accountRes = await api.get('/auth/account')
        const businessInfo = accountRes.data?.businessInfo || {}
        const companyName = accountRes.data?.companyName || ''
        // Use companyName from businessInfo first, then from account, then fallback
        branding = {
          ...businessInfo,
          companyName: businessInfo.companyName || companyName || businessInfo.firstName && businessInfo.lastName
            ? `${businessInfo.firstName} ${businessInfo.lastName}`
            : 'Your Business',
          companyEmail: businessInfo.companyEmail || businessInfo.email || '',
          companyPhone: businessInfo.companyPhone || businessInfo.phone || '',
          companyAddress: businessInfo.address || businessInfo.companyAddress || ''
        }
      } catch (error) {
        console.warn('Could not fetch account branding:', error)
      }

      const doc = new jsPDF({ unit: 'pt', format: 'letter' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const statusColors = {
        paid: { bg: [34, 197, 94], text: [255, 255, 255] },
        overdue: { bg: [248, 113, 113], text: [90, 15, 15] },
        sent: { bg: [191, 219, 254], text: [17, 24, 39] },
        draft: { bg: [229, 231, 235], text: [55, 65, 81] },
      }
      const statusStyle = statusColors[invoice.status] || statusColors.draft

      // Header
      doc.setFillColor(15, 23, 42)
      doc.rect(0, 0, pageWidth, 140, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(26)
      doc.text('INVOICE', 40, 70)

      // Company logo only (no company name text, no status button)
      if (branding.companyLogo) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, 4000)
            img.onload = () => {
              clearTimeout(timeout)
              const maxWidth = 140
              const maxHeight = 50
              let { width: logoWidth, height: logoHeight } = img
              const ratio = Math.min(maxWidth / logoWidth, maxHeight / logoHeight)
              logoWidth *= ratio
              logoHeight *= ratio
              let format = 'PNG'
              if (branding.companyLogo.startsWith('data:image/jpeg')) {
                format = 'JPEG'
              }
              doc.addImage(branding.companyLogo, format, pageWidth - logoWidth - 40, 30, logoWidth, logoHeight)
              resolve()
            }
            img.onerror = resolve
            img.src = branding.companyLogo
          })
        } catch (logoError) {
          console.warn('Failed to add logo:', logoError)
        }
      }

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 40, 100)
      doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 40, 118)
      if (invoice.dueDate) {
        doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`, 200, 118)
      }

      // Reset text color
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(12)

      // Billing + company blocks
      const startY = 170
      doc.setFontSize(14)
      doc.text('Bill To', 40, startY)
      doc.text('From', pageWidth / 2, startY)
      doc.setFontSize(11)

      if (customer) {
        doc.text(customer.name || '', 40, startY + 20)
        if (customer.email) doc.text(customer.email, 40, startY + 36)
        if (customer.address) doc.text(customer.address, 40, startY + 52)
        if (customer.phone) doc.text(customer.phone, 40, startY + 68)
      } else {
        doc.text('Unknown customer', 40, startY + 20)
      }

      doc.text(branding.companyName || 'Your Business', pageWidth / 2, startY + 20)
      if (branding.companyEmail) doc.text(branding.companyEmail, pageWidth / 2, startY + 36)
      if (branding.companyPhone) doc.text(branding.companyPhone, pageWidth / 2, startY + 52)
      if (branding.companyAddress) doc.text(branding.companyAddress, pageWidth / 2, startY + 68)

      // Items table
      autoTable(doc, {
        startY: startY + 90,
        head: [['Item', 'Qty', 'Rate', 'Amount']],
        body: items.map(item => [
          item.name || item.description || 'Item',
          item.quantity || 0,
          formatMoney(item.price || 0),
          formatMoney((item.quantity || 0) * (item.price || 0)),
        ]),
        styles: {
          fontSize: 11,
          cellPadding: 8,
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: 255,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        theme: 'grid',
        margin: { left: 40, right: 40 },
      })

      const tableBottom = doc.lastAutoTable.finalY + 20
      const totals = [
        ['Subtotal', formatMoney(invoice.subtotal || invoice.total || 0)],
        ['Tax', formatMoney(invoice.tax || 0)],
        ['Total', formatMoney(invoice.total || invoice.subtotal || 0)],
        ['Balance Due', formatMoney(invoice.balanceDue || invoice.total || 0)],
      ]

      totals.forEach(([label, value], index) => {
        const y = tableBottom + index * 18
        doc.setFont(index >= totals.length - 2 ? 'helvetica' : 'helvetica', index >= totals.length - 2 ? 'bold' : 'normal')
        doc.text(label, pageWidth - 220, y)
        doc.text(value, pageWidth - 60, y, { align: 'right' })
      })

      if (invoice.notes) {
        const notesY = tableBottom + totals.length * 18 + 20
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Notes', 40, notesY)
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(invoice.notes, pageWidth - 80)
        doc.text(noteLines, 40, notesY + 16)
      }

      // Add Pay Now button/link for unpaid invoices
      if (invoice.status !== 'paid') {
        try {
          // Generate payment link
          const paymentResponse = await api.post(`/payments/invoice/${invoice.id}/link`)
          if (paymentResponse.data.success) {
            const paymentUrl = paymentResponse.data.paymentUrl
            const paymentY = invoice.notes 
              ? tableBottom + totals.length * 18 + 20 + (doc.splitTextToSize(invoice.notes, pageWidth - 80).length * 12) + 40
              : tableBottom + totals.length * 18 + 40

            // Draw small Pay Now button
            doc.setFillColor(34, 197, 94) // Green color
            doc.roundedRect(40, paymentY, 120, 25, 3, 3, 'F')
            
            // Add Pay Now text with link
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text('Pay Now', 100, paymentY + 16, { align: 'center' })
            
            // Add clickable link area covering the button
            doc.link(40, paymentY, 120, 25, { url: paymentUrl })
            
            // Add payment URL text next to button (smaller, for reference)
            doc.setTextColor(79, 70, 229) // Blue color for link
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            const urlText = paymentUrl
            const urlLines = doc.splitTextToSize(urlText, pageWidth - 180)
            doc.text(urlLines, 180, paymentY + 12)
            
            // Make the URL text clickable too
            urlLines.forEach((line, index) => {
              const lineY = paymentY + 12 + (index * 10)
              doc.link(180, lineY - 8, pageWidth - 180, 8, { url: paymentUrl })
            })
            
            // Reset text color
            doc.setTextColor(15, 23, 42)
          }
        } catch (paymentError) {
          console.warn('Could not generate payment link for PDF:', paymentError)
          // Continue without payment link if generation fails
        }
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

  if (authLoading || loading) {
    return <div className="loading">Loading invoices...</div>
  }

  if (accessDenied) {
    return (
      <div className="dashboard">
        <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <FileText size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
          <h2>You don&apos;t have permission to view invoices.</h2>
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
              <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
              <div className="brand-text">
                <h1 className="brand-title">BOOTMARK</h1>
                <span className="brand-subtitle">Invoice Management</span>
              </div>
            </div>
            <div className="header-actions">
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
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={18} />
              Create Invoice
            </button>
          </div>
        </div>

        {showBulkActions && selectedInvoices.size > 0 && (
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
              {selectedInvoices.size} invoice(s) selected
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
                setSelectedInvoices(new Set())
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
          <>
            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                className="btn btn-link btn-sm"
                onClick={handleSelectAll}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
              >
                {selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0 ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
                {selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
              {filteredInvoices.map((invoice) => {
                const customer = customers.find(c => c.id === invoice.customerId)
                const isSelected = selectedInvoices.has(invoice.id)
                return (
                  <div key={invoice.id} className="form-card" style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', 
                      top: '12px', 
                      left: '12px', 
                      zIndex: 10 
                    }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(invoice.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', paddingLeft: '32px' }}>
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
                      className="btn btn-sm btn-primary"
                      onClick={() => handleSendEmail(invoice)}
                      title="Send via Email"
                    >
                      <Send size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleCreatePaymentLink(invoice)}
                      title="Copy Payment Link"
                    >
                      Copy Link
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
                        className="btn btn-sm btn-secondary"
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
          </>
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


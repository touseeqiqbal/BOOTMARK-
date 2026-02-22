import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import logo from '../assets/logo.jpeg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'
import InvoiceSettingsModal from '../components/InvoiceSettingsModal'
import PageHeader from '../components/ui/PageHeader'
import { useToast } from '../components/ui/Toast'
import { notifyInvoice } from '../utils/notificationService'
import ConfirmModal from '../components/ui/ConfirmModal'
import { FileText, Plus, Edit, Trash2, Send, Download, Search, CheckCircle, XCircle, Clock, Upload, Square, CheckSquare, CreditCard, Settings, Grid, List as ListIcon, Table as TableIcon } from 'lucide-react'
import FilterTabs from '../components/FilterTabs'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
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
  const toast = useToast()
  const [accessDenied, setAccessDenied] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [viewMode, setViewMode] = useState(localStorage.getItem('invoicesViewMode') || 'grid')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [showPaymentLinkConfirm, setShowPaymentLinkConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [emailInvoiceData, setEmailInvoiceData] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    if (!authLoading) {
      if (!hasPermission(user, 'invoices')) {
        setAccessDenied(true)
        setLoading(false)
      } else {
        setAccessDenied(false)
        fetchData()
        fetchSettings()
      }
    }
  }, [authLoading, user])

  const fetchSettings = async () => {
    try {
      const res = await api.get('/invoices/settings');
      if (res.data && res.data.defaultViewMode) {
        if (!localStorage.getItem('invoicesViewMode')) {
          setViewMode(res.data.defaultViewMode);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }

  const fetchData = async () => {
    try {
      const [invoicesRes, customersRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers')
      ])
      setInvoices(invoicesRes.data.data || invoicesRes.data.items || invoicesRes.data || [])
      setCustomers(customersRes.data.items || customersRes.data || [])
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
      toast.error('Failed to save invoice')
    }
  }

  const handleDelete = (invoiceId) => {
    setDeleteTarget(invoiceId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/invoices/${deleteTarget}`)
      setSelectedInvoices(prev => {
        const next = new Set(prev)
        next.delete(deleteTarget)
        return next
      })
      fetchData()
      setDeleteTarget(null)
      toast.success('Invoice deleted successfully')
    } catch (error) {
      console.error('Failed to delete invoice:', error)
      toast.error('Failed to delete invoice')
    }
  }

  const handleBulkDelete = () => {
    if (selectedInvoices.size === 0) return
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    const count = selectedInvoices.size
    try {
      await Promise.all(Array.from(selectedInvoices).map(id => api.delete(`/invoices/${id}`)))
      setSelectedInvoices(new Set())
      setShowBulkActions(false)
      fetchData()
      toast.success(`Successfully deleted ${count} invoice(s)`)
    } catch (error) {
      console.error('Failed to delete invoices:', error)
      toast.error('Failed to delete some invoices')
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

      toast.success(`Import complete: ${imported} imported, ${errors} errors`)
      fetchData()
    } catch (error) {
      console.error('Failed to import invoices:', error)
      toast.error('Failed to import invoices. Please check the file format.')
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
      toast.success('Invoice sent to QuickBooks successfully!')
      fetchData()
    } catch (error) {
      console.error('Failed to send invoice to QuickBooks:', error)
      toast.error(error.response?.data?.error || 'Failed to send invoice to QuickBooks')
    }
  }

  const handleSendEmail = (invoice) => {
    const customer = customers.find(c => c.id === invoice.customerId)
    const email = prompt('Enter email address to send invoice:', customer?.email || '')

    if (!email || !email.includes('@')) {
      if (email !== null) {
        toast.error('Please enter a valid email address')
      }
      return
    }

    // Store invoice data for confirmation modal
    setEmailInvoiceData({ invoice, email })
    setShowPaymentLinkConfirm(true)
  }

  const confirmSendInvoice = async (includePaymentLink) => {
    if (!emailInvoiceData) return
    const { invoice, email } = emailInvoiceData
    try {
      const response = await api.post(`/invoices/${invoice.id}/send`, {
        to: email,
        includePaymentLink
      })
      if (response.data.success) {
        toast.success('Invoice sent successfully!')
        fetchData()

        // Fire invoice \"sent\" notification
        try {
          const userIds = user?.uid ? [user.uid] : []
          const businessId = user?.businessId || null

          await notifyInvoice({
            event: 'sent',
            invoice,
            userIds,
            businessId,
            clientId: invoice.clientId
          })
        } catch (notifyError) {
          console.warn('Failed to send invoice sent notification:', notifyError)
        }

        setEmailInvoiceData(null)
      } else {
        toast.error(response.data.error || 'Failed to send invoice')
      }
    } catch (error) {
      console.error('Failed to send invoice:', error)
      toast.error(error.response?.data?.error || 'Failed to send invoice. Make sure SMTP is configured in Account Settings.')
    }
  }

  const handleCreatePaymentLink = async (invoice) => {
    try {
      const response = await api.post(`/payments/invoice/${invoice.id}/link`)
      if (response.data.success) {
        // Copy to clipboard
        navigator.clipboard.writeText(response.data.paymentUrl)
        toast.success('Payment link created and copied to clipboard!')
      } else {
        alert('Failed to create payment link')
      }
    } catch (error) {
      console.error('Failed to create payment link:', error)
      toast.error(error.response?.data?.error || 'Failed to create payment link. Make sure payment gateway is configured.')
    }
  }

  const handlePayNow = (invoice) => {
    // Create payment link and redirect
    api.post(`/payments/invoice/${invoice.id}/link`)
      .then(response => {
        if (response.data.success) {
          window.open(response.data.paymentUrl, '_blank')
        } else {
          toast.error('Failed to create payment link')
        }
      })
      .catch(error => {
        console.error('Failed to create payment link:', error)
        toast.error(error.response?.data?.error || 'Failed to create payment link')
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
      toast.error('Failed to export PDF')
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

  const getStatusBadge = (status) => {
    const badgeClass =
      status === 'paid' ? 'badge-success' :
        status === 'sent' ? 'badge-purple' :
          status === 'overdue' ? 'badge-error' :
            status === 'draft' ? 'badge-info' : 'badge-info';

    const statusIcons = {
      paid: CheckCircle,
      sent: Send,
      overdue: XCircle,
      draft: Clock
    };

    const Icon = statusIcons[status] || Clock;

    return (
      <span className={`badge ${badgeClass}`}>
        <Icon size={14} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  const filteredInvoices = invoices.filter(invoice => {
    const customer = customers.find(c => c.id === invoice.customerId)

    // Apply search filter
    const matchesSearch = (
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.status?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!matchesSearch) return false;

    // Apply tab filter
    if (activeFilter === 'all') return true;
    if (activeFilter === invoice.status) return true;
    return false;
  })

  // Define filter tabs
  const filterTabs = [
    { id: 'all', label: 'All Invoices', count: invoices.length },
    { id: 'draft', label: 'Draft', count: invoices.filter(i => i.status === 'draft').length },
    { id: 'sent', label: 'Sent', count: invoices.filter(i => i.status === 'sent').length },
    { id: 'paid', label: 'Paid', count: invoices.filter(i => i.status === 'paid').length },
    { id: 'overdue', label: 'Overdue', count: invoices.filter(i => i.status === 'overdue').length }
  ];

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
    <div className="dashboard animate-fadeIn">
      <PageHeader
        title="Invoices"
        subtitle={`${filteredInvoices.length} total billing records`}
        actions={
          <>
            <button className="btn-modern btn-modern-secondary" onClick={() => setShowSettingsModal(true)}>
              <Settings size={18} /> Settings
            </button>
            <label className="btn-modern btn-modern-secondary" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={18} /> Import
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>
            <button className="btn-modern btn-modern-secondary" onClick={handleExportCSV}>
              <Download size={18} /> Export
            </button>
            <button className="btn-modern btn-modern-primary" onClick={handleCreate}>
              <Plus size={18} /> Create Invoice
            </button>
          </>
        }
      >
        <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-modern"
                style={{ paddingLeft: '40px' }}
              />
            </div>
          </div>

          <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'grid', icon: Grid, label: 'Grid' },
              { id: 'list', icon: ListIcon, label: 'List' },
              { id: 'table', icon: TableIcon, label: 'Table' }
            ].map(view => (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id)}
                style={{
                  background: viewMode === view.id ? 'var(--bg-primary)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: viewMode === view.id ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  color: viewMode === view.id ? 'var(--primary-600)' : 'var(--text-tertiary)',
                  fontSize: '13px',
                  fontWeight: viewMode === view.id ? '700' : '500',
                  transition: 'all 0.2s'
                }}
                title={`${view.label} View`}
              >
                <view.icon size={16} />
                {view.label}
              </button>
            ))}
          </div>
        </div>
        <FilterTabs
          filters={filterTabs}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </PageHeader>

      <div className="container" style={{ paddingTop: 0, marginTop: '24px' }}>

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
            {viewMode === 'table' ? (
              <div className="modern-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48px', padding: '16px 20px' }}>
                        <label className="checkbox-custom">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                            onChange={handleSelectAll}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </th>
                      <th>Invoice Info</th>
                      <th>Status</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const customer = customers.find(c => c.id === invoice.customerId)
                      const isSelected = selectedInvoices.has(invoice.id)
                      return (
                        <tr key={invoice.id} className={isSelected ? 'selected' : ''}>
                          <td style={{ padding: '16px 20px' }}>
                            <label className="checkbox-custom">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(invoice.id)}
                              />
                              <span className="checkmark"></span>
                            </label>
                          </td>
                          <td>
                            <div style={{ fontWeight: '900', color: 'var(--primary-600)', fontSize: '15px' }}>{invoice.invoiceNumber}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{customer?.name || 'Unknown Customer'}</div>
                          </td>
                          <td>{getStatusBadge(invoice.status)}</td>
                          <td style={{ fontWeight: '600' }}>{formatMoney(invoice.subtotal)}</td>
                          <td style={{ fontWeight: '600' }}>{formatMoney(invoice.tax)}</td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--text-primary)', fontSize: '15px' }}>
                            {formatMoney(invoice.total)}
                          </td>
                          <td style={{ paddingRight: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleEdit(invoice)} title="Edit Configuration"><Edit size={16} /></button>
                              <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleExportPDF(invoice)} title="Download PDF"><Download size={16} /></button>
                              <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(invoice.id)} title="Archive Record"><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="forms-grid" style={{ gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                {filteredInvoices.map((invoice) => {
                  const customer = customers.find(c => c.id === invoice.customerId)
                  const isSelected = selectedInvoices.has(invoice.id)
                  return (
                    <div key={invoice.id} className="modern-card animate-fadeIn" style={{
                      position: 'relative',
                      padding: '24px',
                      border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                      boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                    }}>
                      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
                        <label className="checkbox-custom">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(invoice.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="checkmark"></span>
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px', paddingLeft: '40px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{invoice.invoiceNumber}</h3>
                          <p style={{ margin: '4px 0 0 0', color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>
                            {customer?.name || 'Unknown Entity'}
                          </p>
                        </div>
                        {getStatusBadge(invoice.status)}
                      </div>

                      <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Subtotal</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{formatMoney(invoice.subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>Tax / VAT</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>{formatMoney(invoice.tax)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border-color)', marginTop: '6px' }}>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-primary)' }}>Grand Total</span>
                          <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--primary-600)' }}>{formatMoney(invoice.total)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          className="btn-modern btn-modern-primary"
                          style={{ padding: '10px 16px', flex: 1, justifyContent: 'center' }}
                          onClick={() => handleSendEmail(invoice)}
                        >
                          <Send size={16} /> Dispatch
                        </button>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn-modern btn-modern-secondary" style={{ padding: '10px' }} onClick={() => handleExportPDF(invoice)} title="Export PDF"><Download size={18} /></button>
                          <button className="btn-modern btn-modern-secondary" style={{ padding: '10px' }} onClick={() => handleCreatePaymentLink(invoice)} title="Payment Link"><CreditCard size={18} /></button>
                          <button className="btn-modern btn-modern-secondary" style={{ padding: '10px' }} onClick={() => handleEdit(invoice)} title="Edit Record"><Edit size={18} /></button>
                          {!invoice.quickbooksId && (
                            <button className="btn-modern btn-modern-secondary" style={{ padding: '10px' }} onClick={() => handleSendToQuickBooks(invoice.id)} title="Sync QuickBooks">
                              <img src="https://quickbooks.intuit.com/favicon.ico" alt="QB" style={{ width: '18px', height: '18px' }} />
                            </button>
                          )}
                          <button className="btn-modern btn-modern-secondary" style={{ padding: '10px', color: 'var(--error-600)' }} onClick={() => handleDelete(invoice.id)} title="Delete"><Trash2 size={18} /></button>
                        </div>
                      </div>

                      {invoice.quickbooksId && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                          <div className="badge badge-success" style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '20px' }}>
                            <CheckCircle size={10} /> QUANTUM SYNCED
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
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
      <InvoiceSettingsModal
        show={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={(settings) => {
          fetchData();
          if (settings?.defaultViewMode) {
            setViewMode(settings.defaultViewMode);
            localStorage.setItem('invoicesViewMode', settings.defaultViewMode);
          }
        }}
      />

      {/* Delete Invoice Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Bulk Delete Invoices Confirmation Modal */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Invoices"
        message={`Are you sure you want to delete ${selectedInvoices.size} invoice(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Payment Link Confirmation Modal */}
      <ConfirmModal
        isOpen={showPaymentLinkConfirm}
        onClose={() => {
          setShowPaymentLinkConfirm(false);
          setEmailInvoiceData(null);
        }}
        onConfirm={() => confirmSendInvoice(true)}
        title="Send Invoice with Payment Link?"
        message="Do you want to include a payment link in the email? This allows the customer to pay online."
        confirmText="Yes, Include Link"
        cancelText="No, Send Without Link"
        variant="primary"
      />
    </div>
  )
}


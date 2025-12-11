import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText, Search, Download, ExternalLink, GitMerge, Upload, Square, CheckSquare, UserPlus } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'
import { exportToExcel, formatClientsForExcel } from '../utils/excelExport'

export default function Clients() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClient, setSelectedClient] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' })
    const [showMergeModal, setShowMergeModal] = useState(false)
    const [sourceClientForMerge, setSourceClientForMerge] = useState(null)
    const [merging, setMerging] = useState(false)
    const { user, logout, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [accessDenied, setAccessDenied] = useState(false)
    const [selectedClients, setSelectedClients] = useState(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)

    useEffect(() => {
        if (!authLoading) {
            // Use 'customers' permission for now as backend permission logic hasn't changed
            if (false && !hasPermission(user, 'customers')) {
                setAccessDenied(true)
                setLoading(false)
            } else {
                setAccessDenied(false)
                fetchClients()
            }
        }
    }, [authLoading, user])

    const fetchClients = async () => {
        try {
            // Backend still uses /customers
            const response = await api.get('/customers')
            setClients(response.data)
        } catch (error) {
            console.error('Failed to fetch clients:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (client) => {
        setSelectedClient(client)
        setEditForm({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || '',
            notes: client.notes || ''
        })
        setShowEditModal(true)
    }

    const handleSave = async () => {
        try {
            await api.put(`/customers/${selectedClient.id}`, editForm)
            setShowEditModal(false)
            fetchClients()
        } catch (error) {
            console.error('Failed to update client:', error)
            alert('Failed to update client')
        }
    }

    const handleDelete = async (clientId) => {
        if (!confirm('Are you sure you want to delete this client?')) return

        try {
            await api.delete(`/customers/${clientId}`)
            setSelectedClients(prev => {
                const next = new Set(prev)
                next.delete(clientId)
                return next
            })
            fetchClients()
        } catch (error) {
            console.error('Failed to delete client:', error)
            alert('Failed to delete client')
        }
    }

    const handleBulkDelete = async () => {
        if (selectedClients.size === 0) return
        const count = selectedClients.size
        if (!confirm(`Are you sure you want to delete ${count} client(s)?`)) return

        try {
            await Promise.all(Array.from(selectedClients).map(id => api.delete(`/customers/${id}`)))
            setSelectedClients(new Set())
            setShowBulkActions(false)
            fetchClients()
            alert(`Successfully deleted ${count} client(s)`)
        } catch (error) {
            console.error('Failed to delete clients:', error)
            alert('Failed to delete some clients')
        }
    }

    const handleBulkExport = () => {
        if (selectedClients.size === 0) return

        const selected = clients.filter(c => selectedClients.has(c.id))
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
        a.download = `clients-selected-${new Date().toISOString().split('T')[0]}.csv`
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
                    const clientData = {
                        name: values[0] || '',
                        email: values[1] || '',
                        phone: values[2] || '',
                        address: values[3] || ''
                    }

                    if (!clientData.name) {
                        errors++
                        continue
                    }

                    await api.post('/customers', clientData)
                    imported++
                } catch (err) {
                    console.error('Error importing row:', err)
                    errors++
                }
            }

            alert(`Import complete: ${imported} imported, ${errors} errors`)
            fetchClients()
        } catch (error) {
            console.error('Failed to import clients:', error)
            alert('Failed to import clients. Please check the file format.')
        }

        event.target.value = ''
    }

    const handleSelectAll = () => {
        if (selectedClients.size === filteredClients.length) {
            setSelectedClients(new Set())
            setShowBulkActions(false)
        } else {
            setSelectedClients(new Set(filteredClients.map(c => c.id)))
            setShowBulkActions(true)
        }
    }

    const handleToggleSelect = (clientId) => {
        setSelectedClients(prev => {
            const next = new Set(prev)
            if (next.has(clientId)) {
                next.delete(clientId)
            } else {
                next.add(clientId)
            }
            if (next.size === 0) {
                setShowBulkActions(false)
            } else {
                setShowBulkActions(true)
            }
            return next
        })
    }

    const handleMerge = (sourceClient) => {
        setSourceClientForMerge(sourceClient)
        setShowMergeModal(true)
    }

    const handleConfirmMerge = async (targetClientId) => {
        if (!sourceClientForMerge) return

        if (!confirm(`Are you sure you want to merge "${sourceClientForMerge.name}" into the selected client? This will update all submissions and invoices.`)) {
            return
        }

        setMerging(true)
        try {
            const response = await api.post('/customers/merge', {
                sourceCustomerId: sourceClientForMerge.id,
                targetCustomerId: targetClientId
            })

            if (response.data.success) {
                alert(`Successfully merged clients! Updated ${response.data.updatedSubmissions} submissions and ${response.data.updatedInvoices} invoices.`)
                setShowMergeModal(false)
                setSourceClientForMerge(null)
                fetchClients()
            } else {
                throw new Error(response.data.error || 'Merge failed')
            }
        } catch (error) {
            console.error('Failed to merge clients:', error)
            alert(error.response?.data?.error || error.message || 'Failed to merge clients')
        } finally {
            setMerging(false)
        }
    }

    const handleExportCSV = () => {
        const csvContent = [
            ['Name', 'Email', 'Phone', 'Address', 'Submissions', 'Created At'].join(','),
            ...clients.map(c => [
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
        a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const handleExportExcel = () => {
        const formattedData = formatClientsForExcel(clients)
        exportToExcel(formattedData, `clients-${new Date().toISOString().split('T')[0]}`, 'Clients')
    }

    const filteredClients = clients.filter(client =>
        client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone?.includes(searchTerm)
    )

    if (authLoading || loading) {
        return <div className="loading">Loading clients...</div>
    }

    if (accessDenied) {
        return (
            <div className="dashboard">
                <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <Users size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
                    <h2>You don&apos;t have permission to view clients.</h2>
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
                                <span className="brand-subtitle">Client Portal</span>
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
                    <h2>Clients ({clients.length})</h2>
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
                            Export CSV
                        </button>
                        <button className="btn btn-secondary" onClick={handleExportExcel}>
                            <Download size={18} />
                            Export Excel
                        </button>
                    </div>
                </div>

                {showBulkActions && selectedClients.size > 0 && (
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
                            {selectedClients.size} client(s) selected
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
                                setSelectedClients(new Set())
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
                        placeholder="Search clients by name, email, or phone..."
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

                {filteredClients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>No clients found</p>
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
                                {selectedClients.size === filteredClients.length && filteredClients.length > 0 ? (
                                    <CheckSquare size={18} />
                                ) : (
                                    <Square size={18} />
                                )}
                                {selectedClients.size === filteredClients.length && filteredClients.length > 0 ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                            {filteredClients.map((client) => {
                                const isSelected = selectedClients.has(client.id)
                                return (
                                    <div key={client.id} className="form-card" style={{ cursor: 'pointer', position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            left: '12px',
                                            zIndex: 10
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(client.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', paddingLeft: '32px' }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>{client.name}</h3>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEdit(client)
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleMerge(client)
                                                    }}
                                                    title="Merge with another client"
                                                    style={{ color: '#3b82f6' }}
                                                >
                                                    <GitMerge size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDelete(client.id)
                                                    }}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '12px', color: '#6b7280', fontSize: '14px' }}>
                                            {client.email && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <Mail size={14} />
                                                    <span>{client.email}</span>
                                                </div>
                                            )}
                                            {client.phone && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                    <Phone size={14} />
                                                    <span>{client.phone}</span>
                                                </div>
                                            )}
                                            {client.address && (
                                                <div style={{ marginBottom: '6px' }}>
                                                    <span>{client.address}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    navigate(`/clients/${client.id}`)
                                                }}
                                            >
                                                View Profile
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => navigate(`/customer/${client.id}/submissions`)}
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
                        <h2>Edit Client</h2>
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

            {showMergeModal && sourceClientForMerge && (
                <div className="modal-overlay" onClick={() => !merging && setShowMergeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>Merge Client</h2>
                        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                            Select the client to merge <strong>"{sourceClientForMerge.name}"</strong> into.
                            All submissions and invoices will be updated to point to the selected client.
                        </p>

                        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                            <strong>Source Client (will be merged):</strong>
                            <div style={{ marginTop: '8px' }}>
                                <div><strong>Name:</strong> {sourceClientForMerge.name}</div>
                                {sourceClientForMerge.email && <div><strong>Email:</strong> {sourceClientForMerge.email}</div>}
                                {sourceClientForMerge.phone && <div><strong>Phone:</strong> {sourceClientForMerge.phone}</div>}
                                <div><strong>Submissions:</strong> {sourceClientForMerge.submissionCount || 0}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                Select Target Client (will keep this one):
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
                                <option value="">-- Select client to merge into --</option>
                                {clients
                                    .filter(c => c.id !== sourceClientForMerge.id)
                                    .map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.email ? `(${client.email})` : ''} - {client.submissionCount || 0} submissions
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowMergeModal(false)
                                    setSourceClientForMerge(null)
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

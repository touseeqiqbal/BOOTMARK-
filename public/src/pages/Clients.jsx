import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText, Search, Download, ExternalLink, GitMerge, Upload, Square, CheckSquare, UserPlus, Grid3x3, List, Table2 } from 'lucide-react'
import logo from '../assets/logo.svg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'
import { exportToExcel, formatClientsForExcel } from '../utils/excelExport'
import SearchBar from '../components/SearchBar'

export default function Clients() {
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClient, setSelectedClient] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '', notes: '', city: '', state: '', zip: '' })
    const [properties, setProperties] = useState([])
    const [showMergeModal, setShowMergeModal] = useState(false)
    const [sourceClientForMerge, setSourceClientForMerge] = useState(null)
    const [merging, setMerging] = useState(false)
    const { user, logout, loading: authLoading } = useAuth()
    const navigate = useNavigate()
    const [accessDenied, setAccessDenied] = useState(false)
    const [selectedClients, setSelectedClients] = useState(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)
    const [viewMode, setViewMode] = useState(localStorage.getItem('clientsViewMode') || 'grid')

    useEffect(() => {
        if (!authLoading) {
            // Use 'customers' permission for now as backend permission logic hasn't changed
            if (false && !hasPermission(user, 'customers')) {
                setAccessDenied(true)
                setLoading(false)
            } else {
                setAccessDenied(false)
                fetchClients()
                fetchProperties()
            }
        }
    }, [authLoading, user])

    const fetchProperties = async () => {
        try {
            const response = await api.get('/properties')
            setProperties(response.data)
        } catch (error) {
            console.error('Failed to fetch properties:', error)
        }
    }

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
            city: client.city || '',
            state: client.state || '',
            zip: client.zip || '',
            notes: client.notes || ''
        })
        setShowEditModal(true)
    }

    const handlePropertySelect = (e) => {
        const propId = e.target.value;
        if (!propId) return;

        const prop = properties.find(p => p.id === propId);
        if (prop) {
            setEditForm(prev => ({
                ...prev,
                address: prop.address || '',
                city: prop.city || '',
                state: prop.state || '',
                zip: prop.zip || ''
            }));
        }
    };

    const handleSave = async () => {
        try {
            if (selectedClient) {
                // Editing existing client
                await api.put(`/customers/${selectedClient.id}`, editForm)
            } else {
                // Creating new client
                await api.post('/customers', editForm)
            }
            setShowEditModal(false)
            setSelectedClient(null)
            setEditForm({ name: '', email: '', phone: '', address: '', notes: '', city: '', state: '', zip: '' })
            fetchClients()
        } catch (error) {
            console.error('Failed to save client:', error)
            alert('Failed to save client')
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

    const handleViewChange = (newView) => {
        setViewMode(newView)
        localStorage.setItem('clientsViewMode', newView)
    }

    const filteredClients = clients.filter(client => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            client.name?.toLowerCase().includes(search) ||
            client.email?.toLowerCase().includes(search) ||
            client.phone?.toLowerCase().includes(search) ||
            client.address?.toLowerCase().includes(search)
        );
    });

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
                        <h2>Clients ({filteredClients.length})</h2>
                        <SearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search clients by name, email, phone, or address..."
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* View Toggle */}
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '4px',
                            background: 'white'
                        }}>
                            <button
                                onClick={() => handleViewChange('grid')}
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: viewMode === 'grid' ? '#eff6ff' : 'transparent',
                                    color: viewMode === 'grid' ? '#2563eb' : '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Grid View"
                            >
                                <Grid3x3 size={18} />
                            </button>
                            <button
                                onClick={() => handleViewChange('list')}
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: viewMode === 'list' ? '#eff6ff' : 'transparent',
                                    color: viewMode === 'list' ? '#2563eb' : '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="List View"
                            >
                                <List size={18} />
                            </button>
                            <button
                                onClick={() => handleViewChange('table')}
                                style={{
                                    padding: '8px 12px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    background: viewMode === 'table' ? '#eff6ff' : 'transparent',
                                    color: viewMode === 'table' ? '#2563eb' : '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                                title="Table View"
                            >
                                <Table2 size={18} />
                            </button>
                        </div>
                        <button className="btn btn-primary" onClick={() => {
                            setSelectedClient(null)
                            setEditForm({ name: '', email: '', phone: '', address: '', notes: '' })
                            setShowEditModal(true)
                        }}>
                            <UserPlus size={18} />
                            New Client
                        </button>
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

                        {/* Grid View */}
                        {viewMode === 'grid' && (
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
                        )}

                        {/* List View */}
                        {viewMode === 'list' && (
                            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                {filteredClients.map((client) => {
                                    const isSelected = selectedClients.has(client.id)
                                    return (
                                        <div
                                            key={client.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '16px',
                                                borderBottom: '1px solid #f3f4f6',
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(client.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', marginRight: '16px' }}
                                            />
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 1fr', gap: '16px', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{client.name}</div>
                                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{client.email || 'No email'}</div>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    <Phone size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                    {client.phone || 'No phone'}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {client.address || 'No address'}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    {client.submissionCount || 0} submissions
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
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
                                                        navigate(`/clients/${client.id}`)
                                                    }}
                                                    title="View Profile"
                                                >
                                                    <ExternalLink size={16} />
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
                                    )
                                })}
                            </div>
                        )}

                        {/* Table View */}
                        {viewMode === 'table' && (
                            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                                                    onChange={handleSelectAll}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            </th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Email</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Phone</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Address</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Submissions</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.map((client) => {
                                            const isSelected = selectedClients.has(client.id)
                                            return (
                                                <tr
                                                    key={client.id}
                                                    style={{ borderBottom: '1px solid #f3f4f6', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                >
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(client.id)}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: '500', fontSize: '14px' }}>{client.name}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{client.email || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{client.phone || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {client.address || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{client.submissionCount || 0}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="btn btn-icon"
                                                                onClick={() => handleEdit(client)}
                                                                title="Edit"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                className="btn btn-icon"
                                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                                title="View Profile"
                                                            >
                                                                <ExternalLink size={16} />
                                                            </button>
                                                            <button
                                                                className="btn btn-icon"
                                                                onClick={() => handleDelete(client.id)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{selectedClient ? 'Edit Client' : 'New Client'}</h2>
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
                            <label style={{ display: 'block', marginBottom: '4px' }}>Select Existing Property (Optional)</label>
                            <select
                                onChange={handlePropertySelect}
                                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            >
                                <option value="">-- New Address --</option>
                                {properties.map(prop => (
                                    <option key={prop.id} value={prop.id}>
                                        {prop.address}{prop.city ? `, ${prop.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>Street Address</label>
                            <input
                                type="text"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                placeholder="Street Address"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label>City</label>
                                <input
                                    type="text"
                                    value={editForm.city}
                                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                    placeholder="City"
                                />
                            </div>
                            <div>
                                <label>State</label>
                                <input
                                    type="text"
                                    value={editForm.state}
                                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                    placeholder="State"
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px', maxWidth: '50%' }}>
                            <label>ZIP Code</label>
                            <input
                                type="text"
                                value={editForm.zip}
                                onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                placeholder="ZIP"
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

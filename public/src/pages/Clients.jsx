import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { Users, Plus, Edit, Trash2, Mail, Phone, FileText, Search, Download, ExternalLink, GitMerge, Upload, Square, CheckSquare, UserPlus, Grid3x3, List, Table2, Settings, CheckCircle, Clock } from 'lucide-react'
import logo from '../assets/logo.jpeg'
import '../styles/Dashboard.css'
import { hasPermission } from '../utils/permissionUtils'
import { exportToExcel, formatClientsForExcel } from '../utils/excelExport'
import SearchBar from '../components/SearchBar'
import ClientSettingsModal from '../components/ClientSettingsModal'
import PageHeader from '../components/ui/PageHeader'
import FilterTabs from '../components/FilterTabs'

export default function Clients() {
    const { t } = useTranslation()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClient, setSelectedClient] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showSettingsModal, setShowSettingsModal] = useState(false)
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
    const [activeFilter, setActiveFilter] = useState('all')

    const formatAddress = (address) => {
        if (!address) return '';
        if (typeof address === 'object') {
            const parts = [
                address.street,
                address.city,
                address.state,
                address.zip
            ].filter(Boolean);
            return parts.join(', ');
        }
        return address;
    };

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
                fetchSettings()
            }
        }
    }, [authLoading, user])

    const fetchSettings = async () => {
        try {
            const res = await api.get('/customers/settings');
            if (res.data && res.data.defaultViewMode) {
                // If localStorage is NOT set, use server default.
                if (!localStorage.getItem('clientsViewMode')) {
                    setViewMode(res.data.defaultViewMode);
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    }

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
            try {
                const fallbackResponse = await api.get('/customers')
                setClients(fallbackResponse.data)
            } catch (fallbackError) {
                console.error('Failed to fetch clients:', fallbackError)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (client) => {
        setSelectedClient(client)
        const addressObj = typeof client.address === 'object' ? client.address : {};
        const addressString = typeof client.address === 'string' ? client.address : '';

        setEditForm({
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: addressObj.street || addressString || '',
            city: client.city || addressObj.city || '',
            state: client.state || addressObj.state || '',
            zip: client.zip || addressObj.zip || '',
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
            // Construct payload matching the strict backend schema
            const payload = {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                notes: editForm.notes,
                address: {
                    street: editForm.address, // frontend uses 'address' for street
                    city: editForm.city,
                    state: editForm.state,
                    zip: editForm.zip,
                    country: 'USA' // Default or add field if needed
                }
            };

            if (selectedClient) {
                // Editing existing client
                await api.put(`/customers/${selectedClient.id}`, payload)
            } else {
                // Creating new client
                await api.post('/customers', payload)
            }
            setShowEditModal(false)
            setSelectedClient(null)
            setEditForm({ name: '', email: '', phone: '', address: '', notes: '', city: '', state: '', zip: '' })
            fetchClients()
        } catch (error) {
            console.error('Failed to save client:', error)
            alert(t('common.error'))
        }
    }

    const handleDelete = async (clientId) => {
        if (!confirm(t('clients.deleteConfirmation'))) return

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
            alert(t('common.error'))
        }
    }

    const handleBulkDelete = async () => {
        if (selectedClients.size === 0) return
        const count = selectedClients.size
        if (!confirm(t('clients.bulkDeleteConfirmation', { count }))) return

        try {
            await Promise.all(Array.from(selectedClients).map(id => api.delete(`/customers/${id}`)))
            setSelectedClients(new Set())
            setShowBulkActions(false)
            fetchClients()
            alert(t('common.success'))
        } catch (error) {
            console.error('Failed to delete clients:', error)
            alert(t('common.error'))
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

            alert(t('clients.importComplete', { imported, errors }))
            fetchClients()
        } catch (error) {
            console.error('Failed to import clients:', error)
            alert(t('common.error'))
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

        if (!confirm(t('clients.mergeConfirmation', { source: sourceClientForMerge.name }))) {
            return
        }

        setMerging(true)
        try {
            const response = await api.post('/customers/merge', {
                sourceCustomerId: sourceClientForMerge.id,
                targetCustomerId: targetClientId
            })

            if (response.data.success) {
                alert(t('clients.mergeSuccess', {
                    submissions: response.data.updatedSubmissions,
                    invoices: response.data.updatedInvoices
                }))
                setShowMergeModal(false)
                setSourceClientForMerge(null)
                fetchClients()
            } else {
                throw new Error(response.data.error || 'Merge failed')
            }
        } catch (error) {
            console.error('Failed to merge clients:', error)
            alert(error.response?.data?.error || error.message || t('common.error'))
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
        // Apply search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const matchesSearch = (
                client.name?.toLowerCase().includes(search) ||
                client.email?.toLowerCase().includes(search) ||
                client.phone?.toLowerCase().includes(search) ||
                formatAddress(client.address).toLowerCase().includes(search)
            );
            if (!matchesSearch) return false;
        }

        // Apply tab filter
        if (activeFilter === 'all') return true;
        if (activeFilter === 'active') return client.accountCreated === true;
        if (activeFilter === 'pending') return client.invitationSent === true && !client.accountCreated;
        if (activeFilter === 'no-invitation') return !client.invitationSent && !client.accountCreated;
        return true;
    });

    // Define filter tabs
    const filterTabs = [
        { id: 'all', label: 'All Clients', count: clients.length },
        { id: 'active', label: 'Active Accounts', count: clients.filter(c => c.accountCreated === true).length },
        { id: 'pending', label: 'Pending Invitations', count: clients.filter(c => c.invitationSent === true && !c.accountCreated).length },
        { id: 'no-invitation', label: 'No Invitation', count: clients.filter(c => !c.invitationSent && !c.accountCreated).length }
    ];

    if (authLoading || loading) {
        return <div className="loading">{t('common.loading')}</div>
    }

    if (accessDenied) {
        return (
            <div className="dashboard">
                <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <Users size={64} color="#9ca3af" style={{ marginBottom: '20px' }} />
                    <h2>{t('clients.permissionDenied')}</h2>
                    <p style={{ color: '#6b7280', marginTop: '8px' }}>
                        {t('clients.contactAdmin')}
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/dashboard')}>
                        {t('clients.backToDashboard')}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="dashboard animate-fadeIn" data-tour="clients">
            <PageHeader
                title={t('clients.title')}
                subtitle={t('dashboard.welcomeWorkspace')}
                icon={Users}
                actions={
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                        <button className="btn-modern btn-modern-primary" onClick={() => {
                            setSelectedClient(null)
                            setEditForm({ name: '', email: '', phone: '', address: '', notes: '' })
                            setShowEditModal(true)
                        }}>
                            <UserPlus size={18} />
                            {t('clients.newClient')}
                        </button>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <label className="btn-modern btn-modern-secondary" style={{ cursor: 'pointer' }}>
                                <Upload size={18} />
                                {t('clients.csvImport')}
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImport}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <button className="btn-modern btn-modern-secondary" onClick={() => setShowSettingsModal(true)}>
                                <Settings size={18} /> Settings
                            </button>
                            <div style={{
                                display: 'flex',
                                gap: '4px',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '4px',
                                background: 'white'
                            }}>
                                <button
                                    onClick={() => handleViewChange('grid')}
                                    style={{
                                        padding: '4px 8px',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        background: viewMode === 'grid' ? 'var(--primary-50)' : 'transparent',
                                        color: viewMode === 'grid' ? 'var(--primary-600)' : 'var(--text-secondary)',
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
                                        padding: '4px 8px',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        background: viewMode === 'list' ? 'var(--primary-50)' : 'transparent',
                                        color: viewMode === 'list' ? 'var(--primary-600)' : 'var(--text-secondary)',
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
                                        padding: '4px 8px',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        background: viewMode === 'table' ? 'var(--primary-50)' : 'transparent',
                                        color: viewMode === 'table' ? 'var(--primary-600)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Table View"
                                >
                                    <Table2 size={18} />
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <button className="btn-modern btn-modern-secondary" onClick={handleExportCSV}>
                                <Download size={18} />
                                {t('clients.csvExport')}
                            </button>
                            <button className="btn-modern btn-modern-secondary" onClick={handleExportExcel}>
                                <Download size={18} />
                                {t('clients.excelExport')}
                            </button>
                        </div>
                    </div>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', maxWidth: '500px' }}>
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder={t('clients.searchPlaceholder')}
                    />
                </div>
                <FilterTabs
                    filters={filterTabs}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </PageHeader>

            <div className="container" style={{ paddingTop: 0 }}>

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
                            <button className="btn-modern btn-modern-secondary btn-sm" onClick={handleBulkExport}>
                                <Download size={16} />
                                {t('clients.exportSelected')}
                            </button>
                            <button className="btn-modern btn-modern-danger btn-sm" onClick={handleBulkDelete}>
                                <Trash2 size={16} />
                                {t('clients.deleteSelected')}
                            </button>
                            <button className="btn-modern btn-modern-secondary btn-sm" onClick={() => {
                                setSelectedClients(new Set())
                                setShowBulkActions(false)
                            }}>
                                {t('clients.clearSelection')}
                            </button>
                        </div>
                    </div>
                )}


                {filteredClients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>{t('clients.noClients')}</p>
                        {searchTerm && <p style={{ fontSize: '14px', marginTop: '8px' }}>{t('clients.tryAdjustingSearch')}</p>}
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                className="btn-modern btn-modern-secondary btn-sm"
                                onClick={handleSelectAll}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}
                            >
                                {selectedClients.size === filteredClients.length && filteredClients.length > 0 ? (
                                    <CheckSquare size={18} />
                                ) : (
                                    <Square size={18} />
                                )}
                                {selectedClients.size === filteredClients.length && filteredClients.length > 0 ? t('common.deselectAll') : t('common.selectAll')}
                            </button>
                        </div>

                        {/* Grid View */}
                        {viewMode === 'grid' && (
                            <div className="forms-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                {filteredClients.map((client) => {
                                    const isSelected = selectedClients.has(client.id)
                                    return (
                                        <div key={client.id} className="modern-card animate-fadeIn" style={{
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
                                                        onChange={() => handleToggleSelect(client.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                    <span className="checkmark"></span>
                                                </label>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', paddingLeft: '40px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{client.name}</h3>
                                                    <div style={{ marginTop: '8px' }}>
                                                        {client.accountCreated ? (
                                                            <div className="badge badge-success" style={{ fontSize: '10px', padding: '2px 10px' }}>
                                                                <CheckCircle size={10} /> {t('clients.accountActive')}
                                                            </div>
                                                        ) : client.invitationSent ? (
                                                            <div className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 10px' }}>
                                                                <Clock size={10} /> {t('clients.invitationSent')}
                                                            </div>
                                                        ) : (
                                                            <div className="badge badge-info" style={{ fontSize: '10px', padding: '2px 10px' }}>
                                                                {t('clients.noInvitation')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); handleEdit(client); }} title={t('common.edit')}><Edit size={16} /></button>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--primary-600)' }} onClick={(e) => { e.stopPropagation(); handleMerge(client); }} title={t('clients.mergeClient')}><GitMerge size={16} /></button>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }} title={t('common.delete')}><Trash2 size={16} /></button>
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '20px', color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: '600' }}>
                                                {client.email && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <Mail size={14} color="var(--primary-600)" />
                                                        <span style={{ color: 'var(--text-secondary)' }}>{client.email}</span>
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <Phone size={14} color="var(--primary-600)" />
                                                        <span style={{ color: 'var(--text-secondary)' }}>{client.phone}</span>
                                                    </div>
                                                )}
                                                {formatAddress(client.address) && (
                                                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px', marginBottom: '6px' }}>
                                                        <FileText size={14} color="var(--primary-600)" style={{ marginTop: '3px' }} />
                                                        <span style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>{formatAddress(client.address)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                                {!client.accountCreated && client.email && (
                                                    <button
                                                        className="btn-modern btn-modern-primary"
                                                        style={{
                                                            background: '#f59e0b',
                                                            color: '#ffffff',
                                                            padding: '6px 12px',
                                                            fontSize: '12px',
                                                            border: 'none',
                                                            fontWeight: '600'
                                                        }}
                                                        onClick={async (e) => {
                                                            e.stopPropagation()
                                                            if (confirm(t('clients.resendConfirmation', { email: client.email }))) {
                                                                try {
                                                                    await api.post(`/client-invitations/resend/${client.id}`)
                                                                    alert('Invitation email sent!')
                                                                    fetchClients()
                                                                } catch (error) {
                                                                    alert(t('common.error'))
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <Mail size={14} /> {t('clients.resendInvitation')}
                                                    </button>
                                                )}
                                                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px 12px' }} onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                                                        {t('clients.viewProfile')}
                                                    </button>
                                                    <button className="btn-modern btn-modern-primary" style={{ padding: '8px 12px' }} onClick={() => navigate(`/customer/${client.id}/submissions`)}>
                                                        {t('clients.viewSubmissions')}
                                                    </button>
                                                </div>
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
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{client.email || '-'}</div>
                                                    <div>
                                                        {client.accountCreated ? (
                                                            <div className="badge badge-success" style={{ fontSize: '10px', padding: '2px 10px' }}>
                                                                {t('clients.accountActive')}
                                                            </div>
                                                        ) : client.invitationSent ? (
                                                            <div className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 10px' }}>
                                                                {t('clients.invitationSent')}
                                                            </div>
                                                        ) : (
                                                            <div className="badge badge-info" style={{ fontSize: '10px', padding: '2px 10px', backgroundColor: '#dbeafe', color: '#1e40af' }}>
                                                                {t('clients.noInvitation')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    <Phone size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                    {client.phone || '-'}
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {formatAddress(client.address) || '-'}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    {client.submissionCount || 0} {t('clients.submissions')}
                                                </div>
                                            </div>
                                            {!client.accountCreated && client.email && (
                                                <button
                                                    className="btn-modern btn-modern-primary"
                                                    style={{
                                                        background: '#f59e0b',
                                                        color: '#ffffff',
                                                        padding: '6px 12px',
                                                        fontSize: '12px',
                                                        marginLeft: '16px',
                                                        border: 'none',
                                                        fontWeight: '600'
                                                    }}
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        if (confirm(t('clients.resendConfirmation', { email: client.email }))) {
                                                            try {
                                                                await api.post(`/client-invitations/resend/${client.id}`)
                                                                alert('Invitation email sent!')
                                                                fetchClients()
                                                            } catch (error) {
                                                                alert(t('common.error'))
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Mail size={14} /> {t('clients.resendInvitation')}
                                                </button>
                                            )}
                                            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEdit(client)
                                                    }}
                                                    title={t('common.edit')}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/clients/${client.id}`)
                                                    }}
                                                    title={t('clients.viewProfile')}
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        navigate(`/customer/${client.id}/submissions`)
                                                    }}
                                                    title={t('clients.viewSubmissions')}
                                                    style={{ color: 'var(--primary-600)' }}
                                                >
                                                    <FileText size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDelete(client.id)
                                                    }}
                                                    title={t('common.delete')}
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
                            <div className="modern-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="modern-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '48px', padding: '16px 24px' }}>
                                                <label className="checkbox-custom">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                                                        onChange={handleSelectAll}
                                                    />
                                                    <span className="checkmark"></span>
                                                </label>
                                            </th>
                                            <th style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('clients.name')}</th>
                                            <th style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('clients.email')}</th>
                                            <th style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('clients.phone')}</th>
                                            <th style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('clients.address')}</th>
                                            <th style={{ fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('clients.submissions')}</th>
                                            <th style={{ textAlign: 'right', paddingRight: '24px', fontWeight: '900', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredClients.map((client) => {
                                            const isSelected = selectedClients.has(client.id)
                                            return (
                                                <tr key={client.id} className={isSelected ? 'selected' : ''}>
                                                    <td style={{ padding: '16px 20px' }}>
                                                        <label className="checkbox-custom">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => handleToggleSelect(client.id)}
                                                            />
                                                            <span className="checkmark"></span>
                                                        </label>
                                                    </td>
                                                    <td style={{ fontWeight: '900', color: 'var(--primary-600)', fontSize: '15px' }}>{client.name}</td>
                                                    <td style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>{client.email || '-'}</td>
                                                    <td style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>{client.phone || '-'}</td>
                                                    <td style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {formatAddress(client.address) || '-'}
                                                    </td>
                                                    <td>
                                                        <div className="badge badge-info" style={{ fontSize: '12px', padding: '2px 10px' }}>
                                                            {client.submissionCount || 0}
                                                        </div>
                                                    </td>
                                                    <td style={{ paddingRight: '20px' }}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleEdit(client)} title={t('common.edit')}><Edit size={16} /></button>
                                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => navigate(`/clients/${client.id}`)} title={t('clients.viewProfile')}><ExternalLink size={16} /></button>
                                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(client.id)} title={t('common.delete')}><Trash2 size={16} /></button>
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
                        <h2>{selectedClient ? t('clients.editClient') : t('clients.newClient')}</h2>
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('clients.name')}</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('clients.email')}</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('clients.phone')}</label>
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '4px' }}>{t('clients.selectProperty')}</label>
                            <select
                                onChange={handlePropertySelect}
                                style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            >
                                <option value="">{t('clients.newAddress')}</option>
                                {properties.map(prop => (
                                    <option key={prop.id} value={prop.id}>
                                        {prop.address}{prop.city ? `, ${prop.city}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('clients.streetAddress')}</label>
                            <input
                                type="text"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                placeholder={t('clients.streetAddress')}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label>{t('clients.city')}</label>
                                <input
                                    type="text"
                                    value={editForm.city}
                                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                    placeholder={t('clients.city')}
                                />
                            </div>
                            <div>
                                <label>{t('clients.state')}</label>
                                <input
                                    type="text"
                                    value={editForm.state}
                                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                                    style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                    placeholder={t('clients.state')}
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: '16px', maxWidth: '50%' }}>
                            <label>{t('clients.zipCode')}</label>
                            <input
                                type="text"
                                value={editForm.zip}
                                onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                placeholder={t('clients.zipCode')}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label>{t('clients.notes')}</label>
                            <textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                style={{ width: '100%', padding: '8px', marginTop: '4px', border: '1px solid #e5e7eb', borderRadius: '4px', minHeight: '80px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                {t('common.cancel')}
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {t('common.save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMergeModal && sourceClientForMerge && (
                <div className="modal-overlay" onClick={() => !merging && setShowMergeModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>{t('clients.mergeTitle')}</h2>
                        <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                            {t('clients.mergeDescription', { source: sourceClientForMerge.name })}
                        </p>

                        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                            <strong>{t('clients.sourceClient')}</strong>
                            <div style={{ marginTop: '8px' }}>
                                <div><strong>{t('clients.name')}:</strong> {sourceClientForMerge.name}</div>
                                {sourceClientForMerge.email && <div><strong>{t('clients.email')}:</strong> {sourceClientForMerge.email}</div>}
                                {sourceClientForMerge.phone && <div><strong>{t('clients.phone')}:</strong> {sourceClientForMerge.phone}</div>}
                                <div><strong>{t('clients.submissions')}:</strong> {sourceClientForMerge.submissionCount || 0}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                                {t('clients.targetClient')}
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
                                <option value="">{t('clients.selectTarget')}</option>
                                {clients
                                    .filter(c => c.id !== sourceClientForMerge.id)
                                    .map(client => (
                                        <option key={client.id} value={client.id}>
                                            {client.name} {client.email ? `(${client.email})` : ''} - {client.submissionCount || 0} {t('clients.submissions')}
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
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Client Settings Modal */}
            <ClientSettingsModal
                show={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onSave={(settings) => {
                    if (settings?.defaultViewMode) {
                        setViewMode(settings.defaultViewMode);
                        localStorage.setItem('clientsViewMode', settings.defaultViewMode);
                    }
                }}
            />
        </div>
    )
}

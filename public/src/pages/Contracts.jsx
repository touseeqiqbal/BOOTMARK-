import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Search, Plus, Edit, Trash2, Calendar,
    User, CheckCircle, XCircle, Clock, AlertCircle, Download,
    Grid, List, Filter, Copy, Send, DollarSign, LayoutGrid, LayoutList, FileDown, Settings, Table as TableIcon
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.jpeg';
import { exportToExcel, formatContractsForExcel } from '../utils/excelExport';
import ContractTemplateSelector from '../components/ContractTemplateSelector';
import PaymentScheduleBuilder from '../components/PaymentScheduleBuilder';
import { contractTemplatesApi } from '../utils/contractTemplatesApi';
import ContractSettingsModal from '../components/ContractSettingsModal';
import PageHeader from '../components/ui/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useToast } from '../components/ui/Toast';
import FilterTabs from '../components/FilterTabs';

export default function Contracts() {
    const [contracts, setContracts] = useState([]);
    const [clients, setClients] = useState([]);
    const [templates, setTemplates] = useState([]); // NEW
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [viewMode, setViewMode] = useState(localStorage.getItem('contractsViewMode') || 'grid'); // grid or list
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        type: 'all',
        dateRange: 'all'
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        clientId: '',
        startDate: '',
        endDate: '',
        status: 'draft',
        amount: '',
        description: '',
        terms: '',
        templateId: '',
        billingFrequency: 'monthly',
        autoRenewal: false,
        renewalNoticePeriod: 30,
        serviceScope: '',
        deliverables: '',
        paymentSchedule: [],
        cancellationTerms: '',
        attachments: []
    });

    const navigate = useNavigate();
    const toast = useToast();

    useEffect(() => {
        fetchContracts();
        fetchClients();
        fetchTemplates(); // NEW
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/contracts/settings');
            if (res.data && res.data.defaultViewMode) {
                if (!localStorage.getItem('contractsViewMode')) {
                    setViewMode(res.data.defaultViewMode);
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/contracts');
            setContracts(res.data || []);
        } catch (error) {
            console.error('Failed to fetch contracts', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await api.get('/customers');
            setClients(res.data || []);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const data = await contractTemplatesApi.getAll();
            setTemplates(data || []);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        }
    };

    const handleTemplateSelect = (template) => {
        setFormData(prev => ({
            ...prev,
            templateId: template.id,
            billingFrequency: template.billingFrequency,
            autoRenewal: template.autoRenewal,
            terms: template.terms
        }));
    };

    const handleEdit = (contract) => {
        setEditingContract(contract);
        setFormData({
            title: contract.title,
            clientId: contract.clientId,
            startDate: contract.startDate?.split('T')[0] || '',
            endDate: contract.endDate?.split('T')[0] || '',
            status: contract.status || 'draft',
            amount: contract.amount,
            description: contract.description || '',
            terms: contract.terms || '',
            templateId: contract.templateId || '',
            billingFrequency: contract.billingFrequency || 'monthly',
            autoRenewal: contract.autoRenewal || false,
            renewalNoticePeriod: contract.renewalNoticePeriod || 30,
            serviceScope: contract.serviceScope || '',
            deliverables: contract.deliverables || '',
            paymentSchedule: contract.paymentSchedule || [],
            cancellationTerms: contract.cancellationTerms || '',
            attachments: contract.attachments || []
        });
        setShowModal(true);
    };

    const handleDelete = (id) => {
        setDeleteTarget(id);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/contracts/${deleteTarget}`);
            fetchContracts();
            setDeleteTarget(null);
            toast.success('Contract deleted successfully');
        } catch (error) {
            console.error('Failed to delete contract', error);
            toast.error('Failed to delete contract');
        }
    };

    const handleDuplicate = async (contract) => {
        const duplicated = {
            ...contract,
            title: `${contract.title} (Copy)`,
            status: 'draft',
            id: undefined
        };
        setFormData(duplicated);
        setEditingContract(null);
        setShowModal(true);
    };

    const handleDownloadPDF = async (contractId) => {
        try {
            const response = await api.get(`/contracts/${contractId}/pdf`, {
                responseType: 'blob'
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `contract-${contractId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                customerId: formData.clientId
            };

            if (editingContract) {
                await api.put(`/contracts/${editingContract.id}`, payload);
            } else {
                await api.post('/contracts', payload);
            }
            setShowModal(false);
            setEditingContract(null);
            resetForm();
            fetchContracts();
        } catch (error) {
            console.error('Failed to save contract', error);
            alert('Failed to save contract: ' + (error.response?.data?.error || error.message));
        }
    };

    const resetForm = () => {
        setFormData({
            title: '', clientId: '', startDate: '', endDate: '',
            status: 'draft', amount: '', description: '', terms: '',
            templateId: '', billingFrequency: 'monthly', autoRenewal: false,
            renewalNoticePeriod: 30, serviceScope: '', deliverables: '',
            paymentSchedule: [], cancellationTerms: '', attachments: []
        });
    };

    const filteredContracts = contracts.filter(c => {
        const matchesSearch = (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (clients.find(cl => cl.id === c.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filters.status === 'all' || c.status === filters.status;
        const matchesType = filters.type === 'all' || c.templateId === filters.type;

        return matchesSearch && matchesStatus && matchesType;
    });

    // Define filter tabs
    const filterTabs = [
        { id: 'all', label: 'All Contracts', count: contracts.length },
        { id: 'active', label: 'Active', count: contracts.filter(c => c.status === 'active').length },
        { id: 'pending-signature', label: 'Pending', count: contracts.filter(c => c.status === 'pending-signature').length },
        { id: 'expired', label: 'Expired', count: contracts.filter(c => c.status === 'expired').length },
        { id: 'cancelled', label: 'Cancelled', count: contracts.filter(c => c.status === 'cancelled').length }
    ];

    const getStatusColor = (status) => {
        if (!status) return '#3b82f6';
        switch (status) {
            case 'active': return '#10b981';
            case 'draft': return '#6b7280';
            case 'expired': return '#ef4444';
            case 'cancelled': return '#f59e0b';
            case 'pending-signature': return '#8b5cf6';
            default: return '#3b82f6';
        }
    };

    const getStatusIcon = (status) => {
        if (!status) return <FileText size={14} />;
        switch (status) {
            case 'active': return <CheckCircle size={14} />;
            case 'draft': return <Clock size={14} />;
            case 'expired': return <AlertCircle size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            case 'pending-signature': return <Send size={14} />;
            default: return <FileText size={14} />;
        }
    };

    return (
        <div className="dashboard animate-fadeIn">
            <PageHeader
                title="Contracts Management"
                subtitle={`${contracts.length} total customer agreements`}
                actions={
                    <>
                        <button
                            className="btn-modern btn-modern-secondary"
                            onClick={() => navigate('/contracts/templates')}
                        >
                            <FileText size={18} /> Templates
                        </button>
                        <button
                            className="btn-modern btn-modern-secondary"
                            onClick={() => setShowSettingsModal(true)}
                        >
                            <Settings size={18} /> Settings
                        </button>
                        <button
                            className="btn-modern btn-modern-secondary"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={18} /> Filters
                        </button>
                        <button
                            className="btn-modern btn-modern-secondary"
                            onClick={() => {
                                const formattedData = formatContractsForExcel(contracts, clients);
                                exportToExcel(formattedData, `contracts-${new Date().toISOString().split('T')[0]}`, 'Contracts');
                            }}
                        >
                            <Download size={18} /> Export
                        </button>
                        <button
                            className="btn-modern btn-modern-primary"
                            onClick={() => {
                                setEditingContract(null);
                                resetForm();
                                setShowModal(true);
                            }}
                        >
                            <Plus size={18} /> New Contract
                        </button>
                    </>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search contracts by title or client..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-modern"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                    </div>
                </div>
                <FilterTabs
                    filters={filterTabs}
                    activeFilter={filters.status}
                    onFilterChange={(status) => setFilters({ ...filters, status })}
                />
            </PageHeader>

            <div className="container" style={{ paddingTop: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* View Toggle */}
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '4px',
                            background: 'white'
                        }}>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '8px 12px',
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
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '8px 12px',
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
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                style={{
                                    padding: '8px 12px',
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
                                <TableIcon size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                {showFilters && (
                    <div className="modern-card" style={{ padding: '16px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="input-modern"
                            >
                                <option value="all">All Statuses</option>
                                <option value="draft">Draft</option>
                                <option value="active">Active</option>
                                <option value="pending-signature">Pending Signature</option>
                                <option value="expired">Expired</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Contract Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                className="input-modern"
                            >
                                <option value="all">All Types</option>
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="loading">Loading contracts...</div>
                ) : filteredContracts.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <FileText size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No contracts found</h3>
                        <p style={{ color: '#6b7280' }}>Create contracts to track customer agreements.</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditingContract(null);
                                resetForm();
                                setShowModal(true);
                            }}
                            style={{ marginTop: '16px' }}
                        >
                            <Plus size={18} /> Create Your First Contract
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="contracts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {filteredContracts.map(contract => {
                            const client = clients.find(c => c.id === contract.clientId);
                            const statusColor = getStatusColor(contract.status);
                            const template = templates.find(t => t.id === contract.templateId);

                            return (
                                <div
                                    key={contract.id}
                                    className="modern-card animate-fadeIn"
                                    style={{
                                        position: 'relative',
                                        borderLeft: `4px solid ${statusColor}`,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                >
                                    {template && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            fontSize: '24px'
                                        }}>
                                            {template.icon}
                                        </div>
                                    )}

                                    <div style={{ marginBottom: '12px' }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', paddingRight: '40px' }}>
                                            {contract.title || 'Untitled Contract'}
                                        </h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                                            <User size={14} />
                                            {client ? client.name : 'Unknown Client'}
                                        </div>
                                        {template && (
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                                                {template.name}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                            <Calendar size={14} color="#6b7280" />
                                            <span>{new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ fontWeight: '600', fontFamily: 'monospace' }}>
                                            ${contract.amount || '0.00'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className={`badge ${contract.status === 'active' ? 'badge-success' :
                                            contract.status === 'pending-signature' ? 'badge-purple' :
                                                contract.status === 'draft' ? 'badge-info' :
                                                    contract.status === 'expired' ? 'badge-error' : 'badge-warning'}`}>
                                            {getStatusIcon(contract.status)}
                                            {(contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1).replace('-', ' ')}
                                        </span>

                                        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                                            <button
                                                className="btn btn-icon"
                                                onClick={() => handleDownloadPDF(contract.id)}
                                                title="Download PDF"
                                            >
                                                <FileDown size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon"
                                                onClick={() => handleDuplicate(contract)}
                                                title="Duplicate"
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon"
                                                onClick={() => handleEdit(contract)}
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-icon"
                                                onClick={() => handleDelete(contract.id)}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // List View
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Contract</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Client</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Type</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Duration</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Value</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Status</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContracts.map(contract => {
                                    const client = clients.find(c => c.id === contract.clientId);
                                    const statusColor = getStatusColor(contract.status);
                                    const template = templates.find(t => t.id === contract.templateId);

                                    return (
                                        <tr
                                            key={contract.id}
                                            style={{
                                                borderBottom: '1px solid #f3f4f6',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s'
                                            }}
                                            onClick={() => navigate(`/contracts/${contract.id}`)}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ fontWeight: '500' }}>{contract.title}</div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                                                {client?.name || 'Unknown'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                                {template ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span>{template.icon}</span>
                                                        {template.name}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                                                ${contract.amount}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    fontSize: '12px', color: statusColor, fontWeight: '500',
                                                    padding: '2px 8px', borderRadius: '12px', background: `${statusColor}20`
                                                }}>
                                                    {getStatusIcon(contract.status)}
                                                    {(contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1).replace('-', ' ')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <button className="btn btn-icon" onClick={() => handleDownloadPDF(contract.id)} title="Download PDF">
                                                        <FileDown size={14} />
                                                    </button>
                                                    <button className="btn btn-icon" onClick={() => handleDuplicate(contract)} title="Duplicate">
                                                        <Copy size={14} />
                                                    </button>
                                                    <button className="btn btn-icon" onClick={() => handleEdit(contract)} title="Edit">
                                                        <Edit size={14} />
                                                    </button>
                                                    <button className="btn btn-icon" onClick={() => handleDelete(contract.id)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Enhanced Modal with Tabs */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div
                        className="modal-content"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}
                    >
                        <h2>{editingContract ? 'Edit Contract' : 'New Contract'}</h2>

                        <form onSubmit={handleSubmit}>
                            {/* Template Selector - Only show for new contracts */}
                            {!editingContract && (
                                <ContractTemplateSelector
                                    onSelect={handleTemplateSelect}
                                    selectedTemplate={formData.templateId}
                                />
                            )}

                            {/* Basic Information */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }}>
                                    Basic Information
                                </h3>

                                <div className="form-group">
                                    <label>Contract Title *</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Annual Maintenance Agreement 2024"
                                        required
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="form-control"
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Client *</label>
                                        <select
                                            required
                                            value={formData.clientId}
                                            onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                            className="form-control"
                                        >
                                            <option value="">Select Client</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="form-control"
                                        >
                                            <option value="draft">Draft</option>
                                            <option value="pending-signature">Pending Signature</option>
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Start Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>End Date *</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Total Value ($) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            className="form-control"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Billing */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }}>
                                    Payment & Billing
                                </h3>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div className="form-group">
                                        <label>Billing Frequency</label>
                                        <select
                                            value={formData.billingFrequency}
                                            onChange={e => setFormData({ ...formData, billingFrequency: e.target.value })}
                                            className="form-control"
                                        >
                                            <option value="one-time">One-Time</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="annually">Annually</option>
                                            <option value="milestone">Milestone-Based</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.autoRenewal}
                                                onChange={e => setFormData({ ...formData, autoRenewal: e.target.checked })}
                                            />
                                            Auto-Renewal
                                        </label>
                                        {formData.autoRenewal && (
                                            <input
                                                type="number"
                                                placeholder="Notice period (days)"
                                                value={formData.renewalNoticePeriod}
                                                onChange={e => setFormData({ ...formData, renewalNoticePeriod: e.target.value })}
                                                className="form-control"
                                                style={{ marginTop: '8px' }}
                                            />
                                        )}
                                    </div>
                                </div>

                                <PaymentScheduleBuilder
                                    schedule={formData.paymentSchedule}
                                    onChange={(schedule) => setFormData({ ...formData, paymentSchedule: schedule })}
                                />
                            </div>

                            {/* Scope & Details */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }}>
                                    Scope & Details
                                </h3>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="form-control"
                                        placeholder="Brief description of the contract"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Service Scope</label>
                                    <textarea
                                        rows={3}
                                        value={formData.serviceScope}
                                        onChange={e => setFormData({ ...formData, serviceScope: e.target.value })}
                                        className="form-control"
                                        placeholder="Detailed scope of services to be provided"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Deliverables</label>
                                    <textarea
                                        rows={3}
                                        value={formData.deliverables}
                                        onChange={e => setFormData({ ...formData, deliverables: e.target.value })}
                                        className="form-control"
                                        placeholder="Expected deliverables and outcomes"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Cancellation Terms</label>
                                    <textarea
                                        rows={2}
                                        value={formData.cancellationTerms}
                                        onChange={e => setFormData({ ...formData, cancellationTerms: e.target.value })}
                                        className="form-control"
                                        placeholder="Terms and conditions for contract cancellation"
                                    />
                                </div>
                            </div>

                            {/* Terms & Conditions */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '16px', marginBottom: '16px', paddingBottom: '8px', borderBottom: '2px solid #e5e7eb' }}>
                                    Terms & Conditions
                                </h3>

                                <div className="form-group">
                                    <label>Contract Terms</label>
                                    <textarea
                                        rows={8}
                                        value={formData.terms}
                                        onChange={e => setFormData({ ...formData, terms: e.target.value })}
                                        className="form-control"
                                        placeholder="Full terms and conditions (auto-populated from template)"
                                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    <FileText size={18} /> {editingContract ? 'Update Contract' : 'Create Contract'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Contract Settings Modal */}
            <ContractSettingsModal
                show={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onSave={(settings) => {
                    if (settings?.defaultViewMode) {
                        setViewMode(settings.defaultViewMode);
                        localStorage.setItem('contractsViewMode', settings.defaultViewMode);
                    }
                }}
            />

            {/* Delete Contract Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Contract"
                message="Are you sure you want to delete this contract? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}

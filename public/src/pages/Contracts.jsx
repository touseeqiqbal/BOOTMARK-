import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Search, Plus, Edit, Trash2, Calendar,
    User, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import { exportToExcel, formatContractsForExcel } from '../utils/excelExport';

export default function Contracts() {
    const [contracts, setContracts] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        clientId: '',
        startDate: '',
        endDate: '',
        status: 'draft',
        amount: '',
        description: '',
        terms: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchContracts();
        fetchClients();
    }, []);

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
            terms: contract.terms || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this contract?')) return;
        try {
            await api.delete(`/contracts/${id}`);
            fetchContracts();
        } catch (error) {
            console.error('Failed to delete contract', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingContract) {
                await api.put(`/contracts/${editingContract.id}`, formData);
            } else {
                await api.post('/contracts', formData);
            }
            setShowModal(false);
            setEditingContract(null);
            setFormData({
                title: '', clientId: '', startDate: '', endDate: '',
                status: 'draft', amount: '', description: '', terms: ''
            });
            fetchContracts();
        } catch (error) {
            console.error('Failed to save contract', error);
        }
    };

    const filteredContracts = contracts.filter(c =>
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (clients.find(cl => cl.id === c.clientId)?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            key: 'title',
            label: 'Contract Title',
            render: (item) => (
                <div style={{ fontWeight: '500', color: '#111827' }}>{item.title}</div>
            )
        },
        {
            key: 'client',
            label: 'Client',
            render: (item) => clients.find(c => c.id === item.clientId)?.name || 'Unknown'
        },
        {
            key: 'status',
            label: 'Status',
            render: (item) => {
                const color = getStatusColor(item.status);
                return (
                    <span style={{
                        background: `${color}20`, color: color, padding: '2px 8px', borderRadius: '12px',
                        fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content'
                    }}>
                        {getStatusIcon(item.status)}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                );
            }
        },
        {
            key: 'amount',
            label: 'Value',
            render: (item) => <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>${item.amount}</span>
        },
        {
            key: 'dates',
            label: 'Duration',
            render: (item) => (
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                    {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                </div>
            )
        }
    ];

    const ActionButtons = ({ item }) => (
        <>
            <button className="btn btn-icon" onClick={() => handleEdit(item)} title="Edit"><Edit size={16} /></button>
            <button className="btn btn-icon" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={16} /></button>
        </>
    );

    const getStatusColor = (status) => {
        if (!status) return '#3b82f6';
        switch (status) {
            case 'active': return '#10b981'; // green
            case 'draft': return '#6b7280'; // gray
            case 'expired': return '#ef4444'; // red
            case 'cancelled': return '#f59e0b'; // amber
            default: return '#3b82f6'; // blue
        }
    };

    const getStatusIcon = (status) => {
        if (!status) return <FileText size={14} />;
        switch (status) {
            case 'active': return <CheckCircle size={14} />;
            case 'draft': return <Clock size={14} />;
            case 'expired': return <AlertCircle size={14} />;
            case 'cancelled': return <XCircle size={14} />;
            default: return <FileText size={14} />;
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Contracts Management</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    const formattedData = formatContractsForExcel(contracts, clients);
                                    exportToExcel(formattedData, `contracts-${new Date().toISOString().split('T')[0]}`, 'Contracts');
                                }}
                            >
                                <FileText size={18} /> Export Excel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingContract(null);
                                    setFormData({
                                        title: '', clientId: '', startDate: '', endDate: '',
                                        status: 'draft', amount: '', description: '', terms: ''
                                    });
                                    setShowModal(true);
                                }}
                            >
                                <Plus size={18} /> New Contract
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                <div style={{ marginBottom: '24px', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search contracts by title or client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ width: '100%', paddingLeft: '40px' }}
                    />
                </div>

                {loading ? (
                    <div className="loading">Loading contracts...</div>
                ) : filteredContracts.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <FileText size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No contracts found</h3>
                        <p style={{ color: '#6b7280' }}>Create contracts to track customer agreements.</p>
                    </div>
                ) : (
                    <div className="contracts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {filteredContracts.map(contract => {
                            const client = clients.find(c => c.id === contract.clientId);
                            const statusColor = getStatusColor(contract.status);
                            return (
                                <div
                                    key={contract.id}
                                    className="card"
                                    style={{
                                        position: 'relative',
                                        borderLeft: `4px solid ${statusColor}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => navigate(`/contracts/${contract.id}`)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{contract.title || 'Untitled Contract'}</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                                                <User size={14} />
                                                {client ? client.name : 'Unknown Client'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                className="btn btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(contract);
                                                }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn btn-icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(contract.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} color="#6b7280" />
                                            <span>{contract.startDate || 'No Date'} - {contract.endDate || 'No Date'}</span>
                                        </div>
                                        <div style={{ fontWeight: '600' }}>
                                            ${contract.amount || '0.00'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '12px', color: statusColor, fontWeight: '500',
                                            padding: '2px 8px', borderRadius: '12px', background: `${statusColor}20`
                                        }}>
                                            {getStatusIcon(contract.status)}
                                            {(contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingContract ? 'Edit Contract' : 'New Contract'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Contract Title</label>
                                <input type="text" placeholder="e.g. Annual Maintenance 2024" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="form-control" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Client</label>
                                    <select required value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className="form-control">
                                        <option value="">Select Client</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="form-control">
                                        <option value="draft">Draft</option>
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Start Date</label>
                                    <input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>End Date</label>
                                    <input type="date" required value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Total Value ($)</label>
                                    <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="form-control" />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-control" />
                            </div>

                            <div className="form-group">
                                <label>Terms & Conditions</label>
                                <textarea rows={4} value={formData.terms} onChange={e => setFormData({ ...formData, terms: e.target.value })} className="form-control" />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Contract</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

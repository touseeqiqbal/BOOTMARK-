import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, User, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function ContractDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchContract();
    }, [id]);

    const fetchContract = async () => {
        try {
            const [contractRes, clientsRes] = await Promise.all([
                api.get(`/contracts/${id}`),
                api.get('/customers')
            ]);
            setContract(contractRes.data);
            const clientData = clientsRes.data.find(c => c.id === contractRes.data.clientId);
            setClient(clientData);
        } catch (error) {
            console.error('Failed to fetch contract:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this contract?')) return;

        try {
            await api.delete(`/contracts/${id}`);
            navigate('/contracts');
        } catch (error) {
            console.error('Failed to delete contract:', error);
            alert('Failed to delete contract');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'draft': return '#6b7280';
            case 'expired': return '#ef4444';
            case 'cancelled': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return <CheckCircle size={20} />;
            case 'draft': return <Clock size={20} />;
            case 'expired': return <AlertCircle size={20} />;
            case 'cancelled': return <XCircle size={20} />;
            default: return <FileText size={20} />;
        }
    };

    if (loading) return <div className="loading">Loading contract...</div>;
    if (!contract) return <div className="loading">Contract not found</div>;

    const statusColor = getStatusColor(contract.status);

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">{contract.title || 'Contract Details'}</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/contracts')}
                            >
                                <ArrowLeft size={18} /> Back to Contracts
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate(`/contracts/edit/${id}`)}
                            >
                                <Edit size={18} /> Edit
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDelete}
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Main Content */}
                    <div>
                        {/* Contract Info Card */}
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 8px 0' }}>{contract.title}</h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 12px',
                                            borderRadius: '12px',
                                            background: `${statusColor}20`,
                                            color: statusColor,
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}>
                                            {getStatusIcon(contract.status)}
                                            {(contract.status || 'draft').charAt(0).toUpperCase() + (contract.status || 'draft').slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Contract Value</div>
                                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
                                        ${parseFloat(contract.amount || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Start Date</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} color="#6b7280" />
                                        <span style={{ fontSize: '15px', fontWeight: '500' }}>
                                            {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'Not set'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>End Date</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={16} color="#6b7280" />
                                        <span style={{ fontSize: '15px', fontWeight: '500' }}>
                                            {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Not set'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {contract.description && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Description</h3>
                                    <p style={{ color: '#6b7280', lineHeight: '1.6', margin: 0 }}>{contract.description}</p>
                                </div>
                            )}

                            {contract.terms && (
                                <div>
                                    <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Terms & Conditions</h3>
                                    <div style={{
                                        padding: '16px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        <p style={{ color: '#374151', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                                            {contract.terms}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div>
                        {/* Client Info Card */}
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={18} />
                                Client Information
                            </h3>
                            {client ? (
                                <div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Name</div>
                                        <div style={{ fontWeight: '500' }}>{client.name}</div>
                                    </div>
                                    {client.email && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Email</div>
                                            <div style={{ fontSize: '14px' }}>{client.email}</div>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Phone</div>
                                            <div style={{ fontSize: '14px' }}>{client.phone}</div>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Address</div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>{client.address}</div>
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-outline"
                                        style={{ width: '100%', marginTop: '16px' }}
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                    >
                                        View Client Profile
                                    </button>
                                </div>
                            ) : (
                                <div style={{ color: '#6b7280', fontSize: '14px' }}>No client information available</div>
                            )}
                        </div>

                        {/* Contract Metadata */}
                        <div className="card">
                            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} />
                                Contract Details
                            </h3>
                            <div style={{ fontSize: '14px' }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Created</div>
                                    <div>{contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : 'Unknown'}</div>
                                </div>
                                {contract.updatedAt && (
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Last Updated</div>
                                        <div>{new Date(contract.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

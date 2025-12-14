import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Search, Plus, Filter, Calendar,
    User, MapPin, Clock, CheckCircle, AlertCircle, Trash2, Square, CheckSquare, Download, Grid3x3, List, Table2, Settings
} from 'lucide-react';
import api from '../utils/api'; // Ensure this uses your configured Axios instance
import { useAuth } from '../utils/AuthContext';
import logo from '../assets/logo.svg';
import { exportToExcel, formatWorkOrdersForExcel } from '../utils/excelExport';
import SearchBar from '../components/SearchBar';
import WorkOrderSettingsModal from '../components/WorkOrderSettingsModal';

export default function WorkOrders() {
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState(localStorage.getItem('workOrdersViewMode') || 'grid');
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchWorkOrders();
    }, [user]);

    const fetchWorkOrders = async () => {
        try {
            setLoading(true);
            const res = await api.get('/work-orders');
            setWorkOrders(res.data);
        } catch (error) {
            console.error('Error fetching work orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedOrders.size === filteredOrders.length) {
            setSelectedOrders(new Set());
            setShowBulkActions(false);
        } else {
            setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
            setShowBulkActions(true);
        }
    };

    const handleToggleSelect = (orderId) => {
        setSelectedOrders(prev => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            setShowBulkActions(next.size > 0);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedOrders.size === 0) return;
        const count = selectedOrders.size;
        if (!confirm(`Are you sure you want to delete ${count} work order${count === 1 ? '' : 's'}?`)) return;

        try {
            await Promise.all(Array.from(selectedOrders).map(id => api.delete(`/work-orders/${id}`)));
            setSelectedOrders(new Set());
            setShowBulkActions(false);
            fetchWorkOrders();
            alert(`Successfully deleted ${count} work order${count === 1 ? '' : 's'}`);
        } catch (error) {
            console.error('Failed to delete work orders:', error);
            alert('Failed to delete some work orders');
        }
    };

    const handleDelete = async (orderId, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this work order?')) return;

        try {
            await api.delete(`/work-orders/${orderId}`);
            setSelectedOrders(prev => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
            fetchWorkOrders();
        } catch (error) {
            console.error('Failed to delete work order:', error);
            alert('Failed to delete work order');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return '#9ca3af';
            case 'scheduled': return '#3b82f6';
            case 'in-progress': return '#f59e0b';
            case 'completed': return '#10b981';
            case 'invoiced': return '#8b5cf6';
            case 'paid': return '#059669';
            default: return '#6b7280';
        }
    };

    const filteredOrders = workOrders.filter(order => {
        const matchesSearch =
            order.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()); // Assuming clientName is populated or we fetch clients to map
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleExportExcel = () => {
        const formattedData = formatWorkOrdersForExcel(workOrders);
        exportToExcel(formattedData, `work-orders-${new Date().toISOString().split('T')[0]}`, 'Work Orders');
    };

    const handleViewChange = (newView) => {
        setViewMode(newView);
        localStorage.setItem('workOrdersViewMode', newView);
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Work Orders</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => setShowSettingsModal(true)}>
                                <Settings size={18} />
                                Form Settings
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportExcel}>
                                <Download size={18} />
                                Export Excel
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/work-orders/templates')}
                            >
                                <ClipboardList size={18} /> Manage Templates
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/work-orders/new')}
                            >
                                <Plus size={18} /> New Work Order
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                {/* Bulk Actions Bar */}
                {showBulkActions && selectedOrders.size > 0 && (
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
                            {selectedOrders.size} work order{selectedOrders.size === 1 ? '' : 's'} selected
                        </span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                setSelectedOrders(new Set());
                                setShowBulkActions(false);
                            }}>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <SearchBar
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search work orders by number or client..."
                        style={{ minWidth: '300px', flex: 1, maxWidth: '500px' }}
                    />

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-control"
                            style={{ minWidth: '150px' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="invoiced">Invoiced</option>
                        </select>

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
                    </div>
                </div>

                {/* Select All Button */}
                {!loading && filteredOrders.length > 0 && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-link btn-sm"
                            onClick={handleSelectAll}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                        >
                            {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
                                <CheckSquare size={18} />
                            ) : (
                                <Square size={18} />
                            )}
                            {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="loading">Loading work orders...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No work orders found</h3>
                        <p style={{ color: '#6b7280' }}>Create a new work order to get started.</p>
                        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/work-orders/new')}>
                            Create Work Order
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Grid View */}
                        {viewMode === 'grid' && (
                            <div className="work-orders-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                                {filteredOrders.map(order => {
                                    const isSelected = selectedOrders.has(order.id);
                                    return (
                                        <div key={order.id} className="card" onClick={() => navigate(`/work-orders/${order.id}`)} style={{ cursor: 'pointer', borderTop: `4px solid ${getStatusColor(order.status)}`, transition: 'transform 0.2s', position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                left: '12px',
                                                zIndex: 10
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelect(order.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            </div>

                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                zIndex: 10
                                            }}>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => handleDelete(order.id, e)}
                                                    title="Delete"
                                                    style={{ padding: '4px' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ paddingLeft: '32px', paddingRight: '32px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <span style={{ fontWeight: 'bold', color: '#374151' }}>{order.workOrderNumber}</span>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        background: `${getStatusColor(order.status)}20`,
                                                        color: getStatusColor(order.status),
                                                        textTransform: 'uppercase',
                                                        fontWeight: '600'
                                                    }}>
                                                        {order.status}
                                                    </span>
                                                </div>

                                                <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>{order.title || 'Untitled Work Order'}</h3>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#6b7280' }}>
                                                    {order.scheduledDate && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Calendar size={16} />
                                                            {new Date(order.scheduledDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {order.address && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <MapPin size={16} />
                                                            {order.address}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* List View */}
                        {viewMode === 'list' && (
                            <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                                {filteredOrders.map((order) => {
                                    const isSelected = selectedOrders.has(order.id);
                                    return (
                                        <div
                                            key={order.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '16px',
                                                borderBottom: '1px solid #f3f4f6',
                                                borderLeft: `4px solid ${getStatusColor(order.status)}`,
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                            onClick={() => navigate(`/work-orders/${order.id}`)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(order.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', marginRight: '16px' }}
                                            />
                                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 1fr', gap: '16px', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '4px' }}>{order.workOrderNumber}</div>
                                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{order.title || 'Untitled'}</div>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    {order.clientName || 'No client'}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                    {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                                                </div>
                                                <div>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        background: `${getStatusColor(order.status)}20`,
                                                        color: getStatusColor(order.status),
                                                        textTransform: 'uppercase',
                                                        fontWeight: '600'
                                                    }}>
                                                        {order.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                                <button
                                                    className="btn btn-icon"
                                                    onClick={(e) => handleDelete(order.id, e)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
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
                                                    checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0}
                                                    onChange={handleSelectAll}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                            </th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>WO #</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Title</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Client</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Scheduled</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Price</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', fontSize: '14px', color: '#374151' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOrders.map((order) => {
                                            const isSelected = selectedOrders.has(order.id);
                                            return (
                                                <tr
                                                    key={order.id}
                                                    style={{ borderBottom: '1px solid #f3f4f6', borderLeft: `4px solid ${getStatusColor(order.status)}`, transition: 'background 0.2s', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                                    onClick={() => navigate(`/work-orders/${order.id}`)}
                                                >
                                                    <td style={{ padding: '12px 16px' }} onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelect(order.id)}
                                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontWeight: '500', fontSize: '14px' }}>{order.workOrderNumber}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{order.title || 'Untitled'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{order.clientName || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                                                        {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            fontSize: '12px',
                                                            padding: '4px 8px',
                                                            borderRadius: '12px',
                                                            background: `${getStatusColor(order.status)}20`,
                                                            color: getStatusColor(order.status),
                                                            textTransform: 'uppercase',
                                                            fontWeight: '600'
                                                        }}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                                                        ${order.price || '0.00'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button
                                                                className="btn btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/work-orders/${order.id}`);
                                                                }}
                                                                title="View Details"
                                                            >
                                                                <ClipboardList size={16} />
                                                            </button>
                                                            <button
                                                                className="btn btn-icon"
                                                                onClick={(e) => handleDelete(order.id, e)}
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
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
                    </>
                )}
            </div>

            {/* Settings Modal */}
            <WorkOrderSettingsModal
                show={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onSave={() => {
                    setShowSettingsModal(false);
                    // Optionally refresh work orders or show success message
                }}
            />
        </div>
    );
}

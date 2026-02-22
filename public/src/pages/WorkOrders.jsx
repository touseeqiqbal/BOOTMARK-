import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList, Search, Plus, Filter, Calendar,
    User, MapPin, Clock, CheckCircle, AlertCircle, Trash2, Square, CheckSquare, Download, Grid3x3, List, Table2, Settings
} from 'lucide-react';
import api from '../utils/api'; // Ensure this uses your configured Axios instance
import { useAuth } from '../utils/AuthContext';
import logo from '../assets/logo.jpeg';
import { exportToExcel, formatWorkOrdersForExcel } from '../utils/excelExport';
import SearchBar from '../components/SearchBar';
import WorkOrderSettingsModal from '../components/WorkOrderSettingsModal';
import PageHeader from '../components/ui/PageHeader';
import { EmptyWorkOrders } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import ConfirmModal from '../components/ui/ConfirmModal';
import FilterTabs from '../components/FilterTabs';

export default function WorkOrders() {
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState(localStorage.getItem('workOrdersViewMode') || 'grid');
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    // New state for workflows
    const [workflows, setWorkflows] = useState([]);
    const [statusColors, setStatusColors] = useState({});

    useEffect(() => {
        fetchWorkOrders();
        fetchWorkflows();
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        try {
            const res = await api.get('/work-orders/settings');
            if (res.data && res.data.defaultViewMode) {
                if (!localStorage.getItem('workOrdersViewMode')) {
                    setViewMode(res.data.defaultViewMode);
                }
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const fetchWorkflows = async () => {
        try {
            const res = await api.get('/workflows');
            setWorkflows(res.data);

            // Build status color map
            const colors = {
                'draft': '#9ca3af',
                'scheduled': '#3b82f6',
                'in-progress': '#f59e0b',
                'completed': '#10b981',
                'invoiced': '#8b5cf6',
                'paid': '#059669'
            };

            if (res.data) {
                res.data.forEach(w => {
                    if (w.stages) {
                        w.stages.forEach(s => {
                            if (s.name && s.color) {
                                colors[s.name.toLowerCase()] = s.color;
                            }
                        });
                    }
                });
            }
            setStatusColors(colors);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        }
    };

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

    // ... (bulk actions same) ...

    // Same bulk actions (omitted for brevity in replacement, but I must allow them to persist if I select ranges correctly)
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
        setShowBulkDeleteConfirm(true);
    };

    const confirmBulkDelete = async () => {
        const count = selectedOrders.size;
        try {
            await Promise.all(Array.from(selectedOrders).map(id => api.delete(`/work-orders/${id}`)));
            setSelectedOrders(new Set());
            setShowBulkActions(false);
            fetchWorkOrders();
            toast.success(`Successfully deleted ${count} work order${count === 1 ? '' : 's'}`);
        } catch (error) {
            console.error('Failed to delete work orders:', error);
            toast.error('Failed to delete some work orders');
        }
    };

    const handleDelete = (orderId, e) => {
        e.stopPropagation();
        setDeleteTarget(orderId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/work-orders/${deleteTarget}`);
            setSelectedOrders(prev => {
                const next = new Set(prev);
                next.delete(deleteTarget);
                return next;
            });
            fetchWorkOrders();
            toast.success('Work order deleted successfully');
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete work order:', error);
            toast.error('Failed to delete work order');
        }
    };

    const getStatusColor = (status) => {
        if (!status) return '#6b7280';
        return statusColors[status.toLowerCase()] || '#6b7280';
    };

    const filteredOrders = workOrders.filter(order => {
        // Apply search filter
        const matchesSearch =
            order.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.clientName?.toLowerCase().includes(searchTerm.toLowerCase());

        // Apply tab filter
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    // Define filter tabs
    const filterTabs = [
        { id: 'all', label: 'All Orders', count: workOrders.length },
        { id: 'draft', label: 'Draft', count: workOrders.filter(o => o.status === 'draft').length },
        { id: 'scheduled', label: 'Scheduled', count: workOrders.filter(o => o.status === 'scheduled').length },
        { id: 'in-progress', label: 'In Progress', count: workOrders.filter(o => o.status === 'in-progress').length },
        { id: 'completed', label: 'Completed', count: workOrders.filter(o => o.status === 'completed').length },
        { id: 'invoiced', label: 'Invoiced', count: workOrders.filter(o => o.status === 'invoiced').length }
    ];

    // Get unique statuses for filter
    const uniqueStatuses = Array.from(new Set([
        ...workOrders.map(o => o.status),
        'draft', 'scheduled', 'in-progress', 'completed'
    ])).filter(Boolean);

    const handleExportExcel = () => {
        const formattedData = formatWorkOrdersForExcel(workOrders);
        exportToExcel(formattedData, `work-orders-${new Date().toISOString().split('T')[0]}`, 'Work Orders');
    };

    const handleViewChange = (newView) => {
        setViewMode(newView);
        localStorage.setItem('workOrdersViewMode', newView);
    };

    return (
        <div className="dashboard animate-fadeIn" data-tour="work-orders">
            <PageHeader
                title="Work Orders"
                subtitle="Track and manage operational tasks and team schedules"
                icon={ClipboardList}
                actions={
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
                        <button
                            className="btn-modern btn-modern-primary"
                            onClick={() => navigate('/work-orders/new')}
                        >
                            <Plus size={18} /> New Order
                        </button>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <button
                                className="btn-modern btn-modern-secondary"
                                onClick={() => navigate('/work-orders/templates')}
                            >
                                <ClipboardList size={18} /> Templates
                            </button>
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
                        <button className="btn-modern btn-modern-secondary" onClick={handleExportExcel}>
                            <Download size={18} /> Export
                        </button>
                    </div>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '0', maxWidth: '100%', width: '100%' }}>
                        <SearchBar
                            value={searchTerm}
                            onChange={setSearchTerm}
                            placeholder="Search work orders..."
                        />
                    </div>
                </div>
                <FilterTabs
                    filters={filterTabs}
                    activeFilter={statusFilter}
                    onFilterChange={setStatusFilter}
                />
            </PageHeader>

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
                        <button className="btn-modern btn-modern-danger btn-sm" onClick={handleBulkDelete}>
                            <Trash2 size={16} />
                            Delete Selected
                        </button>
                        <button className="btn-modern btn-modern-secondary btn-sm" onClick={() => {
                            setSelectedOrders(new Set());
                            setShowBulkActions(false);
                        }}>
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}


            {/* Select All Button */}
            {!loading && filteredOrders.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className="btn-modern btn-modern-secondary btn-sm"
                        onClick={handleSelectAll}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
                        <p style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>Synchronizing Operational Dispatch...</p>
                    </div>
                </div>
            ) : filteredOrders.length === 0 ? (
                <EmptyWorkOrders onCreate={() => navigate('/work-orders/new')} />
            ) : (
                <div className="animate-fadeIn">
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                        <div className="work-orders-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
                            {filteredOrders.map(order => {
                                const isSelected = selectedOrders.has(order.id);
                                const statusColor = getStatusColor(order.status);

                                return (
                                    <div key={order.id} className="modern-card" onClick={() => navigate(`/work-orders/${order.id}`)} style={{
                                        cursor: 'pointer',
                                        borderTop: `4px solid ${statusColor}`,
                                        position: 'relative',
                                        border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                                        padding: '28px'
                                    }}>
                                        <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
                                            <label className="checkbox-custom" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} />
                                                <span className="checkmark"></span>
                                            </label>
                                        </div>

                                        <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
                                            <button
                                                className="btn-modern btn-modern-secondary"
                                                onClick={(e) => handleDelete(order.id, e)}
                                                style={{ padding: '8px', color: 'var(--error-600)' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div style={{ marginTop: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                                <span style={{ fontWeight: '900', color: 'var(--primary-600)', fontSize: '13px', letterSpacing: '0.05em' }}>{order.workOrderNumber}</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '4px 12px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: `${statusColor}15`,
                                                    color: statusColor,
                                                    textTransform: 'uppercase',
                                                    fontWeight: '900',
                                                    letterSpacing: '0.05em',
                                                    border: `1px solid ${statusColor}30`
                                                }}>
                                                    {order.status}
                                                </span>
                                            </div>

                                            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: '1.3' }}>{order.title || 'Untitled Work Order'}</h3>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>CLIENT</p>
                                                    <p style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.clientName || 'Unassigned'}</p>
                                                </div>
                                                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                                    <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>VALUATION</p>
                                                    <p style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: 'var(--primary-700)' }}>${order.price || '0.00'}</p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-tertiary)', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                                {order.scheduledDate && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                                                        <Calendar size={14} color="var(--primary-500)" />
                                                        {new Date(order.scheduledDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                )}
                                                {order.address && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600' }}>
                                                        <MapPin size={14} color="var(--primary-500)" />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.address}</span>
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
                        <div className="modern-card" style={{ padding: 0, overflow: 'hidden' }}>
                            {filteredOrders.map((order) => {
                                const isSelected = selectedOrders.has(order.id);
                                const statusColor = getStatusColor(order.status);
                                return (
                                    <div
                                        key={order.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '20px 24px',
                                            borderBottom: '1px solid var(--border-color)',
                                            borderLeft: `6px solid ${statusColor}`,
                                            background: isSelected ? 'var(--primary-50)' : 'white',
                                            transition: 'all 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => navigate(`/work-orders/${order.id}`)}
                                    >
                                        <div style={{ marginRight: '24px' }}>
                                            <label className="checkbox-custom" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} />
                                                <span className="checkmark"></span>
                                            </label>
                                        </div>
                                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(150px, 1fr) 150px 120px', gap: '32px', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: '900', fontSize: '15px', color: 'var(--primary-600)', marginBottom: '2px' }}>{order.workOrderNumber}</div>
                                                <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-primary)' }}>{order.title || 'Untitled'}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>CLIENT</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>{order.clientName || 'Standard Client'}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2px' }}>SCHEDULED</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={14} />
                                                    {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : 'TBD'}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '4px 10px',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: `${statusColor}15`,
                                                    color: statusColor,
                                                    textTransform: 'uppercase',
                                                    fontWeight: '900',
                                                    letterSpacing: '0.05em',
                                                    border: `1px solid ${statusColor}30`
                                                }}>
                                                    {order.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', marginLeft: '32px' }}>
                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={(e) => handleDelete(order.id, e)}>
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
                        <div className="modern-card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '48px', textAlign: 'center' }}>
                                            <label className="checkbox-custom">
                                                <input type="checkbox" checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0} onChange={handleSelectAll} />
                                                <span className="checkmark"></span>
                                            </label>
                                        </th>
                                        <th>Identifier</th>
                                        <th>Lead Orchestration</th>
                                        <th>Client Asset</th>
                                        <th>Timeline</th>
                                        <th>Orchestration Status</th>
                                        <th style={{ textAlign: 'right' }}>Valuation</th>
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const isSelected = selectedOrders.has(order.id);
                                        const statusColor = getStatusColor(order.status);
                                        return (
                                            <tr key={order.id} className={isSelected ? 'selected' : ''} style={{ borderLeft: `4px solid ${statusColor}` }}>
                                                <td style={{ textAlign: 'center' }}>
                                                    <label className="checkbox-custom" onClick={(e) => e.stopPropagation()}>
                                                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(order.id)} />
                                                        <span className="checkmark"></span>
                                                    </label>
                                                </td>
                                                <td style={{ fontWeight: '900', color: 'var(--primary-600)' }}>{order.workOrderNumber}</td>
                                                <td style={{ fontWeight: '800', fontSize: '14px' }}>{order.title || 'Untitled'}</td>
                                                <td style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>{order.clientName || '—'}</td>
                                                <td style={{ fontWeight: '700', color: 'var(--text-tertiary)' }}>
                                                    {order.scheduledDate ? new Date(order.scheduledDate).toLocaleDateString() : '—'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        fontSize: '10px',
                                                        padding: '4px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: `${statusColor}15`,
                                                        color: statusColor,
                                                        textTransform: 'uppercase',
                                                        fontWeight: '900',
                                                        letterSpacing: '0.05em',
                                                        border: `1px solid ${statusColor}30`
                                                    }}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--primary-700)' }}>${order.price || '0.00'}</td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${order.id}`); }}><ClipboardList size={16} /></button>
                                                        <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={(e) => handleDelete(order.id, e)}><Trash2 size={16} /></button>
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
            )}

            {/* Settings Modal */}
            <WorkOrderSettingsModal
                show={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                onSave={(settings) => {
                    setShowSettingsModal(false);
                    if (settings?.defaultViewMode) {
                        setViewMode(settings.defaultViewMode);
                        localStorage.setItem('workOrdersViewMode', settings.defaultViewMode);
                    }
                }}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => {
                    setShowDeleteConfirm(false);
                    setDeleteTarget(null);
                }}
                onConfirm={confirmDelete}
                title="Delete Work Order"
                message="Are you sure you want to delete this work order? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />

            {/* Bulk Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={showBulkDeleteConfirm}
                onClose={() => setShowBulkDeleteConfirm(false)}
                onConfirm={confirmBulkDelete}
                title="Delete Work Orders"
                message={`Are you sure you want to delete ${selectedOrders.size} work order${selectedOrders.size === 1 ? '' : 's'}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}

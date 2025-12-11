import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, DollarSign, User, MapPin, FileText, Receipt } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function WorkOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workOrder, setWorkOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState([]);

    useEffect(() => {
        fetchWorkOrder();
    }, [id]);

    const fetchWorkOrder = async () => {
        try {
            console.log('Fetching work order with ID:', id);
            const [workOrderRes, schedulesRes] = await Promise.all([
                api.get(`/work-orders/${id}`),
                api.get('/scheduling')
            ]);
            console.log('Work order response:', workOrderRes.data);
            setWorkOrder(workOrderRes.data);
            // Filter schedules for this work order
            const relatedSchedules = schedulesRes.data.filter(s => s.workOrderId === id);
            setSchedules(relatedSchedules);
        } catch (error) {
            console.error('Failed to fetch work order:', error);
            console.error('Error details:', error.response?.data);
            // Set workOrder to null so "not found" message shows
            setWorkOrder(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this work order?')) return;

        try {
            await api.delete(`/work-orders/${id}`);
            navigate('/work-orders');
        } catch (error) {
            console.error('Failed to delete work order:', error);
            alert('Failed to delete work order');
        }
    };

    const handleCreateInvoice = () => {
        // Navigate to invoice creation form with work order data pre-filled
        navigate('/invoices/new', {
            state: {
                fromWorkOrder: true,
                workOrderId: workOrder.id,
                clientId: workOrder.clientId,
                clientName: workOrder.clientName,
                address: workOrder.address,
                items: workOrder.items || [],
                total: workOrder.price,
                notes: workOrder.notes
            }
        });
    };

    const handleSchedule = () => {
        navigate('/scheduling', {
            state: {
                fromWorkOrder: true,
                workOrderId: workOrder.id,
                clientId: workOrder.clientId,
                clientName: workOrder.clientName,
                propertyId: workOrder.propertyId,
                propertyAddress: workOrder.address,
                title: workOrder.title,
                description: workOrder.description
            }
        });
    };

    if (loading) return <div className="loading">Loading work order...</div>;
    if (!workOrder) return <div className="loading">Work order not found</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Work Order Details</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => navigate('/work-orders')}>
                                <ArrowLeft size={18} /> Back to Work Orders
                            </button>
                            <button className="btn btn-success" onClick={handleCreateInvoice}>
                                <Receipt size={18} /> Create Invoice
                            </button>
                            <button className="btn btn-info" onClick={handleSchedule}>
                                <Calendar size={18} /> Schedule
                            </button>
                            <button className="btn btn-primary" onClick={() => navigate(`/work-orders/edit/${id}`)}>
                                <Edit size={18} /> Edit
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                <Trash2 size={18} /> Delete
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    {/* Main Content */}
                    <div>
                        {/* Work Order Info */}
                        <div className="card" style={{ marginBottom: '24px' }}>
                            <h2 style={{ marginBottom: '16px' }}>{workOrder.title || 'Untitled Work Order'}</h2>
                            <div style={{ display: 'grid', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <User size={20} color="#6b7280" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Client</div>
                                        <div style={{ fontWeight: '500' }}>{workOrder.clientName || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <MapPin size={20} color="#6b7280" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Address</div>
                                        <div style={{ fontWeight: '500' }}>{workOrder.address || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Calendar size={20} color="#6b7280" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Scheduled Date</div>
                                        <div style={{ fontWeight: '500' }}>
                                            {workOrder.scheduledDate ? new Date(workOrder.scheduledDate).toLocaleDateString() : 'Not scheduled'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <DollarSign size={20} color="#6b7280" />
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Price</div>
                                        <div style={{ fontWeight: '600', fontSize: '18px', color: '#059669' }}>
                                            ${workOrder.price || '0.00'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Services */}
                        {workOrder.items && workOrder.items.length > 0 && (
                            <div className="card">
                                <h3 style={{ marginBottom: '16px' }}>Services</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {workOrder.items.map((item, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '12px',
                                                background: '#f9fafb',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '500' }}>{item.name}</div>
                                                {item.description && (
                                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ fontWeight: '600', color: '#059669' }}>
                                                ${item.price} {item.unit && `/ ${item.unit}`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div>
                        <div className="card">
                            <h3 style={{ marginBottom: '16px' }}>Status</h3>
                            <div style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: workOrder.status === 'completed' ? '#d1fae5' : '#dbeafe',
                                color: workOrder.status === 'completed' ? '#065f46' : '#1e40af',
                                fontWeight: '500',
                                textAlign: 'center',
                                textTransform: 'capitalize'
                            }}>
                                {workOrder.status || 'pending'}
                            </div>

                            <div style={{ marginTop: '24px' }}>
                                <h4 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Created</h4>
                                <div style={{ fontSize: '14px' }}>
                                    {new Date(workOrder.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            {workOrder.updatedAt && (
                                <div style={{ marginTop: '16px' }}>
                                    <h4 style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Last Updated</h4>
                                    <div style={{ fontSize: '14px' }}>
                                        {new Date(workOrder.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Schedule Status */}
                        {schedules.length > 0 && (
                            <div className="card" style={{ marginTop: '16px' }}>
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={18} /> Scheduled Jobs
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {schedules.map(schedule => (
                                        <div
                                            key={schedule.id}
                                            onClick={() => navigate('/scheduling')}
                                            style={{
                                                padding: '10px',
                                                background: '#f9fafb',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                borderLeft: `3px solid ${schedule.status === 'completed' ? '#10b981' : schedule.status === 'in-progress' ? '#3b82f6' : '#6b7280'}`
                                            }}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: '500', marginBottom: '4px' }}>
                                                {new Date(schedule.scheduledDate).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {schedule.startTime} - {schedule.endTime}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', textTransform: 'capitalize' }}>
                                                Status: {schedule.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {workOrder.notes && (
                            <div className="card" style={{ marginTop: '16px' }}>
                                <h3 style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FileText size={18} /> Notes
                                </h3>
                                <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6' }}>
                                    {workOrder.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .btn-success {
                    background: #059669;
                    color: white;
                }
                .btn-success:hover {
                    background: #047857;
                }
                .btn-info {
                    background: #0ea5e9;
                    color: white;
                }
                .btn-info:hover {
                    background: #0284c7;
                }
            `}</style>
        </div>
    );
}

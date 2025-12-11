import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Users, DollarSign, Calendar, FileText, Wrench,
    Package, ClipboardList, Pin, Settings as SettingsIcon, X, Plus
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function Dashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalCustomers: 0,
        totalWorkOrders: 0,
        totalServices: 0,
        totalContracts: 0,
        recentWorkOrders: [],
        upcomingJobs: []
    });
    const [loading, setLoading] = useState(true);
    const [pinnedWidgets, setPinnedWidgets] = useState(() => {
        const saved = localStorage.getItem('pinnedWidgets');
        return saved ? JSON.parse(saved) : [
            'quick-actions',
            'recent-work-orders',
            'upcoming-jobs',
            'stats-overview'
        ];
    });
    const [showCustomize, setShowCustomize] = useState(false);

    // All available widgets
    const availableWidgets = [
        { id: 'quick-actions', name: 'Quick Actions', icon: Plus },
        { id: 'stats-overview', name: 'Statistics Overview', icon: TrendingUp },
        { id: 'recent-work-orders', name: 'Recent Work Orders', icon: ClipboardList },
        { id: 'upcoming-jobs', name: 'Upcoming Jobs', icon: Calendar },
        { id: 'customer-summary', name: 'Customer Summary', icon: Users },
        { id: 'service-catalog', name: 'Service Catalog', icon: Package }
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        localStorage.setItem('pinnedWidgets', JSON.stringify(pinnedWidgets));
    }, [pinnedWidgets]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [customers, workOrders, services, contracts] = await Promise.all([
                api.get('/customers').catch(() => ({ data: [] })),
                api.get('/work-orders').catch(() => ({ data: [] })),
                api.get('/services').catch(() => ({ data: [] })),
                api.get('/contracts').catch(() => ({ data: [] }))
            ]);

            const today = new Date();
            const upcomingJobs = (workOrders.data || [])
                .filter(wo => {
                    if (!wo.scheduledDate) return false;
                    const jobDate = new Date(wo.scheduledDate);
                    return jobDate >= today && wo.status !== 'completed';
                })
                .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
                .slice(0, 5);

            const recentWorkOrders = (workOrders.data || [])
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);

            setStats({
                totalCustomers: customers.data?.length || 0,
                totalWorkOrders: workOrders.data?.length || 0,
                totalServices: services.data?.length || 0,
                totalContracts: contracts.data?.length || 0,
                recentWorkOrders,
                upcomingJobs
            });
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleWidget = (widgetId) => {
        setPinnedWidgets(prev => {
            if (prev.includes(widgetId)) {
                return prev.filter(id => id !== widgetId);
            } else {
                return [...prev, widgetId];
            }
        });
    };

    const renderWidget = (widgetId) => {
        switch (widgetId) {
            case 'quick-actions':
                return (
                    <div className="widget" key={widgetId}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Quick Actions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <button
                                onClick={() => navigate('/work-orders/new')}
                                className="quick-action-btn"
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Wrench size={24} color="#2563eb" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>New Work Order</span>
                            </button>
                            <button
                                onClick={() => navigate('/customers')}
                                className="quick-action-btn"
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Users size={24} color="#059669" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>View Customers</span>
                            </button>
                            <button
                                onClick={() => navigate('/services')}
                                className="quick-action-btn"
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Package size={24} color="#7c3aed" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Services</span>
                            </button>
                            <button
                                onClick={() => navigate('/contracts')}
                                className="quick-action-btn"
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    border: '2px solid #e5e7eb',
                                    background: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <FileText size={24} color="#dc2626" />
                                <span style={{ fontSize: '14px', fontWeight: '500' }}>Contracts</span>
                            </button>
                        </div>
                    </div>
                );

            case 'stats-overview':
                return (
                    <div className="widget" key={widgetId}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Overview</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <Users size={24} />
                                    <span style={{ fontSize: '14px', opacity: 0.9 }}>Customers</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.totalCustomers}</div>
                            </div>
                            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <ClipboardList size={24} />
                                    <span style={{ fontSize: '14px', opacity: 0.9 }}>Work Orders</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.totalWorkOrders}</div>
                            </div>
                            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <Package size={24} />
                                    <span style={{ fontSize: '14px', opacity: 0.9 }}>Services</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.totalServices}</div>
                            </div>
                            <div style={{ padding: '20px', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '12px', color: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <FileText size={24} />
                                    <span style={{ fontSize: '14px', opacity: 0.9 }}>Contracts</span>
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats.totalContracts}</div>
                            </div>
                        </div>
                    </div>
                );

            case 'recent-work-orders':
                return (
                    <div className="widget" key={widgetId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Recent Work Orders</h3>
                            <button onClick={() => navigate('/work-orders')} className="btn btn-sm btn-secondary">View All</button>
                        </div>
                        {stats.recentWorkOrders.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No work orders yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {stats.recentWorkOrders.map(wo => (
                                    <div
                                        key={wo.id}
                                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                                        style={{
                                            padding: '12px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: 'white'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: '500' }}>{wo.title || 'Untitled'}</span>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                background: wo.status === 'completed' ? '#d1fae5' : '#dbeafe',
                                                color: wo.status === 'completed' ? '#065f46' : '#1e40af'
                                            }}>
                                                {wo.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                            {wo.clientName} • ${wo.price || '0.00'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'upcoming-jobs':
                return (
                    <div className="widget" key={widgetId}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Upcoming Jobs</h3>
                        {stats.upcomingJobs.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>No upcoming jobs scheduled</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {stats.upcomingJobs.map(job => (
                                    <div
                                        key={job.id}
                                        onClick={() => navigate(`/work-orders/${job.id}`)}
                                        style={{
                                            padding: '12px',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            background: 'white'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <Calendar size={16} color="#2563eb" />
                                            <span style={{ fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>
                                                {new Date(job.scheduledDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div style={{ fontWeight: '500' }}>{job.title || 'Untitled'}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{job.clientName}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'customer-summary':
                return (
                    <div className="widget" key={widgetId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Customer Summary</h3>
                            <button onClick={() => navigate('/customers')} className="btn btn-sm btn-secondary">Manage</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <Users size={48} color="#6b7280" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontSize: '36px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                                {stats.totalCustomers}
                            </div>
                            <div style={{ color: '#6b7280' }}>Total Customers</div>
                        </div>
                    </div>
                );

            case 'service-catalog':
                return (
                    <div className="widget" key={widgetId}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Service Catalog</h3>
                            <button onClick={() => navigate('/services')} className="btn btn-sm btn-secondary">View All</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <Package size={48} color="#6b7280" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontSize: '36px', fontWeight: '700', color: '#111827', marginBottom: '8px' }}>
                                {stats.totalServices}
                            </div>
                            <div style={{ color: '#6b7280' }}>Available Services</div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Dashboard</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                    Welcome to your workspace
                                </p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCustomize(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <SettingsIcon size={18} /> Customize Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    {pinnedWidgets.map(widgetId => renderWidget(widgetId))}
                </div>

                {pinnedWidgets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Pin size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                            No Widgets Pinned
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Click "Customize Dashboard" to pin widgets to your dashboard
                        </p>
                        <button onClick={() => setShowCustomize(true)} className="btn btn-primary">
                            <SettingsIcon size={18} /> Customize Dashboard
                        </button>
                    </div>
                )}
            </div>

            {/* Customize Modal */}
            {showCustomize && (
                <div className="modal-overlay" onClick={() => setShowCustomize(false)} style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                        background: 'white', borderRadius: '12px', width: '90%', maxWidth: '600px',
                        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Customize Dashboard</h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                        Pin or unpin widgets to customize your dashboard
                                    </p>
                                </div>
                                <button onClick={() => setShowCustomize(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {availableWidgets.map(widget => {
                                    const isPinned = pinnedWidgets.includes(widget.id);
                                    const Icon = widget.icon;
                                    return (
                                        <div
                                            key={widget.id}
                                            onClick={() => toggleWidget(widget.id)}
                                            style={{
                                                padding: '16px',
                                                border: `2px solid ${isPinned ? '#2563eb' : '#e5e7eb'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: isPinned ? '#eff6ff' : 'white',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px'
                                            }}
                                        >
                                            <Icon size={24} color={isPinned ? '#2563eb' : '#6b7280'} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: '500', color: isPinned ? '#2563eb' : '#111827' }}>
                                                    {widget.name}
                                                </div>
                                            </div>
                                            {isPinned && (
                                                <Pin size={20} color="#2563eb" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCustomize(false)} className="btn btn-primary">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .widget {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .quick-action-btn:hover {
                    border-color: #2563eb;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}

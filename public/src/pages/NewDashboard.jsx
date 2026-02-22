import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp, Users, DollarSign, Calendar, FileText, Wrench,
    Package, ClipboardList, Pin, Settings as SettingsIcon, X, Plus
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.jpeg';
import Skeleton, { SkeletonText } from '../components/ui/Skeleton';

export default function Dashboard() {
    const navigate = useNavigate();
    const { t } = useTranslation();
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
        { id: 'quick-actions', name: t('dashboard.quickActions'), icon: Plus },
        { id: 'stats-overview', name: t('dashboard.statisticsOverview'), icon: TrendingUp },
        { id: 'recent-work-orders', name: t('dashboard.recentWorkOrders'), icon: ClipboardList },
        { id: 'upcoming-jobs', name: t('dashboard.upcomingSchedule'), icon: Calendar },
        { id: 'customer-summary', name: t('dashboard.customerSummary'), icon: Users },
        { id: 'service-catalog', name: t('dashboard.serviceCatalog'), icon: Package }
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
            // Fetch pre-aggregated stats from backend optimized endpoint
            const response = await api.get('/reports/dashboard-stats');
            // Support both direct response and {data: ...} wrapper
            const data = response?.data || response || {};

            setStats({
                totalCustomers: data.totalCustomers || 0,
                totalWorkOrders: data.totalWorkOrders || 0,
                totalServices: data.totalServices || 0,
                totalContracts: data.totalContracts || 0,
                recentWorkOrders: data.recentWorkOrders || [],
                upcomingJobs: data.upcomingJobs || []
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

    const renderSkeleton = (type) => {
        switch (type) {
            case 'stats-overview':
                return (
                    <div className="modern-card" key={type}>
                        <Skeleton width="40%" height="20px" style={{ marginBottom: 'var(--space-6)' }} />
                        <div className="dashboard-skeleton-grid">
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} variant="rounded" height="100px" />
                            ))}
                        </div>
                    </div>
                );
            case 'recent-work-orders':
            case 'upcoming-jobs':
                return (
                    <div className="modern-card" key={type}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
                            <Skeleton width="30%" height="24px" />
                            <Skeleton width="60px" height="32px" />
                        </div>
                        <SkeletonText lines={4} className="mb-4" />
                    </div>
                );
            case 'quick-actions':
                return (
                    <div className="modern-card" key={type}>
                        <Skeleton width="30%" height="20px" style={{ marginBottom: 'var(--space-5)' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} variant="rounded" height="80px" />
                            ))}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="modern-card" key={type}>
                        <Skeleton width="40%" height="24px" style={{ marginBottom: 'var(--space-5)' }} />
                        <Skeleton variant="rounded" height="120px" />
                    </div>
                );
        }
    };

    const renderWidget = (widgetId) => {
        if (loading) {
            return renderSkeleton(widgetId);
        }

        switch (widgetId) {
            case 'quick-actions':
                return (
                    <div className="modern-card" key={widgetId}>
                        <h3 className="modern-card-title" style={{ marginBottom: 'var(--space-4)' }}>{t('dashboard.quickActions')}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                            <button
                                onClick={() => navigate('/work-orders/new')}
                                className="btn-modern btn-modern-secondary"
                                style={{
                                    flexDirection: 'column',
                                    height: 'auto',
                                    padding: '20px'
                                }}
                            >
                                <Wrench size={24} color="var(--primary-600)" />
                                <span>{t('workOrders.newWorkOrder')}</span>
                            </button>
                            <button
                                onClick={() => navigate('/clients')}
                                className="btn-modern btn-modern-secondary"
                                style={{
                                    flexDirection: 'column',
                                    height: 'auto',
                                    padding: '20px'
                                }}
                            >
                                <Users size={24} color="var(--color-success)" />
                                <span>{t('clients.title')}</span>
                            </button>
                            <button
                                onClick={() => navigate('/services')}
                                className="btn-modern btn-modern-secondary"
                                style={{
                                    flexDirection: 'column',
                                    height: 'auto',
                                    padding: '20px'
                                }}
                            >
                                <Package size={24} color="var(--primary-400)" />
                                <span>{t('sidebar.services')}</span>
                            </button>
                            <button
                                onClick={() => navigate('/contracts')}
                                className="btn-modern btn-modern-secondary"
                                style={{
                                    flexDirection: 'column',
                                    height: 'auto',
                                    padding: '20px'
                                }}
                            >
                                <FileText size={24} color="var(--color-error)" />
                                <span>{t('sidebar.contracts')}</span>
                            </button>
                        </div>
                    </div>
                );

            case 'stats-overview':
                return (
                    <div className="modern-card" key={widgetId}>
                        <h3 className="modern-card-title" style={{ marginBottom: '16px' }}>{t('dashboard.overview')}</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                            {[
                                { label: t('clients.title'), value: stats.totalCustomers, icon: Users, color: 'var(--primary-600)', bg: 'var(--primary-50)' },
                                { label: t('workOrders.title'), value: stats.totalWorkOrders, icon: ClipboardList, color: 'var(--color-warning)', bg: '#fffbeb' },
                                { label: t('sidebar.services'), value: stats.totalServices, icon: Package, color: 'var(--primary-400)', bg: '#f0f9ff' },
                                { label: t('sidebar.contracts'), value: stats.totalContracts, icon: FileText, color: 'var(--color-success)', bg: '#ecfdf5' }
                            ].map((stat, i) => (
                                <div key={i} style={{
                                    padding: '20px',
                                    background: stat.bg,
                                    borderRadius: '12px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <stat.icon size={20} color={stat.color} />
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{stat.label}</span>
                                    </div>
                                    <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{stat.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'recent-work-orders':
                return (
                    <div className="widget" key={widgetId} style={{ minHeight: '340px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{t('dashboard.recentWorkOrders')}</h3>
                            <button onClick={() => navigate('/work-orders')} className="btn btn-sm btn-secondary">{t('dashboard.viewAll')}</button>
                        </div>
                        {stats.recentWorkOrders.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>{t('workOrders.noWorkOrders')}</p>
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
                                                {t(`workOrders.${wo.status}`) || wo.status}
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
                    <div className="widget" key={widgetId} style={{ minHeight: '340px' }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>{t('dashboard.upcomingSchedule')}</h3>
                        {stats.upcomingJobs.length === 0 ? (
                            <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>{t('dashboard.noUpcomingJobs')}</p>
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
                    <div className="widget" key={widgetId} style={{ minHeight: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{t('dashboard.customerSummary')}</h3>
                            <button onClick={() => navigate('/customers')} className="btn btn-sm btn-secondary">{t('dashboard.manage')}</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '20px 20px' }}>
                            <Users size={40} color="#6b7280" style={{ margin: '0 auto 12px' }} />
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                                {stats.totalCustomers}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '14px' }}>{t('dashboard.totalCustomers')}</div>
                        </div>
                    </div>
                );

            case 'service-catalog':
                return (
                    <div className="widget" key={widgetId} style={{ minHeight: '200px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{t('dashboard.serviceCatalog')}</h3>
                            <button onClick={() => navigate('/services')} className="btn btn-sm btn-secondary">{t('dashboard.viewAll')}</button>
                        </div>
                        <div style={{ textAlign: 'center', padding: '20px 20px' }}>
                            <Package size={40} color="#6b7280" style={{ margin: '0 auto 12px' }} />
                            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                                {stats.totalServices}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '14px' }}>{t('dashboard.availableServices')}</div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="dashboard" data-tour="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">{t('dashboard.title')}</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                    {t('dashboard.welcomeWorkspace')}
                                </p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCustomize(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <SettingsIcon size={18} /> {t('dashboard.customize')}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ marginTop: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                    {pinnedWidgets.map(widgetId => renderWidget(widgetId))}
                </div>

                {!loading && pinnedWidgets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Pin size={64} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
                        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                            {t('dashboard.noWidgets')}
                        </h2>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            {t('dashboard.clickToCustomize')}
                        </p>
                        <button onClick={() => setShowCustomize(true)} className="btn btn-primary">
                            <SettingsIcon size={18} /> {t('dashboard.customize')}
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
                                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{t('dashboard.customize')}</h2>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                        {t('dashboard.pinDescription')}
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
                                {t('dashboard.done')}
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
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </div>
    );
}

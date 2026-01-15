import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Users, ClipboardList, Package, Calendar,
  ArrowUp, ArrowDown, BarChart3, PieChart, Activity, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [invoices, workOrders, clients, services, products] = await Promise.all([
        api.get('/invoices'),
        api.get('/work-orders'),
        api.get('/customers'),
        api.get('/services'),
        api.get('/products')
      ]);

      calculateMetrics({
        invoices: invoices.data,
        workOrders: workOrders.data,
        clients: clients.data,
        services: services.data,
        products: products.data
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (data) => {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - (parseInt(timeRange) * 24 * 60 * 60 * 1000));

    // Filter data by time range
    const recentInvoices = data.invoices.filter(inv =>
      new Date(inv.createdAt) >= daysAgo
    );
    const recentWorkOrders = data.workOrders.filter(wo =>
      new Date(wo.createdAt) >= daysAgo
    );
    const recentClients = data.clients.filter(c =>
      new Date(c.createdAt) >= daysAgo
    );

    // Calculate revenue metrics
    const totalRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paidRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const pendingRevenue = totalRevenue - paidRevenue;

    // Work order metrics
    const completedOrders = recentWorkOrders.filter(wo => wo.status === 'completed').length;
    const pendingOrders = recentWorkOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled').length;
    const totalOrders = recentWorkOrders.length;

    // Client metrics
    const totalClients = data.clients.length;
    const newClients = recentClients.length;
    const activeClients = data.clients.filter(c => {
      const hasRecentActivity = data.workOrders.some(wo =>
        wo.clientId === c.id && new Date(wo.createdAt) >= daysAgo
      );
      return hasRecentActivity;
    }).length;

    // Revenue by month
    const revenueByMonth = {};
    recentInvoices.forEach(inv => {
      const month = new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (inv.total || 0);
    });

    // Work orders by status
    const ordersByStatus = recentWorkOrders.reduce((acc, wo) => {
      acc[wo.status] = (acc[wo.status] || 0) + 1;
      return acc;
    }, {});

    // Top services
    const serviceUsage = {};
    data.workOrders.forEach(wo => {
      if (wo.items && Array.isArray(wo.items)) {
        wo.items.forEach(item => {
          serviceUsage[item.name] = (serviceUsage[item.name] || 0) + 1;
        });
      }
    });
    const topServices = Object.entries(serviceUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    setMetrics({
      revenue: {
        total: totalRevenue,
        paid: paidRevenue,
        pending: pendingRevenue,
        average: totalOrders > 0 ? totalRevenue / totalOrders : 0
      },
      workOrders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
      },
      clients: {
        total: totalClients,
        new: newClients,
        active: activeClients
      },
      charts: {
        revenueByMonth,
        ordersByStatus,
        topServices
      }
    });
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '14px',
            color: trend > 0 ? '#10b981' : '#ef4444',
            fontWeight: '500'
          }}>
            {trend > 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>
        {value}
      </h3>
      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{title}</p>
      {subtitle && (
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#9ca3af' }}>{subtitle}</p>
      )}
    </div>
  );

  const BarChart = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) {
      return <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>No data available</p>;
    }

    const maxValue = Math.max(...Object.values(data));

    return (
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'end', gap: '12px', height: '200px' }}>
          {Object.entries(data).map(([label, value]) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '100%',
                height: `${(value / maxValue) * 100}%`,
                background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '8px 8px 0 0',
                minHeight: '20px',
                position: 'relative',
                transition: 'all 0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {typeof value === 'number' && value > 1000 ? `$${(value / 1000).toFixed(1)}k` : value}
                </span>
              </div>
              <span style={{
                fontSize: '11px',
                color: '#6b7280',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <div className="container">
            <div className="header-content">
              <div className="dashboard-brand">
                <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                <div className="brand-text">
                  <h1 className="brand-title">Analytics</h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="container" style={{ marginTop: '24px', textAlign: 'center', padding: '60px' }}>
          <RefreshCw size={48} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#6b7280' }}>Loading analytics...</p>
        </div>
        <style>{`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="container">
          <div className="header-content">
            <div className="dashboard-brand">
              <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
              <div className="brand-text">
                <h1 className="brand-title">Analytics & Insights</h1>
              </div>
            </div>
            <div className="header-actions">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="form-control"
                style={{ width: '150px' }}
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <button className="btn btn-secondary" onClick={fetchAnalytics}>
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container" style={{ marginTop: '24px' }}>
        {metrics && (
          <>
            {/* Revenue Metrics */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Revenue Overview
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <MetricCard
                  title="Total Revenue"
                  value={`$${metrics.revenue.total.toFixed(2)}`}
                  subtitle={`Last ${timeRange} days`}
                  icon={DollarSign}
                  color="#10b981"
                />
                <MetricCard
                  title="Paid Amount"
                  value={`$${metrics.revenue.paid.toFixed(2)}`}
                  subtitle={`${((metrics.revenue.paid / metrics.revenue.total) * 100 || 0).toFixed(1)}% collected`}
                  icon={TrendingUp}
                  color="#3b82f6"
                />
                <MetricCard
                  title="Pending Payment"
                  value={`$${metrics.revenue.pending.toFixed(2)}`}
                  subtitle="Outstanding invoices"
                  icon={Activity}
                  color="#f59e0b"
                />
                <MetricCard
                  title="Average Order"
                  value={`$${metrics.revenue.average.toFixed(2)}`}
                  subtitle="Per work order"
                  icon={BarChart3}
                  color="#8b5cf6"
                />
              </div>
            </div>

            {/* Work Order Metrics */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                Work Orders
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <MetricCard
                  title="Total Orders"
                  value={metrics.workOrders.total}
                  subtitle={`Last ${timeRange} days`}
                  icon={ClipboardList}
                  color="#3b82f6"
                />
                <MetricCard
                  title="Completed"
                  value={metrics.workOrders.completed}
                  subtitle={`${metrics.workOrders.completionRate.toFixed(1)}% completion rate`}
                  icon={Activity}
                  color="#10b981"
                />
                <MetricCard
                  title="In Progress"
                  value={metrics.workOrders.pending}
                  subtitle="Active work orders"
                  icon={Calendar}
                  color="#f59e0b"
                />
                <MetricCard
                  title="Total Clients"
                  value={metrics.clients.total}
                  subtitle={`${metrics.clients.new} new this period`}
                  icon={Users}
                  color="#8b5cf6"
                />
              </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <BarChart data={metrics.charts.revenueByMonth} title="Revenue by Month" />
              <BarChart data={metrics.charts.ordersByStatus} title="Orders by Status" />
            </div>

            {/* Top Services */}
            {metrics.charts.topServices.length > 0 && (
              <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                  Top Services
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {metrics.charts.topServices.map(([service, count], index) => (
                    <div key={service} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#f9fafb',
                      borderRadius: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#3b82f6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{service}</div>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>{count} orders</div>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

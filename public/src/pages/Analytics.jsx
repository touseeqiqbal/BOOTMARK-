import { useState, useEffect } from 'react';
import {
  TrendingUp, DollarSign, Users, ClipboardList, Package, Calendar,
  ArrowUp, ArrowDown, BarChart3, PieChart, Activity, RefreshCw
} from 'lucide-react';
import api from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import logo from '../assets/logo.jpeg';

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
    <div className="modern-card animate-fadeIn" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-lg)',
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon size={24} color={color} />
        </div>
        {trend && (
          <div className={`badge ${trend > 0 ? 'badge-success' : 'badge-error'}`} style={{ border: 'none' }}>
            {trend > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 style={{ margin: '0 0 6px 0', fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </h3>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      {subtitle && (
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{subtitle}</p>
      )}
    </div>
  );

  const BarChart = ({ data, title }) => {
    if (!data || Object.keys(data).length === 0) {
      return <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>No data available</p>;
    }

    const maxValue = Math.max(...Object.values(data));

    return (
      <div className="modern-card animate-fadeIn" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <TrendingUp size={18} color="var(--primary-500)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'end', gap: '16px', height: '220px', padding: '0 8px' }}>
          {Object.entries(data).map(([label, value]) => (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '100%',
                height: `${(value / maxValue) * 100}%`,
                background: 'linear-gradient(180deg, var(--primary-500) 0%, var(--primary-700) 100%)',
                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                minHeight: '4px',
                position: 'relative',
                transition: 'all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-28px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  background: 'var(--bg-secondary)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)'
                }}>
                  {typeof value === 'number' && value > 1000 ? `$${(value / 1000).toFixed(1)}k` : value}
                </div>
              </div>
              <span style={{
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                textAlign: 'center',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
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
      <div className="dashboard animate-fadeIn">
        <PageHeader title="Analytics" />
        <div className="container" style={{ marginTop: '24px', textAlign: 'center', padding: '100px 20px' }}>
          <div className="modern-card" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', padding: '40px' }}>
            <RefreshCw size={48} color="var(--primary-500)" style={{ animation: 'spin 2s linear infinite' }} />
            <p style={{ marginTop: '24px', color: 'var(--text-tertiary)', fontWeight: '600', fontSize: '18px' }}>Processing business intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard animate-fadeIn">
      <PageHeader
        title="Analytics & Insights"
        subtitle="Business performance and operational trends"
        actions={
          <>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="btn-modern btn-modern-secondary"
              style={{ width: 'auto', paddingRight: '32px' }}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            <button className="btn-modern btn-modern-primary" onClick={fetchAnalytics}>
              <RefreshCw size={18} /> Refresh
            </button>
          </>
        }
      />

      <div className="container" style={{ paddingTop: 0, marginTop: '24px' }}>
        {metrics && (
          <>
            {/* Revenue Metrics */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={20} color="var(--primary-500)" /> Revenue Overview
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
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
              <div className="modern-card animate-fadeIn" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Top Services
                  </h3>
                  <BarChart3 size={18} color="var(--primary-500)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {metrics.charts.topServices.map(([service, count], index) => (
                    <div key={service} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s',
                      cursor: 'default'
                    }} className="hover-elevate">
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--primary-500)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                        fontSize: '14px',
                        boxShadow: '0 4px 12px var(--shadow-color)'
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '15px' }}>{service}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{count} work orders</div>
                      </div>
                      <div className="badge badge-primary" style={{ padding: '6px 16px', fontSize: '14px' }}>
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

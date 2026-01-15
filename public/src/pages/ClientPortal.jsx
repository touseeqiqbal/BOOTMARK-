import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import {
  FileText, DollarSign, Briefcase, User, LogOut, Calendar,
  MessageSquare, Bell, CreditCard, Plus, TrendingUp, Clock,
  CheckCircle, AlertCircle, Package, Home, ClipboardList
} from 'lucide-react';
import { initializeSocket, joinUser, onNotification } from '../utils/socket';
import '../styles/modern-ui.css';
import '../styles/ClientPortal.css';

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Data states
  const [dashboardData, setDashboardData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/client/portal');
      return;
    }

    // Initialize Socket.IO for real-time updates
    initializeSocket();
    joinUser(user.uid);

    // Listen for notifications
    onNotification((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 10));
    });

    // Load initial data
    fetchDashboard();
  }, [user, navigate]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/clients/dashboard');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="client-portal-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const recentActivity = dashboardData?.recentActivity || [];

  return (
    <div className="client-portal">
      {/* Header */}
      <header className="client-portal-header">
        <div className="header-content">
          <div className="brand">
            <Home size={32} className="brand-icon" />
            <div>
              <h1>Client Portal</h1>
              <p>Welcome back, {user?.displayName || user?.email}</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-icon" title="Notifications">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            <button className="btn-icon" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="client-portal-nav">
        <button
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <TrendingUp size={20} />
          <span>Dashboard</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText size={20} />
          <span>Invoices</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'services' ? 'active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Briefcase size={20} />
          <span>Services</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'contracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contracts')}
        >
          <FileText size={20} />
          <span>Contracts</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <Plus size={20} />
          <span>New Request</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <MessageSquare size={20} />
          <span>Messages</span>
        </button>
        <button
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={20} />
          <span>Profile</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="client-portal-main">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            recentActivity={recentActivity}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView />
        )}

        {activeTab === 'services' && (
          <ServicesView />
        )}

        {activeTab === 'requests' && (
          <ServiceRequestView />
        )}

        {activeTab === 'messages' && (
          <MessagesView user={user} />
        )}

        {activeTab === 'contracts' && (
          <ContractsView />
        )}

        {activeTab === 'profile' && (
          <ProfileView user={user} />
        )}
      </main>
    </div>
  );
}

// Dashboard View Component
function DashboardView({ stats, recentActivity, onNavigate }) {
  return (
    <div className="dashboard-view">
      <h2>Dashboard Overview</h2>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card balance">
          <div className="stat-icon">
            <DollarSign size={32} />
          </div>
          <div className="stat-content">
            <h3>${stats.totalBalance || '0.00'}</h3>
            <p>Outstanding Balance</p>
            {stats.unpaidInvoices > 0 && (
              <button className="btn-link" onClick={() => onNavigate('invoices')}>
                Pay Now →
              </button>
            )}
          </div>
        </div>

        <div className="stat-card appointments">
          <div className="stat-icon">
            <Calendar size={32} />
          </div>
          <div className="stat-content">
            <h3>{stats.upcomingAppointments || 0}</h3>
            <p>Upcoming Appointments</p>
          </div>
        </div>

        <div className="stat-card services">
          <div className="stat-icon">
            <Package size={32} />
          </div>
          <div className="stat-content">
            <h3>{stats.activeServices || 0}</h3>
            <p>Active Services</p>
          </div>
        </div>

        <div className="stat-card documents">
          <div className="stat-icon">
            <FileText size={32} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalDocuments || 0}</h3>
            <p>Documents</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="btn-modern btn-modern-primary" onClick={() => onNavigate('invoices')}>
            <CreditCard size={24} />
            <span>Pay Invoice</span>
          </button>
          <button className="btn-modern btn-modern-secondary" onClick={() => onNavigate('requests')}>
            <Plus size={24} />
            <span>Request Service</span>
          </button>
          <button className="btn-modern btn-modern-secondary" onClick={() => onNavigate('messages')}>
            <MessageSquare size={24} />
            <span>Send Message</span>
          </button>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="activity-timeline">
        <h3>Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="empty-state">No recent activity</p>
        ) : (
          <div className="timeline-list">
            {recentActivity.map((activity, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-icon">
                  {activity.type === 'invoice' && <FileText size={16} />}
                  {activity.type === 'service' && <CheckCircle size={16} />}
                  {activity.type === 'appointment' && <Calendar size={16} />}
                </div>
                <div className="timeline-content">
                  <p className="timeline-title">{activity.title}</p>
                  <p className="timeline-date">{new Date(activity.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Invoices View Component
function InvoicesView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/clients/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading invoices...</div>;

  return (
    <div className="invoices-view">
      <h2>Your Invoices</h2>
      {invoices.length === 0 ? (
        <p className="empty-state">No invoices found</p>
      ) : (
        <div className="invoice-list">
          {invoices.map(invoice => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <h3>Invoice #{invoice.invoiceNumber}</h3>
                <span className={`status-badge ${invoice.status}`}>
                  {invoice.status}
                </span>
              </div>
              <div className="invoice-details">
                <p>Amount: ${invoice.total}</p>
                <p>Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
              {invoice.status === 'unpaid' && (
                <button className="btn-modern btn-modern-primary">Pay Now</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Services View Component
function ServicesView() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const response = await api.get('/clients/work-orders');
      setWorkOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading services...</div>;

  return (
    <div className="services-view">
      <h2>Your Services</h2>
      {workOrders.length === 0 ? (
        <p className="empty-state">No services found</p>
      ) : (
        <div className="service-list">
          {workOrders.map(order => (
            <div key={order.id} className="service-card">
              <h3>{order.title}</h3>
              <p className="service-status">Status: {order.status}</p>
              <p className="service-date">
                Scheduled: {new Date(order.scheduledDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Service Request View Component
function ServiceRequestView() {
  const [formData, setFormData] = useState({
    serviceType: '',
    description: '',
    preferredDate: '',
    priority: 'normal'
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/clients/service-requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/clients/service-requests', formData);
      setSuccess(true);
      setFormData({ serviceType: '', description: '', preferredDate: '', priority: 'normal' });
      setTimeout(() => setSuccess(false), 3000);
      // Refresh the list
      fetchRequests();
    } catch (error) {
      console.error('Failed to submit request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="service-request-view">
      <h2>Request a Service</h2>
      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          Request submitted successfully! We'll contact you soon.
        </div>
      )}
      <form onSubmit={handleSubmit} className="request-form">
        <div className="form-group">
          <label>Service Type *</label>
          <select
            required
            value={formData.serviceType}
            onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
            className="form-control"
          >
            <option value="">Select Service</option>
            <option value="lawn-care">Lawn Care</option>
            <option value="landscaping">Landscaping</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description *</label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-control"
            placeholder="Describe what you need..."
          />
        </div>

        <div className="form-group">
          <label>Preferred Date</label>
          <input
            type="date"
            value={formData.preferredDate}
            onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
            className="form-control"
          />
        </div>

        <div className="form-group">
          <label>Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            className="form-control"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <button type="submit" className="btn-modern btn-modern-primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      {/* Request History */}
      <div style={{ marginTop: '40px' }}>
        <h3>Your Service Requests</h3>
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={48} />
            <h2>No Requests Yet</h2>
            <p>Submit your first service request using the form above.</p>
          </div>
        ) : (
          <div className="invoice-list">
            {requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(request => (
              <div key={request.id} className="invoice-card">
                <div className="invoice-header">
                  <h3 style={{ textTransform: 'capitalize' }}>
                    {request.serviceType?.replace('-', ' ') || 'Service Request'}
                  </h3>
                  <span className={`status-badge ${request.status || 'pending'}`}>
                    {request.status || 'pending'}
                  </span>
                </div>
                <div className="invoice-details">
                  <p><strong>Description:</strong> {request.description}</p>
                  {request.preferredDate && (
                    <p><strong>Preferred Date:</strong> {new Date(request.preferredDate).toLocaleDateString()}</p>
                  )}
                  <p><strong>Priority:</strong> <span style={{ textTransform: 'capitalize' }}>{request.priority}</span></p>
                  <p><strong>Submitted:</strong> {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Messages View Component
function MessagesView({ user }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await api.get('/clients/messages');
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await api.post('/clients/messages', { message: newMessage });
      setNewMessage('');
      fetchMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="messages-view">
      <h2>Messages</h2>
      <div className="message-thread">
        {messages.length === 0 ? (
          <p className="empty-state">No messages yet</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message ${msg.fromClient ? 'sent' : 'received'}`}>
              <p className="message-text">{msg.message}</p>
              <span className="message-time">
                {new Date(msg.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSendMessage} className="message-composer">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="form-control"
        />
        <button type="submit" className="btn-modern btn-modern-primary" disabled={sending}>
          Send
        </button>
      </form>
    </div>
  );
}

// Profile View Component
function ProfileView({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/clients/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading profile...</div>;

  return (
    <div className="profile-view">
      <h2>Your Profile</h2>
      <div className="profile-card">
        <div className="profile-field">
          <label>Name</label>
          <p>{profile?.name || 'Not set'}</p>
        </div>
        <div className="profile-field">
          <label>Email</label>
          <p>{user?.email}</p>
        </div>
        <div className="profile-field">
          <label>Phone</label>
          <p>{profile?.phone || 'Not set'}</p>
        </div>
        <div className="profile-field">
          <label>Address</label>
          <p>{profile?.address || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
}

// Contracts View Component
function ContractsView() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clients/contracts');
      setContracts(response.data);
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    if (!signature.trim()) {
      alert('Please enter your signature');
      return;
    }

    setSigning(true);
    try {
      await api.post(`/clients/contracts/${selectedContract.id}/sign`, {
        signature: signature.trim(),
        signatureType: 'typed'
      });

      setShowSignModal(false);
      setSignature('');
      setSelectedContract(null);

      // Refresh contracts
      await fetchContracts();

      alert('Contract signed successfully!');
    } catch (error) {
      console.error('Failed to sign contract:', error);
      alert('Failed to sign contract. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { label: 'Draft', className: 'status-badge-draft' },
      pending: { label: 'Pending Signature', className: 'status-badge-pending' },
      signed: { label: 'Signed', className: 'status-badge-signed' },
      expired: { label: 'Expired', className: 'status-badge-expired' }
    };
    const badge = badges[status] || badges.draft;
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading contracts...</p>
      </div>
    );
  }

  return (
    <div className="contracts-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Contracts</h2>
      </div>

      {contracts.length > 0 ? (
        <div className="contracts-grid">
          {contracts.map(contract => (
            <div key={contract.id} className="contract-card">
              <div className="contract-header">
                <div>
                  <h3>{contract.title}</h3>
                  <p className="contract-date">
                    Created: {new Date(contract.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {getStatusBadge(contract.status)}
              </div>

              {contract.description && (
                <p className="contract-description">{contract.description}</p>
              )}

              {contract.value && (
                <div className="contract-value">
                  <DollarSign size={16} />
                  <span>${contract.value.toLocaleString()}</span>
                </div>
              )}

              <div className="contract-actions">
                <button
                  className="btn-modern btn-modern-secondary"
                  onClick={() => setSelectedContract(contract)}
                >
                  View Details
                </button>
                {contract.status === 'pending' && (
                  <button
                    className="btn-modern btn-modern-primary"
                    onClick={() => {
                      setSelectedContract(contract);
                      setShowSignModal(true);
                    }}
                  >
                    <CheckCircle size={16} />
                    Sign Contract
                  </button>
                )}
                {contract.status === 'signed' && contract.signedAt && (
                  <p className="signed-info">
                    <CheckCircle size={14} color="#10b981" />
                    Signed on {new Date(contract.signedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FileText size={64} color="#d1d5db" />
          <h3>No Contracts</h3>
          <p>You don't have any contracts yet.</p>
        </div>
      )}

      {/* Contract Detail Modal */}
      {selectedContract && !showSignModal && (
        <div className="modal-overlay" onClick={() => setSelectedContract(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedContract.title}</h2>
              <button className="modal-close" onClick={() => setSelectedContract(null)}>×</button>
            </div>
            <div className="modal-body">
              {getStatusBadge(selectedContract.status)}

              <div className="contract-details">
                <div className="detail-row">
                  <label>Created:</label>
                  <span>{new Date(selectedContract.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedContract.value && (
                  <div className="detail-row">
                    <label>Value:</label>
                    <span>${selectedContract.value.toLocaleString()}</span>
                  </div>
                )}
                {selectedContract.description && (
                  <div className="detail-section">
                    <label>Description:</label>
                    <p>{selectedContract.description}</p>
                  </div>
                )}
                {selectedContract.terms && (
                  <div className="detail-section">
                    <label>Terms & Conditions:</label>
                    <div className="contract-terms" dangerouslySetInnerHTML={{ __html: selectedContract.terms }} />
                  </div>
                )}
                {selectedContract.status === 'signed' && selectedContract.signature && (
                  <div className="detail-section">
                    <label>Signature:</label>
                    <div className="signature-display">
                      <p className="signature-text">{selectedContract.signature.data}</p>
                      <p className="signature-info">
                        Signed by {selectedContract.signature.signedBy} on{' '}
                        {new Date(selectedContract.signature.signedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedContract.status === 'pending' && (
                <button
                  className="btn-modern btn-modern-primary"
                  onClick={() => setShowSignModal(true)}
                >
                  <CheckCircle size={16} />
                  Sign Contract
                </button>
              )}
              <button
                className="btn-modern btn-modern-secondary"
                onClick={() => setSelectedContract(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignModal && selectedContract && (
        <div className="modal-overlay" onClick={() => setShowSignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sign Contract</h2>
              <button className="modal-close" onClick={() => setShowSignModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                By signing this contract, you agree to all terms and conditions outlined in "{selectedContract.title}".
              </p>

              <div className="signature-input">
                <label>Type your full name to sign:</label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Enter your full name"
                  className="input-modern"
                  style={{ fontFamily: 'cursive', fontSize: '24px', padding: '16px' }}
                />
              </div>

              {signature && (
                <div className="signature-preview">
                  <label>Signature Preview:</label>
                  <div className="signature-display">
                    <p className="signature-text">{signature}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-modern btn-modern-primary"
                onClick={handleSignContract}
                disabled={signing || !signature.trim()}
              >
                {signing ? 'Signing...' : 'Confirm Signature'}
              </button>
              <button
                className="btn-modern btn-modern-secondary"
                onClick={() => {
                  setShowSignModal(false);
                  setSignature('');
                }}
                disabled={signing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

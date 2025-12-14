import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function QuickBooks() {
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState(null);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            setLoading(true);
            const res = await api.get('/quickbooks/status');
            setConnected(res.data.connected);
            setConnectionInfo(res.data);
        } catch (error) {
            console.error('Error checking QuickBooks connection:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const res = await api.get('/quickbooks/auth-url');

            if (res.data.authUrl) {
                // Open QuickBooks OAuth in new window
                window.location.href = res.data.authUrl;
            }
        } catch (error) {
            console.error('Error connecting to QuickBooks:', error);
            const errorMsg = error.response?.data?.message || 'Failed to connect to QuickBooks';
            alert(errorMsg);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect QuickBooks? This will remove access to your QuickBooks data.')) {
            return;
        }

        try {
            await api.post('/quickbooks/disconnect');
            setConnected(false);
            setConnectionInfo(null);
            alert('Successfully disconnected from QuickBooks');
        } catch (error) {
            console.error('Error disconnecting QuickBooks:', error);
            alert('Failed to disconnect from QuickBooks');
        }
    };

    if (loading) {
        return <div className="loading">Loading QuickBooks settings...</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">QuickBooks Integration</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingBottom: '40px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
                        Connect your QuickBooks account to sync invoices and customers
                    </p>
                </div>

                {/* Connection Status Card */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px' }}>Connection Status</h2>
                        {connected ? (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: '#d1fae5',
                                color: '#065f46',
                                borderRadius: '8px',
                                fontWeight: '500'
                            }}>
                                <CheckCircle size={20} />
                                Connected
                            </div>
                        ) : (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: '8px',
                                fontWeight: '500'
                            }}>
                                <XCircle size={20} />
                                Not Connected
                            </div>
                        )}
                    </div>

                    {connected && connectionInfo ? (
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{
                                padding: '16px',
                                background: '#f9fafb',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                {connectionInfo.companyName && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Company: </span>
                                        <span style={{ fontWeight: '500' }}>{connectionInfo.companyName}</span>
                                    </div>
                                )}
                                {connectionInfo.realmId && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Realm ID: </span>
                                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{connectionInfo.realmId}</span>
                                    </div>
                                )}
                                {connectionInfo.lastSync && (
                                    <div>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>Last Sync: </span>
                                        <span style={{ fontSize: '13px' }}>{new Date(connectionInfo.lastSync).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                className="btn btn-danger"
                                onClick={handleDisconnect}
                            >
                                <XCircle size={18} /> Disconnect QuickBooks
                            </button>
                        </div>
                    ) : (
                        <div>
                            <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                                Connect your QuickBooks account to automatically sync invoices and customer data.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={handleConnect}
                                disabled={connecting}
                            >
                                {connecting ? (
                                    <>
                                        <RefreshCw size={18} className="spin" /> Connecting...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink size={18} /> Connect to QuickBooks
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {/* Features Card */}
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Features</h2>
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                            <CheckCircle size={20} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Automatic Invoice Sync</div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Send invoices directly to QuickBooks with one click
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                            <CheckCircle size={20} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Customer Management</div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Automatically create and update customers in QuickBooks
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                            <CheckCircle size={20} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '4px' }}>Real-time Synchronization</div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Keep your data in sync between BOOTMARK and QuickBooks
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Setup Instructions */}
                {!connected && (
                    <div className="card">
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '20px' }}>Setup Instructions</h2>
                        <div style={{
                            padding: '12px 16px',
                            background: '#fffbeb',
                            border: '1px solid #fbbf24',
                            borderRadius: '8px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'start' }}>
                                <AlertCircle size={20} color="#f59e0b" style={{ marginTop: '2px', flexShrink: 0 }} />
                                <div style={{ fontSize: '14px', color: '#92400e' }}>
                                    <strong>Note:</strong> You need a QuickBooks Online account to use this integration.
                                </div>
                            </div>
                        </div>
                        <ol style={{ paddingLeft: '20px', color: '#374151', lineHeight: '1.8' }}>
                            <li>Click "Connect to QuickBooks" button above</li>
                            <li>Sign in to your QuickBooks account</li>
                            <li>Authorize BOOTMARK to access your QuickBooks data</li>
                            <li>You'll be redirected back here once connected</li>
                            <li>Start syncing invoices and customers!</li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}

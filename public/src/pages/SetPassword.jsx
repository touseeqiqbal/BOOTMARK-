import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../utils/AuthContext';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import '../styles/Login.css';

export default function SetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { login } = useAuth();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [invitationData, setInvitationData] = useState(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        if (!token) {
            setError('No invitation token provided');
            setLoading(false);
            return;
        }
        verifyToken();
    }, [token]);

    const verifyToken = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/client-invitations/verify/${token}`);
            setInvitationData(response.data);
            setName(response.data.name || '');
            setError('');
        } catch (err) {
            console.error('Token verification error:', err);
            setError(err.response?.data?.error || 'Invalid invitation link');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);

            // Accept invitation and create account
            await api.post('/client-invitations/accept', {
                token,
                password,
                name
            });

            setSuccess(true);

            // Wait a moment to show success message
            setTimeout(async () => {
                try {
                    // Auto-login
                    await login(invitationData.email, password);

                    // Redirect to client portal
                    navigate('/client/dashboard');
                } catch (loginError) {
                    console.error('Auto-login failed:', loginError);
                    // Redirect to login page if auto-login fails
                    navigate('/login?message=Account created successfully. Please log in.');
                }
            }, 2000);
        } catch (err) {
            console.error('Account creation error:', err);
            setError(err.response?.data?.error || 'Failed to create account. Please try again.');
            setLoading(false);
        }
    };

    if (loading && !invitationData) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Loader size={48} className="spinner" style={{ margin: '0 auto 20px' }} />
                        <p>Verifying invitation...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !invitationData) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div style={{ textAlign: 'center' }}>
                        <AlertCircle size={64} color="#ef4444" style={{ margin: '0 auto 20px' }} />
                        <h1>Invalid Invitation</h1>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
                        <Link to="/login" className="btn btn-primary">Go to Login</Link>
                    </div>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
                        <h1>Account Created!</h1>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                            Your account has been successfully created. Redirecting to your portal...
                        </p>
                        <Loader size={24} className="spinner" style={{ margin: '0 auto' }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>BOOTMARK</h1>
                <p className="auth-subtitle">Set up your client account</p>

                {error && <div className="error-message">{error}</div>}

                <div style={{
                    marginBottom: '24px',
                    padding: '12px',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #86efac'
                }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                        Creating account for: <strong>{invitationData?.email}</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Your Name</label>
                        <input
                            id="name"
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Re-enter your password"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account & Login'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}

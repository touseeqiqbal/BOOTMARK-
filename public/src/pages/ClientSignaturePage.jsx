import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import SignaturePad from '../components/SignaturePad';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function ClientSignaturePage() {
    const { id, token } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [contract, setContract] = useState(null);
    const [client, setClient] = useState(null);
    const [business, setBusiness] = useState(null);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        signerName: '',
        signerEmail: '',
        signatureData: null,
        consent1: false,
        consent2: false,
        consent3: false,
        consent4: false
    });

    useEffect(() => {
        fetchContractData();
    }, [id]);

    const fetchContractData = async () => {
        try {
            setLoading(true);
            // Fetch contract (public endpoint, no auth required)
            const contractRes = await api.get(`/contracts/${id}`);
            setContract(contractRes.data);

            // Fetch client and business data if available
            try {
                const clientRes = await api.get(`/customers/${contractRes.data.clientId}`);
                setClient(clientRes.data);
                setFormData(prev => ({
                    ...prev,
                    signerName: clientRes.data.name || '',
                    signerEmail: clientRes.data.email || ''
                }));
            } catch (e) {
                console.log('Client data not available');
            }

            try {
                const businessRes = await api.get(`/businesses/${contractRes.data.businessId}`);
                setBusiness(businessRes.data);
            } catch (e) {
                console.log('Business data not available');
            }

        } catch (error) {
            console.error('Failed to fetch contract:', error);
            setError('Contract not found or link is invalid');
        } finally {
            setLoading(false);
        }
    };

    const handleSignatureSave = (signatureData) => {
        setFormData(prev => ({ ...prev, signatureData }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate all consents
        if (!formData.consent1 || !formData.consent2 || !formData.consent3 || !formData.consent4) {
            alert('Please accept all consent statements to continue');
            return;
        }

        if (!formData.signatureData) {
            alert('Please provide your signature');
            return;
        }

        setSubmitting(true);
        try {
            await api.post(`/contracts/${id}/signatures`, {
                signatureData: formData.signatureData,
                signerName: formData.signerName,
                signerEmail: formData.signerEmail,
                signerType: 'client',
                consentGiven: true,
                token
            });

            setSuccess(true);
        } catch (error) {
            console.error('Failed to submit signature:', error);
            alert('Failed to submit signature: ' + (error.response?.data?.error || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#f9fafb'
            }}>
                <div>Loading contract...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#f9fafb'
            }}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#f9fafb'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '60px',
                    background: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxWidth: '500px'
                }}>
                    <CheckCircle size={80} color="#10b981" style={{ marginBottom: '24px' }} />
                    <h1 style={{ color: '#10b981', marginBottom: '16px' }}>Signature Submitted!</h1>
                    <p style={{ color: '#6b7280', fontSize: '16px', lineHeight: '1.6' }}>
                        Thank you for signing the contract. A copy of the signed document will be sent to your email shortly.
                    </p>
                    <div style={{
                        marginTop: '32px',
                        padding: '20px',
                        background: '#f0fdf4',
                        borderRadius: '8px',
                        border: '1px solid #86efac'
                    }}>
                        <p style={{ margin: 0, fontSize: '14px', color: '#166534' }}>
                            <strong>Contract:</strong> {contract?.title}<br />
                            <strong>Signed by:</strong> {formData.signerName}<br />
                            <strong>Date:</strong> {new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    background: 'white',
                    padding: '30px',
                    borderRadius: '12px 12px 0 0',
                    borderBottom: '2px solid #e5e7eb',
                    textAlign: 'center'
                }}>
                    <img src={logo} alt="Logo" style={{ height: '40px', marginBottom: '16px' }} />
                    <h1 style={{ margin: '0 0 8px 0', fontSize: '28px' }}>Contract Signature Required</h1>
                    <p style={{ margin: 0, color: '#6b7280' }}>
                        {business?.businessName || business?.name || 'Business'}
                    </p>
                </div>

                {/* Contract Details */}
                <div style={{ background: 'white', padding: '30px', borderBottom: '2px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '20px' }}>
                        <FileText size={24} color="#4f46e5" />
                        <div>
                            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>{contract?.title}</h2>
                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                Contract Value: <strong>${contract?.amount}</strong> |
                                Duration: {contract?.startDate ? new Date(contract.startDate).toLocaleDateString() : 'TBD'} - {contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : 'TBD'}
                            </p>
                        </div>
                    </div>

                    {contract?.description && (
                        <div style={{
                            background: '#f9fafb',
                            padding: '16px',
                            borderRadius: '6px',
                            marginTop: '16px'
                        }}>
                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                                {contract.description}
                            </p>
                        </div>
                    )}
                </div>

                {/* Signature Form */}
                <form onSubmit={handleSubmit} style={{ background: 'white', padding: '30px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>Your Information</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.signerName}
                                onChange={e => setFormData({ ...formData, signerName: e.target.value })}
                                className="form-control"
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="form-group">
                            <label>Email Address *</label>
                            <input
                                type="email"
                                required
                                value={formData.signerEmail}
                                onChange={e => setFormData({ ...formData, signerEmail: e.target.value })}
                                className="form-control"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>

                    <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Your Signature</h3>
                    <div style={{ marginBottom: '32px' }}>
                        <SignaturePad
                            onSave={handleSignatureSave}
                            width={700}
                            height={200}
                        />
                    </div>

                    {/* Legal Disclosures */}
                    <div style={{
                        background: '#eff6ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        padding: '24px',
                        marginBottom: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                            <Shield size={24} color="#3b82f6" />
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', color: '#1e40af' }}>Electronic Signature Disclosure</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                                    By signing electronically, you agree that your electronic signature is the legal equivalent
                                    of your manual signature. You have the right to receive a paper copy of this document upon request.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'start', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    required
                                    checked={formData.consent1}
                                    onChange={e => setFormData({ ...formData, consent1: e.target.checked })}
                                    style={{ marginTop: '2px' }}
                                />
                                <span style={{ fontSize: '14px' }}>
                                    I have read and agree to the terms of this contract
                                </span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'start', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    required
                                    checked={formData.consent2}
                                    onChange={e => setFormData({ ...formData, consent2: e.target.checked })}
                                    style={{ marginTop: '2px' }}
                                />
                                <span style={{ fontSize: '14px' }}>
                                    I intend to sign this document electronically
                                </span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'start', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    required
                                    checked={formData.consent3}
                                    onChange={e => setFormData({ ...formData, consent3: e.target.checked })}
                                    style={{ marginTop: '2px' }}
                                />
                                <span style={{ fontSize: '14px' }}>
                                    I consent to conduct this transaction electronically
                                </span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'start', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    required
                                    checked={formData.consent4}
                                    onChange={e => setFormData({ ...formData, consent4: e.target.checked })}
                                    style={{ marginTop: '2px' }}
                                />
                                <span style={{ fontSize: '14px' }}>
                                    I understand this signature is legally binding
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={submitting || !formData.signatureData}
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '16px',
                            fontWeight: '600'
                        }}
                    >
                        {submitting ? 'Submitting Signature...' : 'Submit Signature'}
                    </button>

                    <p style={{
                        marginTop: '16px',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#6b7280'
                    }}>
                        By clicking "Submit Signature", you agree to be legally bound by this contract.
                    </p>
                </form>

                {/* Footer */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '0 0 12px 12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#9ca3af'
                }}>
                    <p style={{ margin: 0 }}>
                        This signature is captured securely and is legally binding.
                        Your IP address and device information are recorded for verification purposes.
                    </p>
                </div>
            </div>
        </div>
    );
}

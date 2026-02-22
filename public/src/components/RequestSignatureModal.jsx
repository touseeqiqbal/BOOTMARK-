import { useState } from 'react';
import { X, Mail, Send, User, Calendar } from 'lucide-react';
import api from '../utils/api';

export default function RequestSignatureModal({ contract, client, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        signerEmail: client?.email || '',
        signerName: client?.name || '',
        signerType: 'client',
        message: '',
        deadline: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.signerEmail || !formData.signerName) {
            alert('Please enter signer name and email');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post(`/contracts/${contract.id}/request-signature`, formData);

            if (onSuccess) onSuccess(response.data);
            alert('Signature request sent successfully!');
            onClose();
        } catch (error) {
            console.error('Failed to request signature:', error);
            alert('Failed to send signature request: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '600px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Mail size={24} />
                        Request Signature
                    </h2>
                    <button
                        className="btn btn-icon"
                        onClick={onClose}
                        style={{ padding: '8px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Contract Info */}
                <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>Contract</div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{contract.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                        Value: ${contract.amount}
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            <User size={16} />
                            Signer Name *
                        </label>
                        <input
                            type="text"
                            value={formData.signerName}
                            onChange={e => setFormData({ ...formData, signerName: e.target.value })}
                            className="form-control"
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            <Mail size={16} />
                            Signer Email *
                        </label>
                        <input
                            type="email"
                            value={formData.signerEmail}
                            onChange={e => setFormData({ ...formData, signerEmail: e.target.value })}
                            className="form-control"
                            placeholder="john@example.com"
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            Signer Type
                        </label>
                        <select
                            value={formData.signerType}
                            onChange={e => setFormData({ ...formData, signerType: e.target.value })}
                            className="form-control"
                        >
                            <option value="client">Client</option>
                            <option value="business">Business Representative</option>
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            <Calendar size={16} />
                            Deadline (optional)
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                            className="form-control"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ marginBottom: '8px', fontWeight: '500', display: 'block' }}>
                            Personal Message (optional)
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            className="form-control"
                            rows={4}
                            placeholder="Add a personal message to include in the signature request email..."
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    {/* Info Box */}
                    <div style={{
                        background: '#eff6ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '6px',
                        padding: '16px',
                        marginBottom: '24px'
                    }}>
                        <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
                            <strong>📧 What happens next:</strong><br />
                            The signer will receive an email with a secure link to sign the contract.
                            The link will be valid for 30 days. You'll be notified when they sign.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '24px', borderTop: '2px solid #e5e7eb' }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Send size={18} />
                            {loading ? 'Sending...' : 'Send Signature Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

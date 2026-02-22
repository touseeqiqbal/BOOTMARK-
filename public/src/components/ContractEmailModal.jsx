import { useState, useEffect } from 'react';
import { X, Mail, Send, User, Copy, Eye } from 'lucide-react';
import api from '../utils/api';

export default function ContractEmailModal({ contract, client, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [formData, setFormData] = useState({
        templateId: '',
        recipientEmail: client?.email || '',
        customMessage: '',
        ccEmails: '',
        bccEmails: ''
    });
    const [preview, setPreview] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/contracts/email-templates/list');
            setTemplates(res.data || []);
            if (res.data && res.data.length > 0) {
                setFormData(prev => ({ ...prev, templateId: res.data[0].id }));
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        }
    };

    const handleSend = async () => {
        if (!formData.recipientEmail) {
            alert('Please enter a recipient email address');
            return;
        }

        if (!formData.templateId) {
            alert('Please select an email template');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                templateId: formData.templateId,
                recipientEmail: formData.recipientEmail,
                customMessage: formData.customMessage,
                ccEmails: formData.ccEmails ? formData.ccEmails.split(',').map(e => e.trim()) : [],
                bccEmails: formData.bccEmails ? formData.bccEmails.split(',').map(e => e.trim()) : []
            };

            await api.post(`/contracts/${contract.id}/send-email`, payload);

            if (onSuccess) onSuccess();
            alert('Email sent successfully!');
            onClose();
        } catch (error) {
            console.error('Failed to send email:', error);
            alert('Failed to send email: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const selectedTemplate = templates.find(t => t.id === formData.templateId);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Mail size={24} />
                        Send Contract Email
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
                        Value: ${contract.amount} | Client: {client?.name || 'Unknown'}
                    </div>
                </div>

                {/* Email Form */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                        <Mail size={16} />
                        Email Template *
                    </label>
                    <select
                        value={formData.templateId}
                        onChange={e => setFormData({ ...formData, templateId: e.target.value })}
                        className="form-control"
                        required
                    >
                        <option value="">Select Template</option>
                        {templates.map(template => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                    {selectedTemplate && (
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                            Subject: {selectedTemplate.subject}
                        </div>
                    )}
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                        <User size={16} />
                        Recipient Email *
                    </label>
                    <input
                        type="email"
                        value={formData.recipientEmail}
                        onChange={e => setFormData({ ...formData, recipientEmail: e.target.value })}
                        className="form-control"
                        placeholder="client@example.com"
                        required
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            <Copy size={16} />
                            CC (optional)
                        </label>
                        <input
                            type="text"
                            value={formData.ccEmails}
                            onChange={e => setFormData({ ...formData, ccEmails: e.target.value })}
                            className="form-control"
                            placeholder="email1@example.com, email2@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '500' }}>
                            <Copy size={16} />
                            BCC (optional)
                        </label>
                        <input
                            type="text"
                            value={formData.bccEmails}
                            onChange={e => setFormData({ ...formData, bccEmails: e.target.value })}
                            className="form-control"
                            placeholder="email1@example.com, email2@example.com"
                        />
                    </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label style={{ marginBottom: '8px', fontWeight: '500', display: 'block' }}>
                        Personal Message (optional)
                    </label>
                    <textarea
                        value={formData.customMessage}
                        onChange={e => setFormData({ ...formData, customMessage: e.target.value })}
                        className="form-control"
                        rows={4}
                        placeholder="Add a personal message to include in the email..."
                        style={{ resize: 'vertical' }}
                    />
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        This message will be added to the email template
                    </div>
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
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={loading || !formData.recipientEmail || !formData.templateId}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Send size={18} />
                        {loading ? 'Sending...' : 'Send Email'}
                    </button>
                </div>
            </div>
        </div>
    );
}

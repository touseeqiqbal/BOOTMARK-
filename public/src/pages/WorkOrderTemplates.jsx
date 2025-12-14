import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ClipboardList } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function WorkOrderTemplates() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const res = await api.get('/work-order-templates');
            setTemplates(res.data || []);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/work-order-templates/${id}`);
            fetchTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('Failed to delete template');
        }
    };

    if (loading) {
        return <div className="container" style={{ padding: '40px 20px' }}>Loading...</div>;
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Work Order Templates</h1>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>Create reusable templates for common work orders</p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={() => navigate('/work-orders/templates/new')}>
                                <Plus size={18} /> New Template
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ padding: '40px 20px' }}>
                {templates.length === 0 ? (
                    <div style={{ background: 'white', padding: '60px 20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3 style={{ marginBottom: '8px' }}>No templates created yet</h3>
                        <p style={{ color: '#6b7280', marginBottom: '24px' }}>Create your first template to streamline work order creation</p>
                        <button className="btn btn-primary" onClick={() => navigate('/work-orders/templates/new')}>
                            <Plus size={18} /> Create Your First Template
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {templates.map(template => (
                            <div key={template.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.2s', borderTop: '4px solid #2563eb' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, flex: 1 }}>{template.name || template.title}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/work-orders/templates/${template.id}`);
                                            }}
                                            title="Edit template"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(template.id);
                                            }}
                                            title="Delete template"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {template.description && (
                                    <p style={{ color: '#6b7280', marginBottom: '12px', fontSize: '14px' }}>{template.description}</p>
                                )}

                                <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280', flexWrap: 'wrap' }}>
                                    {(template.defaultDuration || template.settings?.defaultDuration) && (
                                        <span>⏱️ {template.defaultDuration || template.settings.defaultDuration} hours</span>
                                    )}
                                    {(template.defaultPrice || template.settings?.defaultPrice) && (
                                        <span>💰 ${parseFloat(template.defaultPrice || template.settings.defaultPrice).toFixed(2)}</span>
                                    )}
                                    {template.fields && template.fields.length > 0 && (
                                        <span>📝 {template.fields.length} field{template.fields.length !== 1 ? 's' : ''}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

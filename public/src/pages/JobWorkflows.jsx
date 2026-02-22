import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Edit2, Trash2, Check, X, ArrowRight, Settings } from 'lucide-react';

export default function JobWorkflows() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const res = await api.get('/workflows');
            setWorkflows(res.data);
        } catch (error) {
            console.error('Failed to fetch workflows:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        try {
            await api.delete(`/workflows/${id}`);
            setWorkflows(workflows.filter(w => w.id !== id));
        } catch (error) {
            console.error('Failed to delete workflow:', error);
            alert(error.response?.data?.error || 'Failed to delete workflow');
        }
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <div className="brand-text">
                                <h1 className="brand-title">Job Workflows</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/job-workflows/new')}
                            >
                                <Plus size={18} /> New Workflow
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingTop: '20px' }}>
                {loading ? (
                    <div className="loading">Loading workflows...</div>
                ) : workflows.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <Settings size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No workflows defined</h3>
                        <p style={{ color: '#6b7280' }}>Create a custom workflow to track your jobs.</p>
                        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/job-workflows/new')}>
                            Create Workflow
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                        {workflows.map(workflow => (
                            <div key={workflow.id} className="card" style={{ padding: '20px', cursor: 'pointer', borderTop: workflow.isDefault ? '4px solid #4f46e5' : '1px solid #e5e7eb' }} onClick={() => navigate(`/job-workflows/${workflow.id}`)}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{workflow.name}</h3>
                                    {workflow.isDefault && (
                                        <span style={{ fontSize: '12px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px' }}>Default</span>
                                    )}
                                </div>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>{workflow.description || 'No description'}</p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                    {workflow.stages?.slice(0, 3).map((stage, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: stage.color + '20',
                                                color: stage.color,
                                                border: `1px solid ${stage.color}`
                                            }}>
                                                {stage.name}
                                            </span>
                                            {idx < Math.min(workflow.stages.length, 3) - 1 && <ArrowRight size={12} color="#9ca3af" style={{ margin: '0 4px' }} />}
                                        </div>
                                    ))}
                                    {workflow.stages?.length > 3 && <span style={{ fontSize: '12px', color: '#6b7280' }}>+{workflow.stages.length - 3} more</span>}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/job-workflows/${workflow.id}`); }}>
                                        <Edit2 size={16} /> Edit
                                    </button>
                                    <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(workflow.id, e)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

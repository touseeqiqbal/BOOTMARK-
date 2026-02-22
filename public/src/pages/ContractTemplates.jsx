import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { contractTemplatesApi } from '../utils/contractTemplatesApi';
import ContractTemplateForm from '../components/ContractTemplateForm';

export default function ContractTemplates() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await contractTemplatesApi.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await contractTemplatesApi.delete(id);
                fetchTemplates();
            } catch (error) {
                console.error('Failed to delete template', error);
            }
        }
    };

    const handleEdit = (template, e) => {
        e.stopPropagation();
        setSelectedTemplate(template);
        setShowForm(true);
    };

    const handleCreate = () => {
        setSelectedTemplate(null);
        setShowForm(true);
    };

    const handleFormSubmit = async () => {
        setShowForm(false);
        fetchTemplates();
    };

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (showForm) {
        return (
            <div className="page-container">
                <ContractTemplateForm
                    initialData={selectedTemplate}
                    onSave={handleFormSubmit}
                    onCancel={() => setShowForm(false)}
                />
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Contract Templates</h1>
                    <p className="text-secondary">Manage your contract templates and defaults.</p>
                </div>
                <button className="btn-modern btn-modern-primary" onClick={handleCreate}>
                    <Plus size={20} />
                    <span>Create Template</span>
                </button>
            </div>

            <div className="content-card">
                <div className="filter-bar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">Loading templates...</div>
                ) : (
                    <div className="templates-grid">
                        {filteredTemplates.map(template => (
                            <div key={template.id} className="template-card">
                                <div className="template-icon" style={{ backgroundColor: template.color + '20', color: template.color }}>
                                    {template.icon || <FileText size={24} />}
                                </div>
                                <div className="template-content">
                                    <h3>{template.name}</h3>
                                    <p>{template.description}</p>
                                    <div className="template-meta">
                                        <span className="badge">{template.billingFrequency}</span>
                                        <span className="badge">{template.defaultDuration} months</span>
                                    </div>
                                </div>
                                {template.type === 'custom' && (
                                    <div className="template-actions">
                                        <button className="btn-icon" onClick={(e) => handleEdit(template, e)}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-icon text-danger" onClick={(e) => handleDelete(template.id, e)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

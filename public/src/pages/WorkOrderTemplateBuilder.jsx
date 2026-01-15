import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import FieldPalette from '../components/FieldPalette';
import FormCanvas from '../components/FormCanvas';
import FieldEditor from '../components/FieldEditor';
import { Save, ArrowLeft, Settings } from 'lucide-react';
import logo from '../assets/logo.svg';
import '../styles/FormBuilder.css';

export default function WorkOrderTemplateBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(!!id);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        defaultDuration: '',
        defaultPrice: '',
        defaultStatus: 'draft'
    });

    useEffect(() => {
        if (id) {
            fetchTemplate();
        } else {
            // New template
            setTemplate({
                title: 'Untitled Template',
                description: ''
            });
            setLoading(false);
        }
    }, [id]);

    const fetchTemplate = async () => {
        try {
            console.log('[TemplateBuilder] Fetching template ID:', id);
            const response = await api.get(`/work-order-templates/${id}`);
            console.log('[TemplateBuilder] Template loaded:', response.data);
            console.log('[TemplateBuilder] Fields count:', response.data.fields?.length || 0);
            console.log('[TemplateBuilder] Fields:', response.data.fields);

            setTemplate(response.data);
            setFields(response.data.fields || []);
            setSettings({
                defaultDuration: response.data.defaultDuration || response.data.settings?.defaultDuration || '',
                defaultPrice: response.data.defaultPrice || response.data.settings?.defaultPrice || '',
                defaultStatus: response.data.defaultStatus || response.data.settings?.defaultStatus || 'draft'
            });

            console.log('[TemplateBuilder] State updated - fields:', response.data.fields?.length || 0);
        } catch (error) {
            console.error('[TemplateBuilder] Failed to fetch template:', error);
            alert('Failed to load template');
            navigate('/work-orders/templates');
        } finally {
            setLoading(false);
        }
    };

    const saveTemplate = async () => {
        if (!template?.title || template.title.trim() === '') {
            alert('Please enter a template name');
            return;
        }

        setSaving(true);
        try {
            const templateData = {
                title: template.title,
                name: template.title, // For compatibility
                description: template.description || '',
                fields,
                settings,
                defaultDuration: settings.defaultDuration,
                defaultPrice: settings.defaultPrice,
                defaultStatus: settings.defaultStatus
            };

            console.log('[TemplateBuilder] Saving template:', templateData);

            let response;
            if (id) {
                response = await api.put(`/work-order-templates/${id}`, templateData);
            } else {
                response = await api.post('/work-order-templates', templateData);
            }

            console.log('[TemplateBuilder] Save response:', response.data);

            setTemplate(response.data);
            alert('Template saved successfully!');

            // Navigate to templates list if this was a new template
            if (!id && response.data.id) {
                navigate(`/work-orders/templates/${response.data.id}`);
            }
        } catch (error) {
            console.error('[TemplateBuilder] Failed to save template:', error);
            console.error('[TemplateBuilder] Error response:', error.response?.data);
            alert('Failed to save template: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const updateTemplateTitle = (title) => {
        setTemplate({ ...template, title });
    };

    const addField = (fieldType) => {
        const newField = {
            id: Date.now().toString(),
            type: fieldType,
            label: getDefaultLabel(fieldType),
            required: false,
            placeholder: '',
            ...getDefaultProps(fieldType)
        };
        setFields([...fields, newField]);
        setSelectedField(newField);
    };

    const updateField = (fieldId, updates) => {
        setFields(fields.map(f =>
            f.id === fieldId ? { ...f, ...updates } : f
        ));
        if (selectedField?.id === fieldId) {
            setSelectedField({ ...selectedField, ...updates });
        }
    };

    const deleteField = (fieldId) => {
        setFields(fields.filter(f => f.id !== fieldId));
        if (selectedField?.id === fieldId) {
            setSelectedField(null);
        }
    };

    const moveField = (dragIndex, hoverIndex) => {
        if (dragIndex === hoverIndex) return;
        const draggedField = fields[dragIndex];
        if (!draggedField) return;

        const newFields = [...fields];
        newFields.splice(dragIndex, 1);
        newFields.splice(hoverIndex, 0, draggedField);
        setFields(newFields);
    };

    const getDefaultLabel = (type) => {
        const labels = {
            'short-text': 'Short Text',
            'long-text': 'Long Text',
            'number': 'Number',
            'email': 'Email',
            'phone': 'Phone',
            'date-picker': 'Date',
            'dropdown': 'Dropdown',
            'single-choice': 'Single Choice',
            'multiple-choice': 'Multiple Choice',
            'checkbox': 'Checkbox',
            'work-order-items': 'Work Order Items',
            'heading': 'Heading',
            'divider': 'Divider'
        };
        return labels[type] || 'Field';
    };

    const getDefaultProps = (type) => {
        const props = {};

        if (type === 'number') {
            props.min = undefined;
            props.max = undefined;
            props.step = 1;
        }

        if (['dropdown', 'single-choice', 'multiple-choice', 'checkbox'].includes(type)) {
            props.options = ['Option 1', 'Option 2'];
        }

        if (type === 'long-text') {
            props.rows = 4;
        }

        if (type === 'heading') {
            props.size = '24px';
            props.color = '#1f2937';
            props.align = 'left';
        }

        if (type === 'work-order-items') {
            props.allowQuantity = true;
            props.allowPrice = true;
            props.showTotal = true;
        }

        return props;
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (!template) {
        return null;
    }

    return (
        <div className="form-builder">
            <header className="builder-header">
                <div className="builder-header-top">
                    <div className="builder-header-top-left">
                        <button className="btn btn-secondary btn-back" onClick={() => navigate('/work-orders/templates')}>
                            <ArrowLeft size={18} />
                            Back
                        </button>
                        <div className="builder-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <h1 className="brand-title">BOOTMARK</h1>
                        </div>
                    </div>
                    <div className="builder-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings size={18} />
                            Settings
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={saveTemplate}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </div>
                <div className="builder-header-title-section">
                    <label className="form-title-label">Enter template name</label>
                    <input
                        type="text"
                        className="form-title-input"
                        value={template.title}
                        onChange={(e) => updateTemplateTitle(e.target.value)}
                        placeholder="e.g., Lawn Maintenance, Pool Cleaning"
                    />
                </div>
            </header>

            <div className="builder-content">
                <div className="builder-left-panel">
                    <FieldPalette onAddField={addField} />
                </div>

                <FormCanvas
                    fields={fields}
                    selectedField={selectedField}
                    onSelectField={setSelectedField}
                    onUpdateField={updateField}
                    onDeleteField={deleteField}
                    onMoveField={moveField}
                    currentPage={0}
                    pages={[{ id: '1', name: 'Page 1', order: 0 }]}
                />

                {selectedField && (
                    <>
                        <div
                            className="field-editor-backdrop"
                            onClick={() => setSelectedField(null)}
                        />
                        <div className="field-editor-sidebar open">
                            <FieldEditor
                                field={selectedField}
                                onUpdate={(updates) => updateField(selectedField.id, updates)}
                                onClose={() => setSelectedField(null)}
                            />
                        </div>
                    </>
                )}
            </div>

            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Template Settings</h2>
                            <button className="btn-close" onClick={() => setShowSettings(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description</label>
                                <textarea
                                    value={template.description}
                                    onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                                    placeholder="Brief description of this template"
                                    rows={3}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Duration (hours)</label>
                                <input
                                    type="number"
                                    value={settings.defaultDuration}
                                    onChange={(e) => setSettings({ ...settings, defaultDuration: e.target.value })}
                                    placeholder="2"
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Price ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={settings.defaultPrice}
                                    onChange={(e) => setSettings({ ...settings, defaultPrice: e.target.value })}
                                    placeholder="150.00"
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Status</label>
                                <select
                                    value={settings.defaultStatus}
                                    onChange={(e) => setSettings({ ...settings, defaultStatus: e.target.value })}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in-progress">In Progress</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

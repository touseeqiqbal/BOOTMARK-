import { useState, useEffect } from 'react';
import { X, Settings, Plus, Trash2, Eye, EyeOff, Save, BookmarkPlus, Download } from 'lucide-react';
import api from '../utils/api';

export default function WorkOrderSettingsModal({ show, onClose, onSave }) {
    const [activeTab, setActiveTab] = useState('default');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showAddFieldModal, setShowAddFieldModal] = useState(false);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [newField, setNewField] = useState({
        name: '',
        label: '',
        type: 'text',
        options: [],
        required: false,
        placeholder: '',
        helpText: ''
    });

    useEffect(() => {
        if (show) {
            fetchSettings();
        }
    }, [show]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/work-orders/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            alert('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await api.put('/work-orders/settings', settings);
            alert('Settings saved successfully!');
            if (onSave) onSave(settings);
            onClose();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleFieldVisibility = (fieldName) => {
        setSettings({
            ...settings,
            defaultFields: {
                ...settings.defaultFields,
                [fieldName]: {
                    ...settings.defaultFields[fieldName],
                    visible: !settings.defaultFields[fieldName].visible
                }
            }
        });
    };

    const updateFieldRequired = (fieldName, required) => {
        setSettings({
            ...settings,
            defaultFields: {
                ...settings.defaultFields,
                [fieldName]: {
                    ...settings.defaultFields[fieldName],
                    required
                }
            }
        });
    };

    const updateFieldLabel = (fieldName, label) => {
        setSettings({
            ...settings,
            defaultFields: {
                ...settings.defaultFields,
                [fieldName]: {
                    ...settings.defaultFields[fieldName],
                    label
                }
            }
        });
    };

    const handleAddCustomField = async () => {
        if (!newField.name || !newField.label) {
            alert('Field name and label are required');
            return;
        }

        try {
            const response = await api.post('/work-orders/settings/custom-field', newField);
            setSettings(response.data.settings);
            setShowAddFieldModal(false);
            setNewField({
                name: '',
                label: '',
                type: 'text',
                options: [],
                required: false,
                placeholder: '',
                helpText: ''
            });
            alert('Custom field added successfully!');
        } catch (error) {
            console.error('Failed to add custom field:', error);
            alert('Failed to add custom field');
        }
    };

    const handleDeleteCustomField = async (fieldId) => {
        if (!confirm('Are you sure you want to delete this custom field?')) return;

        try {
            const response = await api.delete(`/work-orders/settings/custom-field/${fieldId}`);
            setSettings(response.data.settings);
            alert('Custom field deleted successfully!');
        } catch (error) {
            console.error('Failed to delete custom field:', error);
            alert('Failed to delete custom field');
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) {
            alert('Please enter a template name');
            return;
        }

        const template = {
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: templateName,
            defaultFields: settings.defaultFields,
            customFields: settings.customFields,
            createdAt: new Date().toISOString()
        };

        const updatedTemplates = [...(settings.templates || []), template];
        setSettings({ ...settings, templates: updatedTemplates });
        setShowSaveTemplateModal(false);
        setTemplateName('');
        alert('Template saved! Don\'t forget to click "Save Settings" to persist it.');
    };

    const handleLoadTemplate = (template) => {
        if (!confirm(`Load template "${template.name}"? This will replace your current field configuration.`)) return;

        setSettings({
            ...settings,
            defaultFields: template.defaultFields,
            customFields: template.customFields
        });
        alert('Template loaded! Click "Save Settings" to apply changes.');
    };

    const handleDeleteTemplate = (templateId) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        const updatedTemplates = settings.templates.filter(t => t.id !== templateId);
        setSettings({ ...settings, templates: updatedTemplates });
        alert('Template deleted! Click "Save Settings" to persist changes.');
    };

    if (!show) return null;

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Settings size={24} color="#4f46e5" />
                            <h2 style={{ margin: 0 }}>Work Order Form Settings</h2>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Loading settings...</div>
                    ) : (
                        <>
                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                                <button
                                    onClick={() => setActiveTab('default')}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'default' ? '2px solid #4f46e5' : '2px solid transparent',
                                        color: activeTab === 'default' ? '#4f46e5' : '#6b7280',
                                        fontWeight: activeTab === 'default' ? '600' : '400',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Default Fields
                                </button>
                                <button
                                    onClick={() => setActiveTab('custom')}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'custom' ? '2px solid #4f46e5' : '2px solid transparent',
                                        color: activeTab === 'custom' ? '#4f46e5' : '#6b7280',
                                        fontWeight: activeTab === 'custom' ? '600' : '400',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Custom Fields ({settings?.customFields?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('templates')}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'templates' ? '2px solid #4f46e5' : '2px solid transparent',
                                        color: activeTab === 'templates' ? '#4f46e5' : '#6b7280',
                                        fontWeight: activeTab === 'templates' ? '600' : '400',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Templates ({settings?.templates?.length || 0})
                                </button>
                            </div>

                            {/* Default Fields Tab */}
                            {activeTab === 'default' && settings && (
                                <div style={{ marginBottom: '24px' }}>
                                    <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                                        Toggle visibility and configure default work order fields
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {Object.entries(settings.defaultFields).map(([fieldName, field]) => (
                                            <div key={fieldName} style={{
                                                padding: '16px',
                                                background: field.visible ? '#f9fafb' : '#f3f4f6',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    {/* Visibility Toggle */}
                                                    <button
                                                        onClick={() => toggleFieldVisibility(fieldName)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            padding: '4px',
                                                            color: field.visible ? '#10b981' : '#6b7280'
                                                        }}
                                                        title={field.visible ? 'Hide field' : 'Show field'}
                                                    >
                                                        {field.visible ? <Eye size={20} /> : <EyeOff size={20} />}
                                                    </button>

                                                    {/* Field Label */}
                                                    <div style={{ flex: 1 }}>
                                                        <input
                                                            type="text"
                                                            value={field.label}
                                                            onChange={(e) => updateFieldLabel(fieldName, e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '8px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '6px',
                                                                fontSize: '14px'
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Required/Optional */}
                                                    <select
                                                        value={field.required ? 'required' : 'optional'}
                                                        onChange={(e) => updateFieldRequired(fieldName, e.target.value === 'required')}
                                                        style={{
                                                            padding: '8px 12px',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: '6px',
                                                            fontSize: '14px',
                                                            minWidth: '120px'
                                                        }}
                                                    >
                                                        <option value="optional">Optional</option>
                                                        <option value="required">Required</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Fields Tab */}
                            {activeTab === 'custom' && settings && (
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <p style={{ color: '#6b7280', margin: 0 }}>
                                            Add custom fields to your work order form
                                        </p>
                                        <button
                                            onClick={() => setShowAddFieldModal(true)}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <Plus size={18} /> Add Custom Field
                                        </button>
                                    </div>

                                    {settings.customFields.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
                                            <p style={{ color: '#6b7280' }}>No custom fields yet. Click "Add Custom Field" to create one.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {settings.customFields.map((field) => (
                                                <div key={field.id} style={{
                                                    padding: '16px',
                                                    background: '#f9fafb',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{field.label}</div>
                                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                            Type: {field.type} • {field.required ? 'Required' : 'Optional'}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteCustomField(field.id)}
                                                        className="btn btn-danger btn-sm"
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <Trash2 size={16} /> Delete
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Templates Tab */}
                            {activeTab === 'templates' && settings && (
                                <div style={{ marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <p style={{ color: '#6b7280', margin: 0 }}>
                                            Save and load field configurations as templates
                                        </p>
                                        <button
                                            onClick={() => setShowSaveTemplateModal(true)}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <BookmarkPlus size={18} /> Save as Template
                                        </button>
                                    </div>

                                    {(!settings.templates || settings.templates.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '40px', background: '#f9fafb', borderRadius: '8px' }}>
                                            <p style={{ color: '#6b7280' }}>No templates saved yet. Save your current configuration as a template!</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {settings.templates.map((template) => (
                                                <div key={template.id} style={{
                                                    padding: '16px',
                                                    background: '#f9fafb',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e5e7eb'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '15px' }}>{template.name}</div>
                                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                                {Object.values(template.defaultFields).filter(f => f.visible).length} default fields •
                                                                {template.customFields?.length || 0} custom fields •
                                                                Created {new Date(template.createdAt).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <button
                                                                onClick={() => handleLoadTemplate(template)}
                                                                className="btn btn-secondary btn-sm"
                                                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <Download size={16} /> Load
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteTemplate(template.id)}
                                                                className="btn btn-danger btn-sm"
                                                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                                            >
                                                                <Trash2 size={16} /> Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}


                            {/* Footer */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                                paddingTop: '20px',
                                borderTop: '1px solid #e5e7eb'
                            }}>
                                <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleSaveSettings}
                                    disabled={saving}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '120px' }}
                                >
                                    {saving ? 'Saving...' : (
                                        <>
                                            <Save size={18} /> Save Settings
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Add Custom Field Modal */}
            {showAddFieldModal && (
                <div className="modal-overlay" onClick={() => setShowAddFieldModal(false)} style={{ zIndex: 1001 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Add Custom Field</h3>
                            <button onClick={() => setShowAddFieldModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label>Field Name (Internal) *</label>
                            <input
                                type="text"
                                value={newField.name}
                                onChange={(e) => setNewField({ ...newField, name: e.target.value.replace(/\s/g, '_').toLowerCase() })}
                                placeholder="e.g., equipment_used"
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Field Label (Display) *</label>
                            <input
                                type="text"
                                value={newField.label}
                                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                                placeholder="e.g., Equipment Used"
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Field Type *</label>
                            <select
                                value={newField.type}
                                onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                                className="form-control"
                            >
                                <option value="text">Text (Single Line)</option>
                                <option value="textarea">Textarea (Multi-Line)</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="time">Time</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="checkbox">Checkbox</option>
                            </select>
                        </div>

                        {newField.type === 'dropdown' && (
                            <div className="form-group">
                                <label>Options (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Plow, Blower, Shovel"
                                    onChange={(e) => setNewField({ ...newField, options: e.target.value.split(',').map(o => o.trim()) })}
                                    className="form-control"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={newField.required}
                                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                                />
                                Required field
                            </label>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowAddFieldModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleAddCustomField}>
                                Add Field
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Template Modal */}
            {showSaveTemplateModal && (
                <div className="modal-overlay" onClick={() => setShowSaveTemplateModal(false)} style={{ zIndex: 1001 }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Save as Template</h3>
                            <button onClick={() => setShowSaveTemplateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="form-group">
                            <label>Template Name *</label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Snow Removal, Lawn Care, Emergency Service"
                                className="form-control"
                                autoFocus
                            />
                            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
                                This will save your current field configuration (default fields visibility and custom fields) as a reusable template.
                            </p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowSaveTemplateModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSaveAsTemplate}>
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

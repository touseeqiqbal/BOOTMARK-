import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft, Eye, Save, RotateCcw, Info } from 'lucide-react';
import api from '../utils/api';

const PLACEHOLDER_OPTIONS = [
    { value: '{YEAR}', label: 'Year (2025)', description: '4-digit year' },
    { value: '{YY}', label: 'Year (25)', description: '2-digit year' },
    { value: '{MONTH}', label: 'Month (01)', description: '2-digit month' },
    { value: '{DAY}', label: 'Day (13)', description: '2-digit day' },
    { value: '{COUNTER:5}', label: 'Counter (00001)', description: 'Auto-increment with padding' },
];

const RESET_PERIODS = [
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
];

const DOCUMENT_TYPES = [
    { key: 'workOrder', label: 'Work Orders', icon: '📋', color: '#3b82f6' },
    { key: 'invoice', label: 'Invoices', icon: '💰', color: '#10b981' },
    { key: 'client', label: 'Clients', icon: '👤', color: '#8b5cf6' },
    { key: 'scheduling', label: 'Scheduling', icon: '📅', color: '#f59e0b' },
    { key: 'contract', label: 'Contracts', icon: '📄', color: '#ef4444' },
];

export default function NumberFormatSettings() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formats, setFormats] = useState({});
    const [previews, setPreviews] = useState({});
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchFormats();
    }, []);

    useEffect(() => {
        // Generate previews whenever formats change
        Object.keys(formats).forEach(type => {
            generatePreview(type, formats[type].format, formats[type].counter || 1, formats[type].padding || 5);
        });
    }, [formats]);

    const fetchFormats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/settings/number-formats');
            setFormats(response.data);
        } catch (error) {
            console.error('Failed to fetch number formats:', error);
            alert('Failed to load number format settings');
        } finally {
            setLoading(false);
        }
    };

    const generatePreview = async (type, format, counter = 1, padding = 5) => {
        try {
            const response = await api.post('/settings/number-formats/preview', {
                format,
                counter,
                padding
            });
            setPreviews(prev => ({ ...prev, [type]: response.data.preview }));
        } catch (error) {
            console.error('Failed to generate preview:', error);
            setPreviews(prev => ({ ...prev, [type]: 'Invalid format' }));
        }
    };

    const updateFormat = (type, field, value) => {
        setFormats(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
        setHasChanges(true);
    };

    const insertPlaceholder = (type, placeholder) => {
        const currentFormat = formats[type]?.format || '';
        const newFormat = currentFormat + placeholder;
        updateFormat(type, 'format', newFormat);
    };

    const resetToDefaults = async () => {
        if (!confirm('Reset all formats to defaults? This will not affect existing documents.')) {
            return;
        }

        try {
            const response = await api.get('/settings/number-formats/defaults');
            setFormats(response.data);
            setHasChanges(true);
        } catch (error) {
            console.error('Failed to load defaults:', error);
            alert('Failed to reset to defaults');
        }
    };

    const saveFormats = async () => {
        try {
            setSaving(true);
            await api.put('/settings/number-formats', formats);
            setHasChanges(false);
            alert('Number formats saved successfully!');
        } catch (error) {
            console.error('Failed to save formats:', error);
            alert('Failed to save number formats');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard">
                <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div className="loading">Loading settings...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src="/logo.png" alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Number Format Settings</h1>
                                <span className="brand-subtitle">Customize document numbering</span>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => navigate('/account-settings')}>
                                <ArrowLeft size={18} /> Back
                            </button>
                            <button className="btn btn-secondary" onClick={resetToDefaults}>
                                <RotateCcw size={18} /> Reset to Defaults
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={saveFormats}
                                disabled={!hasChanges || saving}
                            >
                                <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingBottom: '40px' }}>
                {/* Info Banner */}
                <div style={{
                    padding: '16px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    display: 'flex',
                    gap: '12px'
                }}>
                    <Info size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '14px', color: '#1e40af' }}>
                        <strong>How it works:</strong> Configure custom number formats for your documents.
                        Use placeholders like {'{YEAR}'}, {'{MONTH}'}, and {'{COUNTER:5}'} to create professional numbering schemes.
                        Existing documents will keep their current numbers.
                    </div>
                </div>

                {/* Format Configurations */}
                <div style={{ display: 'grid', gap: '24px' }}>
                    {DOCUMENT_TYPES.map(docType => {
                        const config = formats[docType.key] || {};
                        const preview = previews[docType.key] || '...';

                        return (
                            <div key={docType.key} className="card" style={{ borderLeft: `4px solid ${docType.color}` }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <h3 style={{
                                        margin: '0 0 4px 0',
                                        fontSize: '18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>{docType.icon}</span>
                                        {docType.label}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                        Configure numbering format for {docType.label.toLowerCase()}
                                    </p>
                                </div>

                                {/* Format Input */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        display: 'block',
                                        marginBottom: '8px',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}>
                                        Format Pattern
                                    </label>
                                    <input
                                        type="text"
                                        value={config.format || ''}
                                        onChange={(e) => updateFormat(docType.key, 'format', e.target.value)}
                                        placeholder="e.g., WO-{YEAR}-{COUNTER:5}"
                                        className="form-control"
                                        style={{ marginBottom: '8px' }}
                                    />

                                    {/* Placeholder Buttons */}
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {PLACEHOLDER_OPTIONS.map(placeholder => (
                                            <button
                                                key={placeholder.value}
                                                type="button"
                                                onClick={() => insertPlaceholder(docType.key, placeholder.value)}
                                                className="btn btn-sm"
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '12px',
                                                    background: '#f3f4f6',
                                                    border: '1px solid #d1d5db',
                                                    color: '#374151'
                                                }}
                                                title={placeholder.description}
                                            >
                                                + {placeholder.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Preview */}
                                <div style={{
                                    padding: '12px 16px',
                                    background: '#f0fdf4',
                                    border: '1px solid #86efac',
                                    borderRadius: '6px',
                                    marginBottom: '16px'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        marginBottom: '4px'
                                    }}>
                                        <Eye size={16} color="#16a34a" />
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#166534' }}>
                                            Preview
                                        </span>
                                    </div>
                                    <div style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#15803d',
                                        fontFamily: 'monospace'
                                    }}>
                                        {preview}
                                    </div>
                                </div>

                                {/* Settings Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {/* Counter Padding */}
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}>
                                            Counter Padding
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={config.padding || 5}
                                            onChange={(e) => updateFormat(docType.key, 'padding', parseInt(e.target.value))}
                                            className="form-control"
                                        />
                                        <small style={{ color: '#6b7280', fontSize: '11px' }}>
                                            Number of digits (e.g., 5 = 00001)
                                        </small>
                                    </div>

                                    {/* Reset Period */}
                                    <div>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '6px',
                                            fontSize: '13px',
                                            fontWeight: '500'
                                        }}>
                                            Reset Counter
                                        </label>
                                        <select
                                            value={config.resetPeriod || 'never'}
                                            onChange={(e) => updateFormat(docType.key, 'resetPeriod', e.target.value)}
                                            className="form-control"
                                        >
                                            {RESET_PERIODS.map(period => (
                                                <option key={period.value} value={period.value}>
                                                    {period.label}
                                                </option>
                                            ))}
                                        </select>
                                        <small style={{ color: '#6b7280', fontSize: '11px' }}>
                                            When to reset counter to 1
                                        </small>
                                    </div>
                                </div>

                                {/* Current Counter Info */}
                                <div style={{
                                    marginTop: '16px',
                                    padding: '10px',
                                    background: '#f9fafb',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    color: '#6b7280'
                                }}>
                                    <strong>Current Counter:</strong> {config.counter || 1}
                                    <span style={{ marginLeft: '16px' }}>
                                        <strong>Next Number:</strong> {preview}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save Button (Bottom) */}
                {hasChanges && (
                    <div style={{
                        position: 'sticky',
                        bottom: '20px',
                        marginTop: '24px',
                        padding: '16px',
                        background: '#fffbeb',
                        border: '1px solid #fcd34d',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#92400e' }}>
                            You have unsaved changes
                        </span>
                        <button
                            className="btn btn-primary"
                            onClick={saveFormats}
                            disabled={saving}
                        >
                            <Save size={18} /> {saving ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

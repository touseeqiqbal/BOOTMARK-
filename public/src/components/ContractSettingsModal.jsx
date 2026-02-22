import { useState, useEffect } from 'react';
import { X, Save, FileText, Hash, Calendar, CheckSquare } from 'lucide-react';
import api from '../utils/api';

export default function ContractSettingsModal({ show, onClose, onSave }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        prefix: 'CON-',
        nextNumber: 1001,
        defaultTerms: '',
        autoRenewalDefault: false,
        renewalNoticePeriodDefault: 30,
        defaultViewMode: 'grid'
    });

    useEffect(() => {
        if (show) {
            fetchSettings();
        }
    }, [show]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await api.get('/contracts/settings');
            if (res.data) {
                setSettings(prev => ({
                    ...prev,
                    ...res.data
                }));
            }
        } catch (error) {
            console.error('Failed to fetch contract settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/contracts/settings', settings);
            if (onSave) onSave(settings);
            onClose();
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={24} color="#4f46e5" />
                        Contract Settings
                    </h2>
                    <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading settings...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Numbering
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={14} /> Prefix
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={settings.prefix}
                                        onChange={e => setSettings({ ...settings, prefix: e.target.value })}
                                        placeholder="e.g. CON-"
                                    />
                                    <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>Appears before the number</small>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Hash size={14} /> Next Number
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.nextNumber}
                                        onChange={e => setSettings({ ...settings, nextNumber: parseInt(e.target.value) || '' })}
                                        placeholder="e.g. 1001"
                                    />
                                    <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>Auto-increments</small>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                                Defaults
                            </h3>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        checked={settings.autoRenewalDefault}
                                        onChange={e => setSettings({ ...settings, autoRenewalDefault: e.target.checked })}
                                    />
                                    Enable Auto-Renewal by Default
                                </label>
                            </div>

                            {settings.autoRenewalDefault && (
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} /> Default Notice Period (Days)
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={settings.renewalNoticePeriodDefault}
                                        onChange={e => setSettings({ ...settings, renewalNoticePeriodDefault: parseInt(e.target.value) || 0 })}
                                        style={{ maxWidth: '150px' }}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Default Contract Terms</label>
                                <textarea
                                    className="form-control"
                                    rows={6}
                                    value={settings.defaultTerms}
                                    onChange={e => setSettings({ ...settings, defaultTerms: e.target.value })}
                                    placeholder="Enter standard terms that apply to all new contracts..."
                                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                                View Settings
                            </h3>
                            <div className="form-group">
                                <label>Default View Mode</label>
                                <select
                                    className="form-control"
                                    value={settings.defaultViewMode || 'grid'}
                                    onChange={e => setSettings({ ...settings, defaultViewMode: e.target.value })}
                                >
                                    <option value="grid">Grid View</option>
                                    <option value="list">List View</option>
                                    <option value="table">Table View</option>
                                </select>
                                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>Preferred layout when opening the contracts page.</small>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : <><Save size={18} /> Save Settings</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

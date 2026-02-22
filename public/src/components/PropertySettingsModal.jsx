import { useState, useEffect } from 'react';
import { X, Save, MapPin } from 'lucide-react';
import api from '../utils/api';

export default function PropertySettingsModal({ show, onClose, onSave }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        defaultCity: '',
        defaultState: '',
        defaultZip: '',
        defaultCountry: '',
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
            const res = await api.get('/properties/settings');
            if (res.data) {
                setSettings(prev => ({
                    ...prev,
                    ...res.data
                }));
            }
        } catch (error) {
            console.error('Failed to fetch property settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/properties/settings', settings);
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
                        <MapPin size={24} color="#4f46e5" />
                        Property Settings
                    </h2>
                    <button className="btn btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading settings...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
                                Default Location
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Default City</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={settings.defaultCity}
                                        onChange={e => setSettings({ ...settings, defaultCity: e.target.value })}
                                        placeholder="City..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Default State/Province</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={settings.defaultState}
                                        onChange={e => setSettings({ ...settings, defaultState: e.target.value })}
                                        placeholder="State..."
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Default ZIP/Postal</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={settings.defaultZip}
                                        onChange={e => setSettings({ ...settings, defaultZip: e.target.value })}
                                        placeholder="ZIP..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Default Country</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={settings.defaultCountry}
                                        onChange={e => setSettings({ ...settings, defaultCountry: e.target.value })}
                                        placeholder="Country..."
                                    />
                                </div>
                            </div>
                            <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>New properties will default to this location if left blank.</small>
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
                                <small style={{ color: '#6b7280', display: 'block', marginTop: '4px' }}>Preferred layout when opening the properties page.</small>
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

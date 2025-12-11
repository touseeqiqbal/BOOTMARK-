import { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../utils/api';

export default function QuickAddPropertyModal({ onClose, onConfirm, clientId }) {
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/properties', {
                customerId: clientId,
                address,
                city,
                state,
                zip,
                notes
            });
            onConfirm(res.data);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create property');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px', padding: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>New Property</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Street Address"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="City"
                                value={city}
                                onChange={e => setCity(e.target.value)}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="State"
                                value={state}
                                onChange={e => setState(e.target.value)}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="ZIP Code"
                            value={zip}
                            onChange={e => setZip(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <textarea
                            rows={3}
                            placeholder="Notes (Gate code, access info, etc.)"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !address.trim()} style={{ padding: '8px 16px', borderRadius: '6px', background: '#2563eb', color: 'white', border: 'none', cursor: 'pointer' }}>Create Property</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../utils/api';

export default function QuickAddClientModal({ onClose, onConfirm }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zip, setZip] = useState('');
    const [notes, setNotes] = useState('');
    const [createProperty, setCreateProperty] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Create client first
            const clientRes = await api.post('/customers', {
                name,
                email: email || `${name.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase()}-${Date.now()}@example.com`,
                phone: phone || '',
                address: createProperty && address.trim() ? `${address}, ${city}` : ''
            });

            const newClient = clientRes.data;

            // Create property if checkbox is checked and address is provided
            if (createProperty && address.trim()) {
                try {
                    await api.post('/properties', {
                        customerId: newClient.id,
                        address,
                        city,
                        state,
                        zip,
                        notes
                    });
                } catch (propError) {
                    console.error('Failed to create property:', propError);
                    // Continue anyway - client was created successfully
                }
            }

            if (newClient && newClient.id) {
                onConfirm(newClient);
                onClose();
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            console.error("Client creation failed:", error);
            alert(`Failed to create client: ${error.message || 'Unknown error'}`);
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
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '550px', padding: '24px', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>New Client</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Client Name</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Phone (Optional)</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            placeholder="555-0123"
                        />
                    </div>

                    {/* Property Section */}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={createProperty}
                                onChange={e => setCreateProperty(e.target.checked)}
                                style={{ width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>Add Client Address (Optional)</span>
                        </label>

                        {createProperty && (
                            <div style={{ paddingLeft: '24px' }}>
                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        required={createProperty}
                                        placeholder="Street Address"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={city}
                                        onChange={e => setCity(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        value={state}
                                        onChange={e => setState(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="ZIP Code"
                                        value={zip}
                                        onChange={e => setZip(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                    <textarea
                                        rows={2}
                                        placeholder="Notes (Gate code, access info, etc.)"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

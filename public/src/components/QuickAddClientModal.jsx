import { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../utils/api';

export default function QuickAddClientModal({ onClose, onConfirm }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/customers', {
                name,
                email: email || `${name.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase()}-${Date.now()}@example.com`,
                phone: '555-0123',
                address: 'Main St'
            });

            if (res.data && res.data.id) {
                onConfirm(res.data);
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
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '400px', padding: '24px'
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>Create</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

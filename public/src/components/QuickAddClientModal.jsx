import { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { useToast } from './ui/Toast';
import api from '../utils/api';

export default function QuickAddClientModal({ isOpen, onClose, onConfirm }) {
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
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Create client first
            const clientRes = await api.post('/customers', {
                name,
                email: email || `${name.replace(/[^a-zA-Z0-9]/g, '.').toLowerCase()}-${Date.now()}@example.com`,
                phone: phone || '',
                address: createProperty && address.trim() ? {
                    street: address,
                    city: city,
                    state: state,
                    zip: zip,
                    country: 'USA'
                } : null
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
            toast.error(`Failed to create client: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // Reset form on close
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setCity('');
        setState('');
        setZip('');
        setNotes('');
        setCreateProperty(false);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="New Client"
            size="md"
            footer={
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
                    <Button variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                            <Button 
                        variant="primary" 
                        type="submit"
                        form="quick-add-client-form"
                        loading={loading}
                        disabled={!name.trim()}
                    >
                        Create
                    </Button>
                </div>
            }
        >
            <form id="quick-add-client-form" onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor="client-name" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                        Client Name <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                        id="client-name"
                        type="text"
                        required
                        autoFocus
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                        inputMode="text"
                        autoComplete="name"
                    />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor="client-email" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                        Email <span style={{ color: 'var(--color-error)' }}>*</span>
                    </label>
                    <input
                        id="client-email"
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                        inputMode="email"
                        autoComplete="email"
                    />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                    <label htmlFor="client-phone" style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: '500' }}>
                        Phone (Optional)
                    </label>
                    <input
                        id="client-phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="555-0123"
                    />
                </div>

                {/* Property Section */}
                <div style={{ marginTop: 'var(--space-5)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--border-color)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={createProperty}
                            onChange={e => setCreateProperty(e.target.checked)}
                            style={{ width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: '500' }}>Add Client Address (Optional)</span>
                    </label>

                    {createProperty && (
                        <div style={{ paddingLeft: 'var(--space-6)' }}>
                            <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                                <input
                                    type="text"
                                    required={createProperty}
                                    placeholder="Street Address"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                        inputMode="text"
                        autoComplete="street-address"
                    />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                <input
                                    type="text"
                                    placeholder="City"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="input"
                                    style={{ width: '100%' }}
                                    inputMode="text"
                                    autoComplete="address-level2"
                                />
                                <input
                                    type="text"
                                    placeholder="State"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="input"
                                    style={{ width: '100%' }}
                                    inputMode="text"
                                    autoComplete="address-level1"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                                <input
                                    type="text"
                                    placeholder="ZIP Code"
                                    value={zip}
                                    onChange={e => setZip(e.target.value)}
                                    className="input"
                                    style={{ width: '100%' }}
                                    inputMode="numeric"
                                    autoComplete="postal-code"
                                />
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                                <textarea
                                    rows={2}
                                    placeholder="Notes (Gate code, access info, etc.)"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                        className="input"
                        style={{ width: '100%', resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
}

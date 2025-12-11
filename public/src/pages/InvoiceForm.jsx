import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Calendar } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

export default function InvoiceForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const workOrderData = location.state;

    const [formData, setFormData] = useState({
        clientName: workOrderData?.clientName || '',
        clientId: workOrderData?.clientId || '',
        address: workOrderData?.address || '',
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        items: workOrderData?.items || [],
        notes: workOrderData?.notes || '',
        subtotal: 0,
        tax: 0,
        total: 0
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        calculateTotals();
    }, [formData.items, formData.tax]);

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);
        const taxAmount = (subtotal * parseFloat(formData.tax || 0)) / 100;
        const total = subtotal + taxAmount;

        setFormData(prev => ({
            ...prev,
            subtotal: subtotal.toFixed(2),
            total: total.toFixed(2)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const invoiceData = {
                ...formData,
                workOrderId: workOrderData?.workOrderId
            };

            await api.post('/invoices', invoiceData);
            alert('Invoice created successfully!');
            navigate('/invoices');
        } catch (error) {
            console.error('Failed to create invoice:', error);
            alert('Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { name: '', description: '', price: '0.00', quantity: 1 }]
        }));
    };

    const removeItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateItem = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Create Invoice</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>
                                <ArrowLeft size={18} /> Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                                <Save size={18} /> {loading ? 'Saving...' : 'Save Invoice'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ marginTop: '24px' }}>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                        {/* Main Content */}
                        <div>
                            {/* Client Information */}
                            <div className="card" style={{ marginBottom: '24px' }}>
                                <h3 style={{ marginBottom: '16px' }}>Client Information</h3>
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    <div>
                                        <label className="form-label">Client Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.clientName}
                                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Address</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.address}
                                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Invoice Items */}
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3>Items / Services</h3>
                                    <button type="button" className="btn btn-sm btn-primary" onClick={addItem}>
                                        <Plus size={16} /> Add Item
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {formData.items.map((item, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '16px',
                                                background: '#f9fafb',
                                                borderRadius: '8px',
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 1fr auto',
                                                gap: '12px',
                                                alignItems: 'start'
                                            }}
                                        >
                                            <div>
                                                <input
                                                    type="text"
                                                    placeholder="Item name"
                                                    className="form-input"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                    style={{ marginBottom: '8px' }}
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Description (optional)"
                                                    className="form-input"
                                                    value={item.description || ''}
                                                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Price</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    className="form-input"
                                                    value={item.price}
                                                    onChange={(e) => updateItem(index, 'price', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-danger"
                                                onClick={() => removeItem(index)}
                                                style={{ marginTop: '24px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    {formData.items.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                            No items added. Click "Add Item" to get started.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div>
                            {/* Invoice Details */}
                            <div className="card" style={{ marginBottom: '16px' }}>
                                <h3 style={{ marginBottom: '16px' }}>Invoice Details</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label className="form-label">Invoice Number</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.invoiceNumber}
                                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                                            placeholder="INV-001"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Invoice Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.invoiceDate}
                                            onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Due Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="card">
                                <h3 style={{ marginBottom: '16px' }}>Summary</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#6b7280' }}>Subtotal</span>
                                        <span style={{ fontWeight: '500' }}>${formData.subtotal}</span>
                                    </div>
                                    <div>
                                        <label className="form-label">Tax (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={formData.tax}
                                            onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        paddingTop: '12px',
                                        borderTop: '2px solid #e5e7eb',
                                        fontSize: '18px',
                                        fontWeight: '600'
                                    }}>
                                        <span>Total</span>
                                        <span style={{ color: '#059669' }}>${formData.total}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="card" style={{ marginTop: '16px' }}>
                                <h3 style={{ marginBottom: '12px' }}>Notes</h3>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes or terms..."
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <style>{`
                .card {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .form-label {
                    display: block;
                    font-size: 14px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 6px;
                }
                .form-input {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }
            `}</style>
        </div>
    );
}

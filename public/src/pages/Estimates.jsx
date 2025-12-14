import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import {
    FileText, Plus, Edit, Trash2, Send, Download, Search,
    CheckCircle, XCircle, Clock, CheckSquare, Eye, Mail,
    DollarSign, User, Calendar, Package, X
} from 'lucide-react';
import logo from '../assets/logo.svg';
import DataGrid from '../components/DataGrid';
import ServiceSelectorModal from '../components/ServiceSelectorModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Estimates() {
    const [estimates, setEstimates] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState(null);
    const [estimateForm, setEstimateForm] = useState({
        estimateNumber: '',
        clientId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        items: [],
        subtotal: 0,
        taxRate: 10,
        tax: 0,
        discount: 0,
        discountType: 'percentage', // 'percentage' or 'fixed'
        total: 0,
        notes: '',
        terms: 'Payment due within 30 days',
        validUntil: '',
        issueDate: new Date().toISOString().split('T')[0],
        status: 'draft'
    });
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [estRes, custRes, servRes] = await Promise.all([
                api.get('/estimates'),
                api.get('/customers'),
                api.get('/services')
            ]);
            setEstimates(estRes.data || []);
            setCustomers(custRes.data || []);
            setServices(servRes.data || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateEstimateNumber = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `EST-${year}${month}-${random}`;
    };

    const calculateTotals = (items, discount, discountType, taxRate) => {
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        let discountAmount = 0;
        if (discountType === 'percentage') {
            discountAmount = (subtotal * discount) / 100;
        } else {
            discountAmount = discount;
        }
        const afterDiscount = subtotal - discountAmount;
        const tax = (afterDiscount * taxRate) / 100;
        const total = afterDiscount + tax;

        return {
            subtotal: subtotal.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2)
        };
    };

    const handleCreate = () => {
        const newEstimate = {
            estimateNumber: generateEstimateNumber(),
            clientId: '',
            clientName: '',
            clientEmail: '',
            clientPhone: '',
            clientAddress: '',
            items: [],
            subtotal: 0,
            taxRate: 10,
            tax: 0,
            discount: 0,
            discountType: 'percentage',
            total: 0,
            notes: '',
            terms: 'Payment due within 30 days',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            issueDate: new Date().toISOString().split('T')[0],
            status: 'draft'
        };
        setEstimateForm(newEstimate);
        setEditingEstimate(null);
        setShowCreateModal(true);
    };

    const handleEdit = (estimate) => {
        setEstimateForm({ ...estimate });
        setEditingEstimate(estimate);
        setShowCreateModal(true);
    };

    const handleClientChange = (clientId) => {
        const client = customers.find(c => c.id === clientId);
        if (client) {
            setEstimateForm(prev => ({
                ...prev,
                clientId,
                clientName: client.name || '',
                clientEmail: client.email || '',
                clientPhone: client.phone || '',
                clientAddress: client.address || ''
            }));
        }
    };

    const handleAddServices = (selectedServices) => {
        const newItems = selectedServices.map(service => ({
            id: service.id || `temp-${Date.now()}-${Math.random()}`,
            name: service.name,
            description: service.description || '',
            quantity: 1,
            price: parseFloat(service.price) || 0
        }));

        const updatedItems = [...estimateForm.items, ...newItems];
        const totals = calculateTotals(updatedItems, estimateForm.discount, estimateForm.discountType, estimateForm.taxRate);

        setEstimateForm(prev => ({
            ...prev,
            items: updatedItems,
            ...totals
        }));
    };

    const handleRemoveItem = (index) => {
        const updatedItems = estimateForm.items.filter((_, i) => i !== index);
        const totals = calculateTotals(updatedItems, estimateForm.discount, estimateForm.discountType, estimateForm.taxRate);

        setEstimateForm(prev => ({
            ...prev,
            items: updatedItems,
            ...totals
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...estimateForm.items];
        updatedItems[index][field] = field === 'quantity' || field === 'price' ? parseFloat(value) || 0 : value;

        const totals = calculateTotals(updatedItems, estimateForm.discount, estimateForm.discountType, estimateForm.taxRate);

        setEstimateForm(prev => ({
            ...prev,
            items: updatedItems,
            ...totals
        }));
    };

    const handleDiscountChange = (value, type) => {
        const discount = parseFloat(value) || 0;
        const totals = calculateTotals(estimateForm.items, discount, type || estimateForm.discountType, estimateForm.taxRate);

        setEstimateForm(prev => ({
            ...prev,
            discount,
            discountType: type || prev.discountType,
            ...totals
        }));
    };

    const handleTaxRateChange = (value) => {
        const taxRate = parseFloat(value) || 0;
        const totals = calculateTotals(estimateForm.items, estimateForm.discount, estimateForm.discountType, taxRate);

        setEstimateForm(prev => ({
            ...prev,
            taxRate,
            ...totals
        }));
    };

    const handleSave = async () => {
        try {
            if (!estimateForm.clientId) {
                alert('Please select a client');
                return;
            }
            if (estimateForm.items.length === 0) {
                alert('Please add at least one item');
                return;
            }

            const estimateData = {
                ...estimateForm,
                userId: user?.uid || user?.id,
                businessId: user?.businessId,
                createdAt: editingEstimate ? estimateForm.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (editingEstimate) {
                await api.put(`/estimates/${editingEstimate.id}`, estimateData);
            } else {
                await api.post('/estimates', estimateData);
            }

            setShowCreateModal(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save estimate:', error);
            alert('Failed to save estimate. Please try again.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this estimate?')) return;
        try {
            await api.delete(`/estimates/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete estimate:', error);
        }
    };

    const handleStatusChange = async (estimate, newStatus) => {
        try {
            await api.put(`/estimates/${estimate.id}`, {
                ...estimate,
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            fetchData();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleConvertToInvoice = async (estimate) => {
        if (!confirm('Convert this estimate to an invoice?')) return;
        try {
            const invoiceData = {
                customerId: estimate.clientId,
                customerName: estimate.clientName,
                customerEmail: estimate.clientEmail,
                customerPhone: estimate.clientPhone,
                items: estimate.items,
                subtotal: estimate.subtotal,
                tax: estimate.tax,
                discount: estimate.discount,
                total: estimate.total,
                notes: estimate.notes,
                issueDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'pending',
                userId: user?.uid || user?.id,
                businessId: user?.businessId
            };

            await api.post('/invoices', invoiceData);
            await handleStatusChange(estimate, 'converted');
            alert('Estimate converted to Invoice successfully!');
            navigate('/invoices');
        } catch (error) {
            console.error('Failed to convert:', error);
            alert('Failed to convert estimate to invoice');
        }
    };

    const generatePDF = (estimate) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.text('ESTIMATE', 105, 20, { align: 'center' });

        // Estimate Info
        doc.setFontSize(10);
        doc.text(`Estimate #: ${estimate.estimateNumber}`, 20, 35);
        doc.text(`Date: ${estimate.issueDate}`, 20, 42);
        doc.text(`Valid Until: ${estimate.validUntil}`, 20, 49);

        // Client Info
        doc.text('Bill To:', 20, 65);
        doc.text(estimate.clientName, 20, 72);
        if (estimate.clientAddress) doc.text(estimate.clientAddress, 20, 79);
        if (estimate.clientEmail) doc.text(estimate.clientEmail, 20, 86);
        if (estimate.clientPhone) doc.text(estimate.clientPhone, 20, 93);

        // Items Table
        const tableData = estimate.items.map(item => [
            item.name,
            item.description || '',
            item.quantity,
            `$${item.price.toFixed(2)}`,
            `$${(item.quantity * item.price).toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 105,
            head: [['Item', 'Description', 'Qty', 'Price', 'Total']],
            body: tableData,
            theme: 'striped'
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.text(`Subtotal: $${estimate.subtotal}`, 140, finalY);
        if (estimate.discount > 0) {
            doc.text(`Discount: -$${((estimate.subtotal * estimate.discount) / 100).toFixed(2)}`, 140, finalY + 7);
        }
        doc.text(`Tax (${estimate.taxRate}%): $${estimate.tax}`, 140, finalY + 14);
        doc.setFontSize(12);
        doc.text(`Total: $${estimate.total}`, 140, finalY + 24);

        // Notes
        if (estimate.notes) {
            doc.setFontSize(10);
            doc.text('Notes:', 20, finalY + 40);
            doc.text(estimate.notes, 20, finalY + 47, { maxWidth: 170 });
        }

        doc.save(`estimate-${estimate.estimateNumber}.pdf`);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { color: '#6b7280', bg: '#f3f4f6', icon: Edit },
            sent: { color: '#2563eb', bg: '#eff6ff', icon: Send },
            viewed: { color: '#7c3aed', bg: '#f5f3ff', icon: Eye },
            accepted: { color: '#059669', bg: '#ecfdf5', icon: CheckCircle },
            declined: { color: '#dc2626', bg: '#fef2f2', icon: XCircle },
            expired: { color: '#ea580c', bg: '#fff7ed', icon: Clock },
            converted: { color: '#0891b2', bg: '#ecfeff', icon: CheckSquare }
        };

        const config = statusConfig[status] || statusConfig.draft;
        const Icon = config.icon;

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: config.bg,
                color: config.color,
                fontSize: '12px',
                fontWeight: '500'
            }}>
                <Icon size={14} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const filteredEstimates = estimates.filter(est => {
        const matchesSearch = est.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            est.estimateNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || est.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const columns = [
        {
            key: 'estimateNumber',
            label: 'Estimate #',
            render: (item) => (
                <div style={{ fontWeight: '500', color: '#2563eb' }}>{item.estimateNumber}</div>
            )
        },
        {
            key: 'clientName',
            label: 'Client',
            render: (item) => (
                <div>
                    <div style={{ fontWeight: '500' }}>{item.clientName}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.clientEmail}</div>
                </div>
            )
        },
        {
            key: 'issueDate',
            label: 'Issue Date',
            render: (item) => new Date(item.issueDate).toLocaleDateString()
        },
        {
            key: 'validUntil',
            label: 'Valid Until',
            render: (item) => new Date(item.validUntil).toLocaleDateString()
        },
        {
            key: 'total',
            label: 'Total',
            render: (item) => (
                <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#059669' }}>
                    ${item.total}
                </span>
            )
        },
        {
            key: 'status',
            label: 'Status',
            render: (item) => getStatusBadge(item.status)
        }
    ];

    const ActionButtons = ({ item }) => (
        <>
            <button className="btn btn-icon" onClick={() => handleEdit(item)} title="Edit">
                <Edit size={16} />
            </button>
            <button className="btn btn-icon" onClick={() => generatePDF(item)} title="Download PDF">
                <Download size={16} />
            </button>
            {item.status !== 'converted' && (
                <button className="btn btn-icon" onClick={() => handleConvertToInvoice(item)} title="Convert to Invoice">
                    <CheckSquare size={16} />
                </button>
            )}
            <button className="btn btn-icon" onClick={() => handleDelete(item.id)} title="Delete">
                <Trash2 size={16} />
            </button>
        </>
    );

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Estimates</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                    {filteredEstimates.length} estimate{filteredEstimates.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={handleCreate}>
                                <Plus size={18} /> New Estimate
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ marginTop: '24px' }}>
                {/* Search and Filter Bar */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '250px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    type="text"
                                    placeholder="Search estimates..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 10px 10px 40px',
                                        borderRadius: '8px',
                                        border: '1px solid #d1d5db',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {['all', 'draft', 'sent', 'accepted', 'declined', 'converted'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: `2px solid ${statusFilter === status ? '#2563eb' : '#e5e7eb'}`,
                                        background: statusFilter === status ? '#eff6ff' : 'white',
                                        color: statusFilter === status ? '#2563eb' : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading estimates...</div>
                ) : (
                    <DataGrid
                        data={filteredEstimates}
                        columns={columns}
                        actions={[ActionButtons]}
                        tableName="Estimates"
                    />
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>{editingEstimate ? 'Edit Estimate' : 'New Estimate'}</h2>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        {/* Estimate Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>Estimate Number</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={estimateForm.estimateNumber}
                                    readOnly
                                    style={{ background: '#f3f4f6' }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Issue Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={estimateForm.issueDate}
                                    onChange={e => setEstimateForm({ ...estimateForm, issueDate: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Valid Until</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={estimateForm.validUntil}
                                    onChange={e => setEstimateForm({ ...estimateForm, validUntil: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Client Selection */}
                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={16} /> Client *
                            </label>
                            <select
                                className="form-control"
                                value={estimateForm.clientId}
                                onChange={e => handleClientChange(e.target.value)}
                                required
                            >
                                <option value="">Select Client</option>
                                {customers.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {estimateForm.clientId && (
                                <div style={{ marginTop: '12px', padding: '12px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px' }}>
                                    <div><strong>Email:</strong> {estimateForm.clientEmail || 'N/A'}</div>
                                    <div><strong>Phone:</strong> {estimateForm.clientPhone || 'N/A'}</div>
                                    <div><strong>Address:</strong> {estimateForm.clientAddress || 'N/A'}</div>
                                </div>
                            )}
                        </div>

                        {/* Line Items */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <label style={{ fontWeight: '500' }}>Line Items *</label>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => setShowServiceModal(true)}
                                >
                                    <Plus size={16} /> Add Services
                                </button>
                            </div>

                            {estimateForm.items.length > 0 ? (
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead style={{ background: '#f9fafb' }}>
                                            <tr>
                                                <th style={{ padding: '8px 12px', textAlign: 'left' }}>Item</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                                                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                                                <th style={{ padding: '8px 12px', width: '40px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {estimateForm.items.map((item, index) => (
                                                <tr key={index} style={{ borderTop: '1px solid #f3f4f6' }}>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <div style={{ fontWeight: '500' }}>{item.name}</div>
                                                        {item.description && (
                                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.description}</div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(index, 'quantity', e.target.value)}
                                                            style={{ width: '60px', padding: '4px', textAlign: 'center', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                                                        ${item.price.toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                                                        ${(item.quantity * item.price).toFixed(2)}
                                                    </td>
                                                    <td style={{ padding: '8px 12px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(index)}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ padding: '40px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                                    <Package size={48} style={{ margin: '0 auto 12px', color: '#9ca3af' }} />
                                    <p style={{ color: '#6b7280', margin: 0 }}>No items added. Click "Add Services" to get started.</p>
                                </div>
                            )}
                        </div>

                        {/* Totals */}
                        <div style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label>Discount</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={estimateForm.discount}
                                            onChange={e => handleDiscountChange(e.target.value)}
                                            className="form-control"
                                            style={{ flex: 1 }}
                                        />
                                        <select
                                            value={estimateForm.discountType}
                                            onChange={e => handleDiscountChange(estimateForm.discount, e.target.value)}
                                            className="form-control"
                                            style={{ width: '100px' }}
                                        >
                                            <option value="percentage">%</option>
                                            <option value="fixed">$</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={estimateForm.taxRate}
                                        onChange={e => handleTaxRateChange(e.target.value)}
                                        className="form-control"
                                    />
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                    <span>Subtotal:</span>
                                    <span style={{ fontFamily: 'monospace' }}>${estimateForm.subtotal}</span>
                                </div>
                                {estimateForm.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#059669' }}>
                                        <span>Discount:</span>
                                        <span style={{ fontFamily: 'monospace' }}>
                                            -{estimateForm.discountType === 'percentage' ? `${estimateForm.discount}%` : `$${estimateForm.discount}`}
                                        </span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                    <span>Tax ({estimateForm.taxRate}%):</span>
                                    <span style={{ fontFamily: 'monospace' }}>${estimateForm.tax}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#111827', paddingTop: '8px', borderTop: '2px solid #e5e7eb' }}>
                                    <span>Total:</span>
                                    <span style={{ fontFamily: 'monospace', color: '#059669' }}>${estimateForm.total}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes and Terms */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    rows={3}
                                    className="form-control"
                                    value={estimateForm.notes}
                                    onChange={e => setEstimateForm({ ...estimateForm, notes: e.target.value })}
                                    placeholder="Additional notes or comments..."
                                />
                            </div>
                            <div className="form-group">
                                <label>Terms & Conditions</label>
                                <textarea
                                    rows={3}
                                    className="form-control"
                                    value={estimateForm.terms}
                                    onChange={e => setEstimateForm({ ...estimateForm, terms: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSave}>
                                <CheckCircle size={18} /> Save Estimate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Selector Modal */}
            {showServiceModal && (
                <ServiceSelectorModal
                    onClose={() => setShowServiceModal(false)}
                    onSelect={handleAddServices}
                />
            )}
        </div>
    );
}

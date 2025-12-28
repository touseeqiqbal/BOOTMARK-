import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, MapPin, DollarSign, User, Plus, Trash2, Edit, X, Package, Receipt } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import ServiceSelectorModal from '../components/ServiceSelectorModal';
import QuickAddClientModal from '../components/QuickAddClientModal';
import QuickAddPropertyModal from '../components/QuickAddPropertyModal';

export default function WorkOrderForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [properties, setProperties] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showClientModal, setShowClientModal] = useState(false);
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [formSettings, setFormSettings] = useState(null); // Work order form settings
    const [formData, setFormData] = useState({
        clientId: '',
        clientName: '',
        propertyId: '',
        address: '',
        templateId: '',
        templateName: '',
        title: '',
        description: '',
        status: 'draft',
        scheduledDate: '',
        estimatedDuration: '',
        price: '',
        notes: '',
        items: [],
        materialsUsed: [], // Materials used in this work order
        templateResponses: {}, // Store form field responses
        autoCreateInvoice: false, // Auto-create invoice when work order is completed
        startTime: '', // Optional start time
        finishTime: '', // Optional finish time
        deicingMaterial: '', // Optional deicing material (Yes/No/Other)
        deicingMaterialOther: '' // Custom value when 'Other' is selected
    });

    const isEditMode = !!id;

    useEffect(() => {
        fetchFormSettings(); // Fetch form customization settings
        fetchClients();
        fetchTemplates();
        fetchMaterials();
        if (isEditMode) {
            fetchWorkOrder();
        }
    }, [id]);

    // Handle clientId from URL query parameter
    useEffect(() => {
        const clientIdFromUrl = searchParams.get('clientId');
        if (clientIdFromUrl && !isEditMode && clients.length > 0) {
            const client = clients.find(c => c.id === clientIdFromUrl);
            if (client) {
                setFormData(prev => ({
                    ...prev,
                    clientId: clientIdFromUrl,
                    clientName: client.name,
                    address: client.address || '' // Populate with client's address
                }));
            }
        }
    }, [searchParams, clients, isEditMode]);

    useEffect(() => {
        if (formData.clientId) {
            fetchClientProperties(formData.clientId);
        }
    }, [formData.clientId]);

    const fetchFormSettings = async () => {
        try {
            const res = await api.get('/work-orders/settings');
            setFormSettings(res.data);

            // Initialize custom fields in formData
            if (res.data.customFields && res.data.customFields.length > 0) {
                const customFieldsData = {};
                res.data.customFields.forEach(field => {
                    customFieldsData[field.name] = field.type === 'checkbox' ? false : '';
                });
                setFormData(prev => ({ ...prev, customFields: customFieldsData }));
            }
        } catch (error) {
            console.error('Failed to fetch form settings', error);
        }
    };

    const fetchClients = async () => {
        try {
            const res = await api.get('/customers');
            setClients(res.data);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        }
    };

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/work-order-templates');
            setTemplates(res.data || []);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        }
    };

    const fetchClientProperties = async (clientId) => {
        try {
            const res = await api.get(`/properties?customerId=${clientId}`);
            setProperties(res.data);
        } catch (error) {
            console.error('Failed to fetch properties', error);
        }
    };

    const fetchMaterials = async () => {
        try {
            const res = await api.get('/materials');
            setMaterials(res.data);
        } catch (error) {
            console.error('Failed to fetch materials', error);
        }
    };

    const handleAddMaterial = (material) => {
        const existing = formData.materialsUsed.find(m => m.id === material.id);
        if (existing) {
            // Update quantity
            setFormData(prev => ({
                ...prev,
                materialsUsed: prev.materialsUsed.map(m =>
                    m.id === material.id
                        ? { ...m, quantity: m.quantity + 1 }
                        : m
                )
            }));
        } else {
            // Add new material
            setFormData(prev => ({
                ...prev,
                materialsUsed: [...prev.materialsUsed, {
                    id: material.id,
                    name: material.name,
                    sku: material.sku,
                    unit: material.unit,
                    costPrice: material.costPrice,
                    sellingPrice: material.sellingPrice,
                    quantity: 1
                }]
            }));
        }
        setShowMaterialsModal(false);
    };

    const handleRemoveMaterial = (materialId) => {
        setFormData(prev => ({
            ...prev,
            materialsUsed: prev.materialsUsed.filter(m => m.id !== materialId)
        }));
    };

    const handleMaterialQuantityChange = (materialId, quantity) => {
        setFormData(prev => ({
            ...prev,
            materialsUsed: prev.materialsUsed.map(m =>
                m.id === materialId
                    ? { ...m, quantity: parseInt(quantity) || 0 }
                    : m
            )
        }));
    };


    const fetchWorkOrder = async () => {
        try {
            const res = await api.get(`/work-orders/${id}`);
            const workOrder = res.data;

            // Populate form data with the fetched work order
            setFormData({
                clientId: workOrder.clientId || '',
                clientName: workOrder.clientName || '',
                propertyId: workOrder.propertyId || '',
                address: workOrder.address || '',
                templateId: workOrder.templateId || '',
                templateName: workOrder.templateName || '',
                title: workOrder.title || '',
                description: workOrder.description || '',
                status: workOrder.status || 'draft',
                scheduledDate: workOrder.scheduledDate ? workOrder.scheduledDate.split('T')[0] : '',
                estimatedDuration: workOrder.estimatedDuration || '',
                price: workOrder.price || '',
                notes: workOrder.notes || '',
                items: workOrder.items || [],
                materialsUsed: workOrder.materialsUsed || [],
                templateResponses: workOrder.templateResponses || {},
                autoCreateInvoice: workOrder.autoCreateInvoice || false
            });

            // If there's a client, fetch their properties
            if (workOrder.clientId) {
                await fetchClientProperties(workOrder.clientId);
            }
        } catch (error) {
            console.error('Failed to fetch work order', error);
            alert('Failed to load work order data');
        }
    }

    const handleClientChange = (e) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        setFormData(prev => ({
            ...prev,
            clientId,
            clientName: client ? client.name : '',
            propertyId: '',
            address: client?.address || '' // Populate with client's address
        }));
    };


    const handlePropertyChange = (e) => {
        const propertyId = e.target.value;
        const property = properties.find(p => p.id === propertyId);
        setFormData(prev => ({
            ...prev,
            propertyId,
            address: property ? `${property.address}, ${property.city}` : ''
        }));
    };


    const handleTemplateChange = (e) => {
        const templateId = e.target.value;
        const template = templates.find(f => f.id === templateId);

        if (template) {
            const templateTitle = template.name || 'Untitled Template';
            // Initialize empty responses for custom fields
            const initialResponses = {};
            if (template.fields && Array.isArray(template.fields)) {
                template.fields.forEach(field => {
                    initialResponses[field.id] = '';
                });
            }

            setFormData(prev => ({
                ...prev,
                templateId,
                templateName: templateTitle,
                title: templateTitle,
                description: template.description || '',
                estimatedDuration: template.defaultDuration || '',
                price: template.defaultPrice || '',
                status: template.defaultStatus || 'draft',
                templateResponses: initialResponses
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                templateId: '',
                templateName: '',
                title: '',
                description: '',
                estimatedDuration: '',
                price: '',
                status: 'draft',
                templateResponses: {}
            }));
        }
    };

    const handleAddServices = (services) => {
        if (!Array.isArray(services)) return;

        const newItems = services.map(s => ({
            id: s.id || `temp-${Date.now()}-${Math.random()}`,
            name: s.name || 'Unknown Service',
            description: s.description || '',
            price: s.price !== undefined ? s.price : 0,
            unit: s.unit || 'flat'
        }));

        setFormData(prev => {
            const combined = [...(prev.items || []), ...newItems];

            const total = combined.reduce((sum, item) => {
                const p = parseFloat(item.price);
                return sum + (isNaN(p) ? 0 : p);
            }, 0);

            return {
                ...prev,
                items: combined,
                price: total.toFixed(2)
            };
        });
    };

    const removeServiceItem = (index) => {
        setFormData(prev => {
            const newItems = [...prev.items];
            newItems.splice(index, 1);
            const total = newItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
            return {
                ...prev,
                items: newItems,
                price: total.toFixed(2)
            };
        });
    };

    const handleClientCreated = (newClient) => {
        if (!newClient || !newClient.id) return;

        setClients(prev => [...prev, newClient]);
        setFormData(prev => ({
            ...prev,
            clientId: newClient.id,
            clientName: newClient.name,
            propertyId: '',
            address: newClient.address || '' // Populate with new client's address
        }));
        setProperties([]);
    };

    const handlePropertyCreated = (newProp) => {
        setProperties(prev => [...prev, newProp]);
        setFormData(prev => ({
            ...prev,
            propertyId: newProp.id,
            address: `${newProp.address}, ${newProp.city}`
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let savedWorkOrder;
            if (isEditMode) {
                const res = await api.put(`/work-orders/${id}`, formData);
                savedWorkOrder = res.data;
            } else {
                const res = await api.post('/work-orders', formData);
                savedWorkOrder = res.data;
            }

            // Auto-create invoice if checkbox is checked and status is completed
            if (formData.autoCreateInvoice && formData.status === 'completed') {
                try {
                    // Calculate total from items and materials
                    const itemsTotal = (formData.items || []).reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1), 0);
                    const materialsTotal = (formData.materialsUsed || []).reduce((sum, mat) => sum + (parseFloat(mat.sellingPrice) || 0) * (parseInt(mat.quantity) || 1), 0);
                    const total = itemsTotal + materialsTotal + (parseFloat(formData.price) || 0);

                    const invoiceData = {
                        clientId: formData.clientId,
                        clientName: formData.clientName,
                        workOrderId: savedWorkOrder.id,
                        workOrderNumber: savedWorkOrder.workOrderNumber,
                        issueDate: new Date().toISOString(),
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
                        items: [
                            ...(formData.items || []),
                            ...(formData.materialsUsed || []).map(mat => ({
                                description: `${mat.name} (${mat.sku || ''})`,
                                quantity: mat.quantity,
                                price: mat.sellingPrice,
                                total: mat.quantity * mat.sellingPrice
                            }))
                        ],
                        subtotal: total,
                        tax: total * 0.1, // 10% tax
                        total: total * 1.1,
                        status: 'pending',
                        notes: formData.description || formData.notes || `Work Order ${savedWorkOrder.workOrderNumber}`,
                        description: formData.description || '' // Add description field for invoice
                    };

                    await api.post('/invoices', invoiceData);
                    alert('Work order saved and invoice created successfully!');
                } catch (invoiceError) {
                    console.error('Failed to create invoice:', invoiceError);
                    alert('Work order saved but failed to create invoice');
                }
            }

            navigate('/work-orders');
        } catch (error) {
            console.error('Failed to save work order', error);
            alert('Failed to save work order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">{isEditMode ? 'Edit Work Order' : 'New Work Order'}</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/work-orders')}
                                type="button"
                            >
                                <ArrowLeft size={18} /> Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={loading}
                            >
                                <Save size={18} /> Save Work Order
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: '800px', margin: '0 auto', background: 'white', padding: '32px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select Template (Optional)</label>
                        <select
                            value={formData.templateId}
                            onChange={handleTemplateChange}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        >
                            <option value="">-- No Template (Custom Job) --</option>
                            {templates.map(template => (
                                <option key={template.id} value={template.id}>
                                    {template.name || `Template ${template.id.substring(0, 8)}`}
                                </option>
                            ))}
                        </select>
                        <small style={{ display: 'block', marginTop: '4px', color: '#6b7280' }}>
                            Select a form template to auto-fill job details, or leave blank for custom work order
                        </small>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Title / Job Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Spring Cleanup"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>

                    {/* Render Form Fields if Template Selected */}
                    {formData.templateId && (() => {
                        console.log('[WorkOrderForm] Template ID selected:', formData.templateId);
                        console.log('[WorkOrderForm] Available templates:', templates.length);
                        const selectedTemplate = templates.find(t => t.id === formData.templateId);
                        console.log('[WorkOrderForm] Selected template:', selectedTemplate);
                        console.log('[WorkOrderForm] Template fields:', selectedTemplate?.fields);

                        if (!selectedTemplate || !selectedTemplate.fields || selectedTemplate.fields.length === 0) {
                            console.log('[WorkOrderForm] No template or no fields found');
                            return null;
                        }

                        console.log('[WorkOrderForm] Rendering', selectedTemplate.fields.length, 'fields');
                        return (
                            <div style={{ marginBottom: '24px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                                    Form Fields
                                </h3>
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {selectedTemplate.fields.map((field, index) => (
                                        <div key={field.id || index} className="form-group">
                                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px' }}>
                                                {field.label || field.name || `Field ${index + 1}`}
                                                {field.required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
                                            </label>

                                            {(['short-text', 'text', 'email', 'phone', 'tel', 'number'].includes(field.type)) && (
                                                <input
                                                    type={field.type === 'short-text' ? 'text' : field.type === 'phone' ? 'tel' : field.type}
                                                    value={formData.templateResponses[field.id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        templateResponses: {
                                                            ...prev.templateResponses,
                                                            [field.id]: e.target.value
                                                        }
                                                    }))}
                                                    placeholder={field.placeholder || ''}
                                                    required={field.required}
                                                    className="form-control"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                                />
                                            )}

                                            {(['long-text', 'textarea', 'paragraph'].includes(field.type)) && (
                                                <textarea
                                                    value={formData.templateResponses[field.id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        templateResponses: {
                                                            ...prev.templateResponses,
                                                            [field.id]: e.target.value
                                                        }
                                                    }))}
                                                    placeholder={field.placeholder || ''}
                                                    required={field.required}
                                                    rows={field.rows || 4}
                                                    className="form-control"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                                />
                                            )}

                                            {(['dropdown', 'select'].includes(field.type)) && (
                                                <select
                                                    value={formData.templateResponses[field.id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        templateResponses: {
                                                            ...prev.templateResponses,
                                                            [field.id]: e.target.value
                                                        }
                                                    }))}
                                                    required={field.required}
                                                    className="form-control"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                                >
                                                    <option value="">-- Select --</option>
                                                    {field.options && field.options.map((option, i) => (
                                                        <option key={i} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            )}

                                            {(['single-choice', 'radio'].includes(field.type)) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {field.options && field.options.map((option, i) => (
                                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                            <input
                                                                type="radio"
                                                                name={field.id}
                                                                value={option}
                                                                checked={formData.templateResponses[field.id] === option}
                                                                onChange={(e) => setFormData(prev => ({
                                                                    ...prev,
                                                                    templateResponses: {
                                                                        ...prev.templateResponses,
                                                                        [field.id]: e.target.value
                                                                    }
                                                                }))}
                                                                required={field.required && i === 0}
                                                            />
                                                            <span>{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {(['multiple-choice', 'checkbox'].includes(field.type)) && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {field.options && field.options.map((option, i) => (
                                                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                value={option}
                                                                checked={(formData.templateResponses[field.id] || []).includes(option)}
                                                                onChange={(e) => {
                                                                    const currentValues = formData.templateResponses[field.id] || [];
                                                                    const newValues = e.target.checked
                                                                        ? [...currentValues, option]
                                                                        : currentValues.filter(v => v !== option);
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        templateResponses: {
                                                                            ...prev.templateResponses,
                                                                            [field.id]: newValues
                                                                        }
                                                                    }));
                                                                }}
                                                            />
                                                            <span>{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {(['date-picker', 'date'].includes(field.type)) && (
                                                <input
                                                    type="date"
                                                    value={formData.templateResponses[field.id] || ''}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        templateResponses: {
                                                            ...prev.templateResponses,
                                                            [field.id]: e.target.value
                                                        }
                                                    }))}
                                                    required={field.required}
                                                    className="form-control"
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <User size={16} /> Client
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    required
                                    value={formData.clientId}
                                    onChange={handleClientChange}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">-- Select Client --</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setShowClientModal(true)} className="btn btn-secondary" style={{ padding: '0 12px' }} title="New Client">
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <MapPin size={16} /> Property
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    required
                                    value={formData.propertyId}
                                    onChange={handlePropertyChange}
                                    disabled={!formData.clientId}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                >
                                    <option value="">-- Select Property --</option>
                                    {properties.map(property => (
                                        <option key={property.id} value={property.id}>{property.address}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => setShowPropertyModal(true)} className="btn btn-secondary" style={{ padding: '0 12px' }} title="New Property" disabled={!formData.clientId}>
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <Calendar size={16} /> Scheduled Date
                            </label>
                            <input
                                type="date"
                                value={formData.scheduledDate ? formData.scheduledDate.split('T')[0] : ''}
                                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            >
                                <option value="draft">Draft</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="invoiced">Invoiced</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <DollarSign size={16} /> Price ($)
                            </label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                    </div>

                    {/* Optional Fields Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <Calendar size={16} /> Start Time (Optional)
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                <Calendar size={16} /> Finish Time (Optional)
                            </label>
                            <input
                                type="time"
                                value={formData.finishTime}
                                onChange={e => setFormData({ ...formData, finishTime: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                Deicing Material? (Optional)
                            </label>
                            <select
                                value={formData.deicingMaterial}
                                onChange={e => setFormData({ ...formData, deicingMaterial: e.target.value })}
                                className="form-control"
                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            >
                                <option value="">-- Select --</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="Other">Other</option>
                            </select>

                            {/* Show text input when 'Other' is selected */}
                            {formData.deicingMaterial === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Please specify..."
                                    value={formData.deicingMaterialOther}
                                    onChange={e => setFormData({ ...formData, deicingMaterialOther: e.target.value })}
                                    className="form-control"
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '8px' }}
                                />
                            )}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                            <span>Work Order Items</span>
                            <button type="button" onClick={() => setShowServiceModal(true)} className="btn btn-sm btn-outline" style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '13px' }}>
                                <Plus size={14} /> Add Services
                            </button>
                        </label>

                        {formData.items && formData.items.length > 0 ? (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <tr>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Service</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Description</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Price</th>
                                            <th style={{ padding: '8px 12px', width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.items.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px' }}>{item.name}</td>
                                                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '13px' }}>{item.description}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>${item.price}</td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <button type="button" onClick={() => removeServiceItem(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                No services added. Click "Add Services" to select from catalog.
                            </div>
                        )}
                    </div>

                    {/* Materials Used Section */}
                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontWeight: '500' }}>
                            <span>Materials Used (Optional)</span>
                            <button type="button" onClick={() => setShowMaterialsModal(true)} className="btn btn-sm btn-outline" style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '13px' }}>
                                <Plus size={14} /> Add Materials
                            </button>
                        </label>

                        {formData.materialsUsed && formData.materialsUsed.length > 0 ? (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <tr>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Material</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>SKU</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Quantity</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Unit Price</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                                            <th style={{ padding: '8px 12px', width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.materialsUsed.map((material, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px' }}>{material.name}</td>
                                                <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: '13px' }}>{material.sku || '-'}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={material.quantity}
                                                        onChange={(e) => handleMaterialQuantityChange(material.id, e.target.value)}
                                                        style={{ width: '60px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', textAlign: 'center' }}
                                                    />
                                                    <span style={{ marginLeft: '4px', fontSize: '12px', color: '#6b7280' }}>{material.unit}</span>
                                                </td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>${material.sellingPrice?.toFixed(2)}</td>
                                                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: '500' }}>
                                                    ${(material.sellingPrice * material.quantity).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '8px 12px' }}>
                                                    <button type="button" onClick={() => handleRemoveMaterial(material.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>
                                                        <X size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                                        <tr>
                                            <td colSpan="4" style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '500' }}>Materials Total:</td>
                                            <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '15px' }}>
                                                ${formData.materialsUsed.reduce((sum, m) => sum + (m.sellingPrice * m.quantity), 0).toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                No materials added. Click "Add Materials" to track material usage.
                            </div>
                        )}
                    </div>

                    {/* Auto-Create Invoice Checkbox */}
                    <div className="form-group" style={{ marginBottom: '24px', padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                            <input
                                type="checkbox"
                                checked={formData.autoCreateInvoice}
                                onChange={(e) => setFormData({ ...formData, autoCreateInvoice: e.target.checked })}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <div>
                                <div style={{ fontWeight: '500', color: '#1e40af' }}>Auto-create invoice when work order is marked as completed</div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                    An invoice will be automatically generated when you change the status to "completed"
                                </div>
                            </div>
                        </label>
                    </div>

                    {/* Custom Fields Section */}
                    {formSettings && formSettings.customFields && formSettings.customFields.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px' }}>
                                Additional Information
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                {formSettings.customFields.map((field) => (
                                    <div key={field.id} className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500' }}>
                                            {field.label}
                                            {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                        </label>

                                        {/* Render different field types */}
                                        {field.type === 'text' && (
                                            <input
                                                type="text"
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        )}

                                        {field.type === 'textarea' && (
                                            <textarea
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                rows={4}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        )}

                                        {field.type === 'number' && (
                                            <input
                                                type="number"
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        )}

                                        {field.type === 'date' && (
                                            <input
                                                type="date"
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                required={field.required}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        )}

                                        {field.type === 'time' && (
                                            <input
                                                type="time"
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                required={field.required}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            />
                                        )}

                                        {field.type === 'dropdown' && (
                                            <select
                                                value={formData.customFields?.[field.name] || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...formData.customFields, [field.name]: e.target.value }
                                                })}
                                                required={field.required}
                                                className="form-control"
                                                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                            >
                                                <option value="">-- Select --</option>
                                                {field.options && field.options.map((option, idx) => (
                                                    <option key={idx} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        )}

                                        {field.type === 'checkbox' && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.customFields?.[field.name] || false}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        customFields: { ...formData.customFields, [field.name]: e.target.checked }
                                                    })}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <span>{field.helpText || 'Yes'}</span>
                                            </label>
                                        )}

                                        {field.helpText && field.type !== 'checkbox' && (
                                            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                                                {field.helpText}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Description (Additional Notes)</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            placeholder="Usage notes..."
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Internal Notes</label>
                        <textarea
                            rows={3}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="form-control"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            placeholder="Access codes, crew instructions, etc."
                        />
                    </div>

                </form >
            </div >

            {showServiceModal && (
                <ServiceSelectorModal
                    onClose={() => setShowServiceModal(false)}
                    onSelect={handleAddServices}
                />
            )}

            {
                showClientModal && (
                    <QuickAddClientModal
                        onClose={() => setShowClientModal(false)}
                        onConfirm={handleClientCreated}
                    />
                )
            }

            {
                showPropertyModal && (
                    <QuickAddPropertyModal
                        onClose={() => setShowPropertyModal(false)}
                        onConfirm={handlePropertyCreated}
                        clientId={formData.clientId}
                    />
                )
            }

            {/* Materials Modal */}
            {showMaterialsModal && (
                <div className="modal-overlay" onClick={() => setShowMaterialsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0 }}>Select Materials</h2>
                            <button onClick={() => setShowMaterialsModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '24px', color: '#6b7280' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <input
                                type="text"
                                placeholder="Search materials..."
                                className="form-control"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {materials.map(material => (
                                <div
                                    key={material.id}
                                    onClick={() => handleAddMaterial(material)}
                                    style={{
                                        padding: '16px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: formData.materialsUsed.find(m => m.id === material.id) ? '#eff6ff' : 'white'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>{material.name}</h4>
                                            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
                                                {material.sku && `SKU: ${material.sku} • `}
                                                {material.category} • {material.unit}
                                            </p>
                                            <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
                                                <span style={{ color: '#6b7280' }}>
                                                    In Stock: <strong>{material.quantityInStock}</strong>
                                                </span>
                                                <span style={{ color: '#6b7280' }}>
                                                    Price: <strong>${material.sellingPrice?.toFixed(2)}</strong>
                                                </span>
                                            </div>
                                        </div>
                                        {formData.materialsUsed.find(m => m.id === material.id) && (
                                            <span style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '12px' }}>
                                                Added
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {materials.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                <Package size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                                <p>No materials available. Add materials from the Materials page first.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
}

import { useState, useEffect } from 'react';
import { X, Plus, Minus, DollarSign } from 'lucide-react';
import api from '../utils/api';

export default function ServiceSelectorModal({ onClose, onSelect }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedServices, setSelectedServices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Load categories from localStorage
    const categories = ['All', ...(JSON.parse(localStorage.getItem('serviceCategories') || '[]').filter(c => c !== 'All'))];

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const res = await api.get('/services');
            setServices(res.data);
        } catch (error) {
            console.error('Failed to fetch services', error);
        } finally {
            setLoading(false);
        }
    };

    const handleServiceToggle = (service) => {
        const exists = selectedServices.find(s => s.id === service.id);
        if (exists) {
            setSelectedServices(selectedServices.filter(s => s.id !== service.id));
        } else {
            setSelectedServices([...selectedServices, {
                ...service,
                customPrice: parseFloat(service.price) || 0,
                tier: 0, // Default to No Tier (base price)
                adjustment: 0,
                customDescription: service.description || ''
            }]);
        }
    };

    const updateServicePrice = (serviceId, field, value) => {
        setSelectedServices(selectedServices.map(s => {
            if (s.id === serviceId) {
                const updated = { ...s, [field]: value };

                // Recalculate custom price based on tier and adjustment
                const basePrice = parseFloat(s.price) || 0;
                let tierMultiplier = 1;

                if (updated.tier === 0) tierMultiplier = 1; // No tier - base price
                else if (updated.tier === 1) tierMultiplier = 1;
                else if (updated.tier === 2) tierMultiplier = 1.5;
                else if (updated.tier === 3) tierMultiplier = 2;

                const tierPrice = basePrice * tierMultiplier;
                const finalPrice = tierPrice + (parseFloat(updated.adjustment) || 0);

                updated.customPrice = Math.max(0, finalPrice);

                return updated;
            }
            return s;
        }));
    };

    const handleConfirm = () => {
        const servicesToAdd = selectedServices.map(s => {
            // Build description with tier info
            let description = s.customDescription || s.description || '';
            const tierLabel = s.tier === 0 ? 'Base Price' : s.tier === 1 ? 'Tier 1' : s.tier === 2 ? 'Tier 2' : 'Tier 3';

            // Add tier info to description if not base price
            if (description && s.tier > 0) {
                description = `${description} (${tierLabel})`;
            } else if (s.tier > 0) {
                description = tierLabel;
            }

            return {
                ...s,
                price: s.customPrice,
                description: description
            };
        });
        onSelect(servicesToAdd);
        onClose();
    };

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '12px', width: '95%', maxWidth: '1000px',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Select Services</h2>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <X size={24} />
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px', marginBottom: '12px' }}
                    />

                    {/* Category Filter */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategoryFilter(cat)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: `2px solid ${categoryFilter === cat ? '#2563eb' : '#e5e7eb'}`,
                                    background: categoryFilter === cat ? '#eff6ff' : 'white',
                                    color: categoryFilter === cat ? '#2563eb' : '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Available Services */}
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', borderRight: '1px solid #e5e7eb' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>AVAILABLE SERVICES</h3>
                        {loading ? (
                            <div>Loading...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredServices.map(service => {
                                    const isSelected = selectedServices.find(s => s.id === service.id);
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => handleServiceToggle(service)}
                                            style={{
                                                padding: '12px',
                                                border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#eff6ff' : 'white',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <div>
                                                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{service.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{service.category}</div>
                                                </div>
                                                <div style={{ fontWeight: '600', color: '#059669', fontSize: '14px' }}>
                                                    ${service.price}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Selected Services with Pricing */}
                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#f9fafb' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                            SELECTED ({selectedServices.length})
                        </h3>
                        {selectedServices.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: '14px' }}>
                                Select services from the left to customize pricing
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {selectedServices.map(service => (
                                    <div key={service.id} style={{ background: 'white', borderRadius: '8px', padding: '16px', border: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <div style={{ fontWeight: '500', fontSize: '14px' }}>{service.name}</div>
                                            <button
                                                onClick={() => handleServiceToggle(service)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>

                                        {/* Tier Selection */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }}>
                                                Pricing Tier
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                                {[0, 1, 2, 3].map(tier => (
                                                    <button
                                                        key={tier}
                                                        onClick={() => updateServicePrice(service.id, 'tier', tier)}
                                                        style={{
                                                            padding: '8px',
                                                            borderRadius: '6px',
                                                            border: `2px solid ${service.tier === tier ? '#2563eb' : '#d1d5db'}`,
                                                            background: service.tier === tier ? '#eff6ff' : 'white',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '500',
                                                            color: service.tier === tier ? '#2563eb' : '#6b7280'
                                                        }}
                                                    >
                                                        {tier === 0 ? 'No Tier' : `Tier ${tier}`}
                                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                                            {tier === 0 ? 'Base' : tier === 1 ? '1x' : tier === 2 ? '1.5x' : '2x'}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Price Adjustment */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }}>
                                                Price Adjustment
                                            </label>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => updateServicePrice(service.id, 'adjustment', (service.adjustment || 0) - 5)}
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={service.adjustment || 0}
                                                    onChange={e => updateServicePrice(service.id, 'adjustment', parseFloat(e.target.value) || 0)}
                                                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', textAlign: 'center', fontSize: '14px' }}
                                                    placeholder="0"
                                                />
                                                <button
                                                    onClick={() => updateServicePrice(service.id, 'adjustment', (service.adjustment || 0) + 5)}
                                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Custom Description (Optional) */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '6px' }}>
                                                Custom Description <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Optional)</span>
                                            </label>
                                            <textarea
                                                value={service.customDescription || ''}
                                                onChange={e => updateServicePrice(service.id, 'customDescription', e.target.value)}
                                                placeholder="Add specific notes or requirements for this service..."
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #d1d5db',
                                                    fontSize: '13px',
                                                    fontFamily: 'inherit',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>

                                        {/* Final Price Display */}
                                        <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '500' }}>Final Price:</span>
                                                <span style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>
                                                    ${service.customPrice.toFixed(2)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                                                Base: ${service.price} × Tier {service.tier} {service.adjustment !== 0 && `${service.adjustment > 0 ? '+' : ''}$${service.adjustment}`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        Total: <span style={{ fontWeight: '600', color: '#111827' }}>
                            ${selectedServices.reduce((sum, s) => sum + s.customPrice, 0).toFixed(2)}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button
                            onClick={handleConfirm}
                            className="btn btn-primary"
                            disabled={selectedServices.length === 0}
                        >
                            <Plus size={18} /> Add {selectedServices.length} Service{selectedServices.length !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

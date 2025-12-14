import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Plus, Edit, Trash2, Tag,
    DollarSign, Filter, Layers, Download, Settings, Upload
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import DataGrid from '../components/DataGrid';
import BulkServiceModal from '../components/BulkServiceModal';
import CategoryManagerModal from '../components/CategoryManagerModal';
import CSVImportModal from '../components/CSVImportModal';
import SearchBar from '../components/SearchBar';

export default function Services() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [bulkCategory, setBulkCategory] = useState('');
    const [editingService, setEditingService] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Lawn / Turf Care',
        unit: 'per visit'
    });
    const navigate = useNavigate();

    // Load categories from localStorage or use defaults
    const defaultCategories = [
        'All',
        'Lawn / Turf Care',
        'Beds, Gardens & Mulch',
        'Shrubs, Hedges & Trees',
        'Seasonal Cleanups',
        'Hardscape / Property Care',
        'Irrigation',
        'Snow & Ice'
    ];

    const [categories, setCategories] = useState(() => {
        const saved = localStorage.getItem('serviceCategories');
        return saved ? JSON.parse(saved) : defaultCategories;
    });

    // Save categories to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('serviceCategories', JSON.stringify(categories));
    }, [categories]);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const res = await api.get('/services');
            setServices(res.data);
        } catch (error) {
            console.error('Failed to fetch services', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description,
            price: service.price,
            category: service.category || 'Lawn / Turf Care',
            unit: service.unit || 'per visit'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        try {
            await api.delete(`/services/${id}`);
            fetchServices();
        } catch (error) {
            console.error('Failed to delete service', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingService) {
                await api.put(`/services/${editingService.id}`, formData);
            } else {
                await api.post('/services', formData);
            }
            setShowModal(false);
            setEditingService(null);
            setFormData({ name: '', description: '', price: '', category: 'Lawn / Turf Care', unit: 'per visit' });
            fetchServices();
        } catch (error) {
            console.error('Failed to save service', error);
        }
    };

    const handleBulkImport = async (servicesToAdd) => {
        try {
            // Add all services in parallel
            await Promise.all(
                servicesToAdd.map(service => api.post('/services', service))
            );
            fetchServices();
        } catch (error) {
            console.error('Failed to import services', error);
            alert('Some services failed to import. Please try again.');
        }
    };

    const filteredServices = services.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Group services by category
    const servicesByCategory = categories.slice(1).reduce((acc, cat) => {
        acc[cat] = filteredServices.filter(s => s.category === cat);
        return acc;
    }, {});

    const columns = [
        {
            key: 'name',
            label: 'Service Name',
            render: (item) => (
                <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.description}</div>
                </div>
            )
        },
        { key: 'category', label: 'Category' },
        {
            key: 'price',
            label: 'Price',
            render: (item) => <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#059669' }}>${item.price} / {item.unit || 'visit'}</span>
        },
        { key: 'sku', label: 'SKU' },
        { key: 'type', label: 'Type' },
        { key: 'variantName', label: 'Variant' }
    ];

    const ActionButtons = ({ item }) => (
        <>
            <button className="btn btn-icon" onClick={() => handleEdit(item)} title="Edit"><Edit size={16} /></button>
            <button className="btn btn-icon" onClick={() => handleDelete(item.id)} title="Delete"><Trash2 size={16} /></button>
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
                                <h1 className="brand-title">Services Catalog</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                                    {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
                                    {selectedCategory !== 'All' && ` in ${selectedCategory}`}
                                </p>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCategoryManager(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Settings size={18} /> Manage Categories
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setBulkCategory(selectedCategory === 'All' ? categories[1] : selectedCategory);
                                    setShowBulkModal(true);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Download size={18} /> Import Templates
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCSVModal(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Upload size={18} /> Import from File
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingService(null);
                                    setFormData({ name: '', description: '', price: '', category: categories[1] || 'Lawn / Turf Care', unit: 'per visit' });
                                    setShowModal(true);
                                }}
                            >
                                <Plus size={18} /> Add Service
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
                            <SearchBar
                                value={searchTerm}
                                onChange={setSearchTerm}
                                placeholder="Search services by name or description..."
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: `2px solid ${selectedCategory === cat ? '#2563eb' : '#e5e7eb'}`,
                                        background: selectedCategory === cat ? '#eff6ff' : 'white',
                                        color: selectedCategory === cat ? '#2563eb' : '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {cat}
                                    {cat !== 'All' && servicesByCategory[cat] && (
                                        <span style={{
                                            marginLeft: '6px',
                                            padding: '2px 6px',
                                            borderRadius: '10px',
                                            background: selectedCategory === cat ? '#2563eb' : '#e5e7eb',
                                            color: selectedCategory === cat ? 'white' : '#6b7280',
                                            fontSize: '11px'
                                        }}>
                                            {servicesByCategory[cat].length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="loading">Loading services...</div>
                ) : selectedCategory === 'All' ? (
                    // Show all services grouped by category
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        {categories.slice(1).map(cat => {
                            const categoryServices = servicesByCategory[cat];
                            if (!categoryServices || categoryServices.length === 0) return null;

                            return (
                                <div key={cat} style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <div style={{ padding: '16px 20px', background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Layers size={20} color="#2563eb" />
                                            {cat}
                                            <span style={{
                                                marginLeft: 'auto',
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                background: '#eff6ff',
                                                color: '#2563eb',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}>
                                                {categoryServices.length} service{categoryServices.length !== 1 ? 's' : ''}
                                            </span>
                                        </h2>
                                    </div>
                                    <div style={{ padding: '0' }}>
                                        <DataGrid
                                            data={categoryServices}
                                            columns={columns}
                                            actions={[ActionButtons]}
                                            tableName={`Services_${cat.replace(/\s+/g, '_')}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Show single category
                    <DataGrid
                        data={filteredServices}
                        columns={columns}
                        actions={[ActionButtons]}
                        tableName="Services_Catalog"
                    />
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingService ? 'Edit Service' : 'New Service'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Service Name</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="form-control" />
                            </div>
                            <div className="form-group">
                                <label>Category</label>
                                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="form-control">
                                    {categories.slice(1).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label>Price ($)</label>
                                    <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="form-control" />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="form-control">
                                        <option value="per visit">Per Visit</option>
                                        <option value="per hour">Per Hour</option>
                                        <option value="flat rate">Flat Rate</option>
                                        <option value="sqft">Per Sq. Ft.</option>
                                        <option value="per yard">Per Yard</option>
                                        <option value="per bag">Per Bag</option>
                                        <option value="per application">Per Application</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-control" />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Service</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBulkModal && (
                <BulkServiceModal
                    onClose={() => setShowBulkModal(false)}
                    onConfirm={handleBulkImport}
                    category={bulkCategory}
                />
            )}

            {showCategoryManager && (
                <CategoryManagerModal
                    onClose={() => setShowCategoryManager(false)}
                    categories={categories}
                    onSave={setCategories}
                />
            )}

            {showCSVModal && (
                <CSVImportModal
                    onClose={() => setShowCSVModal(false)}
                    onConfirm={handleBulkImport}
                    categories={categories}
                />
            )}
        </div>
    );
}

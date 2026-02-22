import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Search, Plus, Edit, Trash2, AlertTriangle,
    DollarSign, Archive, BarChart
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.jpeg';
import DataGrid from '../components/DataGrid';
import SearchBar from '../components/SearchBar';
import PageHeader from '../components/ui/PageHeader';

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        sku: '',
        stock: 0,
        minStock: 5,
        unit: 'item'
    });

    // View Settings State
    const [viewMode, setViewMode] = useState(localStorage.getItem('productsViewMode') || 'table');
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleViewChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('productsViewMode', mode);
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Failed to fetch products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            description: product.description,
            price: product.unitPrice || product.price, // Map backend unitPrice to frontend price
            sku: product.sku || '',
            stock: product.stock,
            minStock: product.minStock || 5,
            unit: product.unit || 'item'
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch (error) {
            console.error('Failed to delete product', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                unitPrice: formData.price // Map frontend price to backend unitPrice
            };

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, payload);
            } else {
                await api.post('/products', payload);
            }
            setShowModal(false);
            setEditingProduct(null);
            setFormData({ name: '', description: '', price: '', sku: '', stock: 0, minStock: 5, unit: 'item' });
            fetchProducts();
        } catch (error) {
            console.error('Failed to save product', error);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard animate-fadeIn">
            <PageHeader
                title="Inventory & Products"
                subtitle="Manage your stocked items and pricing"
                icon={Box}
                actions={
                    <button
                        className="btn-modern btn-modern-primary"
                        onClick={() => {
                            setEditingProduct(null);
                            setFormData({ name: '', description: '', price: '', sku: '', stock: 0, minStock: 5, unit: 'item' });
                            setShowModal(true);
                        }}
                    >
                        <Plus size={18} /> Add Product
                    </button>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search products by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-modern"
                                style={{ paddingLeft: '40px', width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* View Toggle Settings */}
                    <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)' }}>
                        {[
                            { id: 'grid', icon: Box, label: 'Grid' },
                            { id: 'table', icon: BarChart, label: 'Table' }
                        ].map(view => (
                            <button
                                key={view.id}
                                onClick={() => handleViewChange(view.id)}
                                style={{
                                    background: viewMode === view.id ? 'var(--bg-primary)' : 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: viewMode === view.id ? 'var(--shadow-sm)' : 'none',
                                    cursor: 'pointer',
                                    color: viewMode === view.id ? 'var(--primary-600)' : 'var(--text-tertiary)',
                                    fontSize: '13px',
                                    fontWeight: viewMode === view.id ? '700' : '500',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <view.icon size={16} />
                                {view.label}
                            </button>
                        ))}
                    </div>
                </div>
            </PageHeader>

            <div className="container" style={{ paddingTop: 0, marginTop: '24px', maxWidth: '100%', paddingLeft: '40px', paddingRight: '40px' }}>

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="modern-card animate-fadeIn" style={{ textAlign: 'center', padding: '100px 48px', background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
                        <div style={{ padding: '24px', background: 'var(--primary-50)', borderRadius: '50%', display: 'inline-flex', marginBottom: '24px' }}>
                            <Box size={48} color="var(--primary-600)" />
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>No Inventory Records</h2>
                        <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px', fontSize: '16px', fontWeight: '600', maxWidth: '480px', margin: '0 auto 32px auto' }}>Add products to begin tracking your stocked items and pricing orchestration.</p>
                        <button className="btn-modern btn-modern-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} /> Initialize Inventory
                        </button>
                    </div>
                ) : (
                    <>
                        {viewMode === 'grid' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                                {filteredProducts.map(product => {
                                    const stockCount = product.stock !== undefined ? product.stock : (product.quantity || 0);
                                    const minStock = product.minStock || 5;
                                    const isLowStock = stockCount <= minStock;
                                    const displayPrice = product.unitPrice !== undefined ? product.unitPrice : (product.price || 0);
                                    const displayUnit = product.unit || 'item';

                                    return (
                                        <div key={product.id} className="modern-card">
                                            <div style={{ padding: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                    <div>
                                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>{product.name}</h3>
                                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-tertiary)' }}>{product.sku || 'No SKU'}</p>
                                                    </div>
                                                    <div style={{
                                                        padding: '4px 10px',
                                                        borderRadius: 'var(--radius-full)',
                                                        background: isLowStock ? 'var(--error-50)' : 'var(--success-50)',
                                                        color: isLowStock ? 'var(--error-700)' : 'var(--success-700)',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        {isLowStock && <AlertTriangle size={14} />}
                                                        {stockCount} in stock
                                                    </div>
                                                </div>

                                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', minHeight: '40px' }}>
                                                    {product.description || 'No description available for this item.'}
                                                </p>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                                    <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-700)' }}>
                                                        ${Number(displayPrice).toFixed(2)}
                                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600' }}>/{displayUnit}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleEdit(product)}>
                                                            <Edit size={16} />
                                                        </button>
                                                        <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(product.id)}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {viewMode === 'table' && (
                            <div className="modern-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="modern-table">
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft: '32px' }}>Product Identifier</th>
                                            <th>Specifications</th>
                                            <th>SKU / Serial</th>
                                            <th style={{ textAlign: 'right' }}>Unit Pricing</th>
                                            <th style={{ textAlign: 'center' }}>Stock Status</th>
                                            <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredProducts.map(product => {
                                            const stockCount = product.stock !== undefined ? product.stock : (product.quantity || 0);
                                            const minStock = product.minStock || 5;
                                            const isLowStock = stockCount <= minStock;
                                            const displayPrice = product.unitPrice !== undefined ? product.unitPrice : (product.price || 0);
                                            const displayUnit = product.unit || 'item';

                                            return (
                                                <tr key={product.id}>
                                                    <td style={{ paddingLeft: '32px' }}>
                                                        <div style={{ fontWeight: '900', color: 'var(--primary-600)', fontSize: '15px' }}>{product.name}</div>
                                                        {product.description && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '600', marginTop: '2px' }}>{product.description}</div>}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            {product.category ? (
                                                                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{product.category}</div>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>—</span>
                                                            )}
                                                            {product.type && <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)' }}>{product.type} • {product.variantName || 'Standard'}</div>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <code style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-700)', background: 'var(--primary-50)', padding: '2px 8px', borderRadius: '4px' }}>
                                                            {product.sku || 'N/A'}
                                                        </code>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--text-primary)', fontSize: '15px' }}>
                                                        ${Number(displayPrice).toFixed(2)}
                                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginLeft: '4px', fontWeight: '600' }}>/ {displayUnit}</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', background: isLowStock ? 'var(--error-50)' : 'var(--success-50)' }}>
                                                            {isLowStock && <AlertTriangle size={14} color="var(--error-600)" />}
                                                            <span style={{ color: isLowStock ? 'var(--error-700)' : 'var(--success-700)', fontWeight: '900', fontSize: '14px' }}>
                                                                {stockCount}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleEdit(product)} title="Edit Configuration"><Edit size={16} /></button>
                                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(product.id)} title="Remove Product"><Trash2 size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>{editingProduct ? 'Edit Product' : 'New Product'}</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Product Name</label>
                                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="form-control" />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>SKU</label>
                                        <input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="form-control" />
                                    </div>
                                    <div className="form-group">
                                        <label>Unit</label>
                                        <input type="text" placeholder="e.g. bag, item, lb" required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="form-control" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label>Price ($)</label>
                                        <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="form-control" />
                                    </div>
                                    <div className="form-group">
                                        <label>Current Stock</label>
                                        <input type="number" required value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="form-control" />
                                    </div>
                                    <div className="form-group">
                                        <label>Low Stock Alert</label>
                                        <input type="number" required value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: e.target.value })} className="form-control" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-control" />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Product</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

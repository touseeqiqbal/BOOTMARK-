import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Search, Plus, Edit, Trash2, AlertTriangle,
    DollarSign, Archive, BarChart
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import DataGrid from '../components/DataGrid';

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
    const navigate = useNavigate();

    useEffect(() => {
        fetchProducts();
    }, []);

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
            price: product.price,
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
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, formData);
            } else {
                await api.post('/products', formData);
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

    const columns = [
        {
            key: 'name',
            label: 'Product Name',
            render: (item) => (
                <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>{item.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.description}</div>
                </div>
            )
        },
        { key: 'category', label: 'Category' },
        { key: 'sku', label: 'SKU' },
        {
            key: 'price',
            label: 'Price',
            render: (item) => <span style={{ fontFamily: 'monospace' }}>${item.price} / {item.unit}</span>
        },
        {
            key: 'stock',
            label: 'Stock',
            render: (item) => {
                const isLow = item.stock <= (item.minStock || 5);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isLow && <AlertTriangle size={14} color="#ef4444" />}
                        <span style={{ color: isLow ? '#ef4444' : '#10b981', fontWeight: '500' }}>
                            {item.stock}
                        </span>
                    </div>
                );
            }
        },
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
                                <h1 className="brand-title">Inventory & Products</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setEditingProduct(null);
                                    setFormData({ name: '', description: '', price: '', sku: '', stock: 0, minStock: 5, unit: 'item' });
                                    setShowModal(true);
                                }}
                            >
                                <Plus size={18} /> Add Product
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                <div style={{ marginBottom: '24px', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search products by name or SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="form-control"
                        style={{ width: '100%', paddingLeft: '40px' }}
                    />
                </div>

                {loading ? (
                    <div className="loading">Loading inventory...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="empty-state" style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <Box size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No products found</h3>
                        <p style={{ color: '#6b7280' }}>Add products to track your inventory.</p>
                    </div>
                ) : (
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Details</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>SKU</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Stock</th>
                                <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                const isLowStock = product.stock <= (product.minStock || 5);
                                return (
                                    <tr key={product.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ fontWeight: '500' }}>{product.name}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{product.description}</div>
                                        </td>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#4b5563' }}>
                                            {product.category && <div style={{ marginBottom: '2px' }}><span style={{ color: '#9ca3af' }}>Cat:</span> {product.category}</div>}
                                            {product.type && <div style={{ marginBottom: '2px' }}><span style={{ color: '#9ca3af' }}>Type:</span> {product.type}</div>}
                                            {product.variantName && <div><span style={{ color: '#9ca3af' }}>Var:</span> {product.variantName}</div>}
                                        </td>
                                        <td style={{ padding: '12px', fontFamily: 'monospace' }}>{product.sku || '-'}</td>
                                        <td style={{ padding: '12px' }}>${product.price} / {product.unit}</td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {isLowStock && <AlertTriangle size={14} color="#ef4444" />}
                                                <span style={{ color: isLowStock ? '#ef4444' : '#10b981', fontWeight: '500' }}>
                                                    {product.stock}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <button className="btn btn-icon" onClick={() => handleEdit(product)}><Edit size={16} /></button>
                                            <button className="btn btn-icon" onClick={() => handleDelete(product.id)}><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

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
    );
}

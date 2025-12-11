import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Plus, Edit, Trash2, AlertTriangle,
    DollarSign, TrendingUp, TrendingDown, Square, CheckSquare, Box, Download, Upload
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import { exportToExcel, formatMaterialsForExcel } from '../utils/excelExport';

export default function Materials() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [selectedMaterials, setSelectedMaterials] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category: 'General',
        description: '',
        unit: 'unit',
        costPrice: '',
        sellingPrice: '',
        quantityInStock: '',
        minStockLevel: '',
        supplier: '',
        location: '',
        notes: ''
    });
    const navigate = useNavigate();

    const categories = ['General', 'Plumbing', 'Electrical', 'HVAC', 'Paint', 'Hardware', 'Tools', 'Lumber', 'Other'];
    const units = ['unit', 'box', 'gallon', 'lb', 'kg', 'ft', 'meter', 'roll', 'bag'];

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            const response = await api.get('/materials');
            setMaterials(response.data);
        } catch (error) {
            console.error('Failed to fetch materials:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedMaterials.size === filteredMaterials.length) {
            setSelectedMaterials(new Set());
            setShowBulkActions(false);
        } else {
            setSelectedMaterials(new Set(filteredMaterials.map(m => m.id)));
            setShowBulkActions(true);
        }
    };

    const handleToggleSelect = (materialId) => {
        setSelectedMaterials(prev => {
            const next = new Set(prev);
            if (next.has(materialId)) {
                next.delete(materialId);
            } else {
                next.add(materialId);
            }
            setShowBulkActions(next.size > 0);
            return next;
        });
    };

    const handleBulkDelete = async () => {
        if (selectedMaterials.size === 0) return;
        const count = selectedMaterials.size;
        if (!confirm(`Are you sure you want to delete ${count} material${count === 1 ? '' : 's'}?`)) return;

        try {
            await Promise.all(Array.from(selectedMaterials).map(id => api.delete(`/materials/${id}`)));
            setSelectedMaterials(new Set());
            setShowBulkActions(false);
            fetchMaterials();
            alert(`Successfully deleted ${count} material${count === 1 ? '' : 's'}`);
        } catch (error) {
            console.error('Failed to delete materials:', error);
            alert('Failed to delete some materials');
        }
    };

    const handleCreate = () => {
        setEditingMaterial(null);
        setFormData({
            name: '',
            sku: '',
            category: 'General',
            description: '',
            unit: 'unit',
            costPrice: '',
            sellingPrice: '',
            quantityInStock: '',
            minStockLevel: '',
            supplier: '',
            location: '',
            notes: ''
        });
        setShowModal(true);
    };

    const handleEdit = (material) => {
        setEditingMaterial(material);
        setFormData({
            name: material.name || '',
            sku: material.sku || '',
            category: material.category || 'General',
            description: material.description || '',
            unit: material.unit || 'unit',
            costPrice: material.costPrice || '',
            sellingPrice: material.sellingPrice || '',
            quantityInStock: material.quantityInStock || '',
            minStockLevel: material.minStockLevel || '',
            supplier: material.supplier || '',
            location: material.location || '',
            notes: material.notes || ''
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingMaterial) {
                await api.put(`/materials/${editingMaterial.id}`, formData);
            } else {
                await api.post('/materials', formData);
            }
            setShowModal(false);
            fetchMaterials();
        } catch (error) {
            console.error('Failed to save material:', error);
            alert('Failed to save material');
        }
    };

    const handleDelete = async (materialId) => {
        if (!confirm('Are you sure you want to delete this material?')) return;

        try {
            await api.delete(`/materials/${materialId}`);
            setSelectedMaterials(prev => {
                const next = new Set(prev);
                next.delete(materialId);
                return next;
            });
            fetchMaterials();
        } catch (error) {
            console.error('Failed to delete material:', error);
            alert('Failed to delete material');
        }
    };

    const handleExportCSV = () => {
        const csvContent = [
            ['Name', 'SKU', 'Category', 'Description', 'Unit', 'Cost Price', 'Selling Price', 'Quantity in Stock', 'Min Stock Level', 'Supplier', 'Location', 'Notes'].join(','),
            ...materials.map(m => [
                `"${m.name || ''}"`,
                `"${m.sku || ''}"`,
                `"${m.category || ''}"`,
                `"${m.description || ''}"`,
                `"${m.unit || ''}"`,
                m.costPrice || 0,
                m.sellingPrice || 0,
                m.quantityInStock || 0,
                m.minStockLevel || 0,
                `"${m.supplier || ''}"`,
                `"${m.location || ''}"`,
                `"${m.notes || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `materials-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleBulkExport = () => {
        if (selectedMaterials.size === 0) return;

        const selected = materials.filter(m => selectedMaterials.has(m.id));
        const csvContent = [
            ['Name', 'SKU', 'Category', 'Description', 'Unit', 'Cost Price', 'Selling Price', 'Quantity in Stock', 'Min Stock Level', 'Supplier', 'Location', 'Notes'].join(','),
            ...selected.map(m => [
                `"${m.name || ''}"`,
                `"${m.sku || ''}"`,
                `"${m.category || ''}"`,
                `"${m.description || ''}"`,
                `"${m.unit || ''}"`,
                m.costPrice || 0,
                m.sellingPrice || 0,
                m.quantityInStock || 0,
                m.minStockLevel || 0,
                `"${m.supplier || ''}"`,
                `"${m.location || ''}"`,
                `"${m.notes || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `materials-selected-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Skip header row
            const dataRows = lines.slice(1);
            let imported = 0;
            let errors = 0;

            for (const row of dataRows) {
                try {
                    const values = row.split(',').map(v => v.replace(/"/g, '').trim());
                    const materialData = {
                        name: values[0] || '',
                        sku: values[1] || '',
                        category: values[2] || 'General',
                        description: values[3] || '',
                        unit: values[4] || 'unit',
                        costPrice: parseFloat(values[5]) || 0,
                        sellingPrice: parseFloat(values[6]) || 0,
                        quantityInStock: parseInt(values[7]) || 0,
                        minStockLevel: parseInt(values[8]) || 0,
                        supplier: values[9] || '',
                        location: values[10] || '',
                        notes: values[11] || ''
                    };

                    if (!materialData.name) {
                        errors++;
                        continue;
                    }

                    await api.post('/materials', materialData);
                    imported++;
                } catch (err) {
                    console.error('Error importing row:', err);
                    errors++;
                }
            }

            alert(`Import complete: ${imported} imported, ${errors} errors`);
            fetchMaterials();
        } catch (error) {
            console.error('Failed to import materials:', error);
            alert('Failed to import materials. Please check the file format.');
        }

        event.target.value = '';
    };

    const handleExportExcel = () => {
        const formattedData = formatMaterialsForExcel(materials);
        exportToExcel(formattedData, `materials-${new Date().toISOString().split('T')[0]}`, 'Materials');
    };


    const filteredMaterials = materials.filter(material => {
        const matchesSearch =
            material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || material.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const lowStockMaterials = materials.filter(m => m.quantityInStock <= m.minStockLevel);
    const totalValue = materials.reduce((sum, m) => sum + (m.quantityInStock * m.costPrice), 0);

    if (loading) return <div className="loading">Loading materials...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Materials & Inventory</h1>
                            </div>
                        </div>
                        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                                <Upload size={18} />
                                Import CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImport}
                                    style={{ display: 'none' }}
                                />
                            </label>
                            <button className="btn btn-secondary" onClick={handleExportCSV}>
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button className="btn btn-secondary" onClick={handleExportExcel}>
                                <Download size={18} />
                                Export Excel
                            </button>
                            <button className="btn btn-primary" onClick={handleCreate}>
                                <Plus size={18} /> Add Material
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                {/* Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Total Materials</p>
                                <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{materials.length}</h2>
                            </div>
                            <Package size={40} color="#3b82f6" style={{ opacity: 0.2 }} />
                        </div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Inventory Value</p>
                                <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>${totalValue.toFixed(2)}</h2>
                            </div>
                            <DollarSign size={40} color="#10b981" style={{ opacity: 0.2 }} />
                        </div>
                    </div>
                    <div className="card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                                <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px 0' }}>Low Stock Items</p>
                                <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: lowStockMaterials.length > 0 ? '#ef4444' : '#10b981' }}>
                                    {lowStockMaterials.length}
                                </h2>
                            </div>
                            <AlertTriangle size={40} color={lowStockMaterials.length > 0 ? '#ef4444' : '#10b981'} style={{ opacity: 0.2 }} />
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {showBulkActions && selectedMaterials.size > 0 && (
                    <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: '500' }}>
                            {selectedMaterials.size} material{selectedMaterials.size === 1 ? '' : 's'} selected
                        </span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary btn-sm" onClick={handleBulkExport}>
                                <Download size={16} />
                                Export Selected
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                setSelectedMaterials(new Set());
                                setShowBulkActions(false);
                            }}>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search materials by name, SKU, or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="form-control"
                            style={{ paddingLeft: '40px' }}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="form-control"
                        style={{ minWidth: '150px' }}
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* Select All Button */}
                {filteredMaterials.length > 0 && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-link btn-sm"
                            onClick={handleSelectAll}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                        >
                            {selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0 ? (
                                <CheckSquare size={18} />
                            ) : (
                                <Square size={18} />
                            )}
                            {selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                )}

                {/* Materials Grid */}
                {filteredMaterials.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        <Box size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                        <h3>No materials found</h3>
                        <p style={{ color: '#6b7280' }}>Add materials to track your inventory.</p>
                        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={handleCreate}>
                            Add First Material
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {filteredMaterials.map(material => {
                            const isSelected = selectedMaterials.has(material.id);
                            const isLowStock = material.quantityInStock <= material.minStockLevel;
                            const profitMargin = material.sellingPrice > 0 ? ((material.sellingPrice - material.costPrice) / material.sellingPrice * 100).toFixed(1) : 0;

                            return (
                                <div key={material.id} className="card" style={{ position: 'relative', borderLeft: isLowStock ? '4px solid #ef4444' : '4px solid #10b981' }}>
                                    {/* Checkbox */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        zIndex: 10
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleSelect(material.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        zIndex: 10,
                                        display: 'flex',
                                        gap: '8px'
                                    }}>
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => handleEdit(material)}
                                            title="Edit"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => handleDelete(material.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div style={{ paddingLeft: '32px', paddingRight: '32px' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>{material.name}</h3>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{
                                                    fontSize: '12px',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    background: '#f3f4f6',
                                                    color: '#6b7280'
                                                }}>
                                                    {material.category}
                                                </span>
                                                {material.sku && (
                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>SKU: {material.sku}</span>
                                                )}
                                            </div>
                                        </div>

                                        {material.description && (
                                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 12px 0' }}>
                                                {material.description}
                                            </p>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>In Stock</p>
                                                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: isLowStock ? '#ef4444' : '#111827' }}>
                                                    {material.quantityInStock} {material.unit}
                                                </p>
                                                {isLowStock && (
                                                    <p style={{ fontSize: '11px', color: '#ef4444', margin: '4px 0 0 0' }}>
                                                        Low stock! Min: {material.minStockLevel}
                                                    </p>
                                                )}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px 0' }}>Selling Price</p>
                                                <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                                                    ${material.sellingPrice?.toFixed(2) || '0.00'}
                                                </p>
                                                <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0' }}>
                                                    Cost: ${material.costPrice?.toFixed(2) || '0.00'}
                                                </p>
                                            </div>
                                        </div>

                                        {material.supplier && (
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                                                <strong>Supplier:</strong> {material.supplier}
                                            </div>
                                        )}

                                        {material.location && (
                                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                                <strong>Location:</strong> {material.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2>{editingMaterial ? 'Edit Material' : 'Add Material'}</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Material Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="form-control"
                                    required
                                />
                            </div>

                            <div>
                                <label>SKU</label>
                                <input
                                    type="text"
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    className="form-control"
                                />
                            </div>

                            <div>
                                <label>Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="form-control"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="form-control"
                                    rows="2"
                                />
                            </div>

                            <div>
                                <label>Unit</label>
                                <select
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="form-control"
                                >
                                    {units.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label>Quantity in Stock</label>
                                <input
                                    type="number"
                                    value={formData.quantityInStock}
                                    onChange={(e) => setFormData({ ...formData, quantityInStock: e.target.value })}
                                    className="form-control"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label>Cost Price</label>
                                <input
                                    type="number"
                                    value={formData.costPrice}
                                    onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                                    className="form-control"
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label>Selling Price</label>
                                <input
                                    type="number"
                                    value={formData.sellingPrice}
                                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                                    className="form-control"
                                    step="0.01"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label>Min Stock Level</label>
                                <input
                                    type="number"
                                    value={formData.minStockLevel}
                                    onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                                    className="form-control"
                                    min="0"
                                />
                            </div>

                            <div>
                                <label>Supplier</label>
                                <input
                                    type="text"
                                    value={formData.supplier}
                                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                    className="form-control"
                                />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Storage Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="form-control"
                                    placeholder="e.g., Warehouse A, Shelf 3"
                                />
                            </div>

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="form-control"
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" onClick={handleSave}>
                                {editingMaterial ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

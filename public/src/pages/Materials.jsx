import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package, Search, Plus, Edit, Trash2, AlertTriangle,
    DollarSign, TrendingUp, TrendingDown, Square, CheckSquare, Box, Download, Upload, List
} from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.jpeg';
import { exportToExcel, formatMaterialsForExcel } from '../utils/excelExport';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/FilterTabs';

export default function Materials() {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);
    const [selectedMaterials, setSelectedMaterials] = useState(new Set());
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        categories: ['General'], // Changed to array for multi-category
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

    const categories = ['General', 'Plumbing', 'Electrical', 'HVAC', 'Paint', 'Hardware', 'Tools', 'Lumber', 'Flooring', 'Roofing', 'Concrete', 'Drywall', 'Insulation', 'Windows & Doors', 'Landscaping', 'Safety Equipment', 'Other'];
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
            categories: ['General'], // Multi-category default
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
            categories: material.categories || (material.category ? [material.category] : ['General']), // Support both old and new format
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
            // Validation
            if (!formData.name || !formData.name.trim()) {
                alert('Material name is required');
                return;
            }

            if (!formData.categories || formData.categories.length === 0) {
                alert('Please select at least one category');
                return;
            }

            // Prepare data with proper number conversion
            const dataToSave = {
                ...formData,
                costPrice: parseFloat(formData.costPrice) || 0,
                sellingPrice: parseFloat(formData.sellingPrice) || 0,
                quantityInStock: parseInt(formData.quantityInStock) || 0,
                minStockLevel: parseInt(formData.minStockLevel) || 0
            };

            if (editingMaterial) {
                await api.put(`/materials/${editingMaterial.id}`, dataToSave);
                alert('Material updated successfully!');
            } else {
                await api.post('/materials', dataToSave);
                alert('Material created successfully!');
            }
            setShowModal(false);
            fetchMaterials();
        } catch (error) {
            console.error('Failed to save material:', error);
            alert(`Failed to save material: ${error.response?.data?.error || error.message}`);
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

        // Support both old single category and new multi-category
        const materialCategories = material.categories || (material.category ? [material.category] : []);
        const matchesCategory = categoryFilter === 'all' || materialCategories.includes(categoryFilter);

        // Apply stock filter
        let matchesStockFilter = true;
        if (activeFilter === 'in-stock') {
            matchesStockFilter = material.quantityInStock > material.minStockLevel;
        } else if (activeFilter === 'low-stock') {
            matchesStockFilter = material.quantityInStock > 0 && material.quantityInStock <= material.minStockLevel;
        } else if (activeFilter === 'out-of-stock') {
            matchesStockFilter = material.quantityInStock === 0;
        }

        return matchesSearch && matchesCategory && matchesStockFilter;
    });

    const lowStockMaterials = materials.filter(m => m.quantityInStock <= m.minStockLevel);
    const totalValue = materials.reduce((sum, m) => sum + (m.quantityInStock * m.costPrice), 0);

    const [viewMode, setViewMode] = useState(localStorage.getItem('materialsViewMode') || 'grid');

    const handleViewChange = (newView) => {
        setViewMode(newView);
        localStorage.setItem('materialsViewMode', newView);
    };

    // Define filter tabs
    const filterTabs = [
        { id: 'all', label: 'All Materials', count: materials.length },
        { id: 'in-stock', label: 'In Stock', count: materials.filter(m => m.quantityInStock > m.minStockLevel).length },
        { id: 'low-stock', label: 'Low Stock', count: materials.filter(m => m.quantityInStock > 0 && m.quantityInStock <= m.minStockLevel).length },
        { id: 'out-of-stock', label: 'Out of Stock', count: materials.filter(m => m.quantityInStock === 0).length }
    ];

    if (loading) return (
        <div className="dashboard">
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
                    <p style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>Synchronizing Inventory Records...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard animate-fadeIn">
            <PageHeader
                title="Materials & Inventory"
                subtitle="Track resources, cost orchestration, and stocking thresholds"
                icon={Package}
                actions={
                    <>
                        <label className="btn-modern btn-modern-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                            <Upload size={18} /> Import CSV
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleImport}
                                style={{ display: 'none' }}
                            />
                        </label>
                        <button className="btn-modern btn-modern-secondary" onClick={handleExportExcel}>
                            <Download size={18} /> Excel Report
                        </button>
                        <button className="btn-modern btn-modern-primary" onClick={handleCreate}>
                            <Plus size={18} /> Initialize Material
                        </button>
                    </>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, minWidth: '300px' }}>
                        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                placeholder="Search inventory serials..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-modern"
                                style={{ paddingLeft: '40px' }}
                            />
                        </div>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="input-modern"
                            style={{ width: 'auto', minWidth: '180px' }}
                        >
                            <option value="all">Catalog: All Segments</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)' }}>
                        {[
                            { id: 'grid', icon: Box, label: 'Grid' },
                            { id: 'table', icon: List, label: 'Table' }
                        ].map(view => (
                            <button
                                key={view.id}
                                onClick={() => handleViewChange(view.id)}
                                style={{
                                    background: viewMode === view.id ? 'var(--bg-primary)' : 'transparent',
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    padding: '6px 10px',
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
                <FilterTabs
                    filters={filterTabs}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                />
            </PageHeader>

            <div className="container" style={{ paddingTop: 0, marginTop: '24px' }}>
                {/* Stats Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                    <div className="modern-card" style={{ padding: '20px', borderLeft: '4px solid var(--primary-500)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>TOTAL INVENTORY</p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>{materials.length} <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-tertiary)' }}>Records</span></h2>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={22} color="var(--primary-600)" />
                            </div>
                        </div>
                    </div>
                    <div className="modern-card" style={{ padding: '20px', borderLeft: '4px solid var(--success-500)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>ASSET VALUATION</p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarSign size={22} color="var(--success-600)" />
                            </div>
                        </div>
                    </div>
                    <div className="modern-card" style={{ padding: '20px', borderLeft: lowStockMaterials.length > 0 ? '4px solid var(--error-500)' : '4px solid var(--success-500)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>CRITICAL THRESHOLD</p>
                                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: lowStockMaterials.length > 0 ? 'var(--error-600)' : 'var(--success-600)' }}>
                                    {lowStockMaterials.length} <span style={{ fontSize: '14px', fontWeight: '600' }}>Items Low</span>
                                </h2>
                            </div>
                            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: lowStockMaterials.length > 0 ? 'var(--error-50)' : 'var(--success-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertTriangle size={22} color={lowStockMaterials.length > 0 ? 'var(--error-600)' : 'var(--success-600)'} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedMaterials.size > 0 && (
                    <div className="animate-slideIn" style={{
                        padding: '16px 24px',
                        background: 'var(--primary-600)',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: 'white',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontWeight: '900', fontSize: '14px' }}>
                                {selectedMaterials.size} SELECTED
                            </div>
                            <span style={{ fontWeight: '600' }}>Synchronized batch operations active</span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn-modern btn-modern-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} onClick={handleBulkExport}>
                                <Download size={16} /> EXPORT CSV
                            </button>
                            <button className="btn-modern btn-modern-danger" onClick={handleBulkDelete}>
                                <Trash2 size={16} /> DELETE BATCH
                            </button>
                            <button className="btn-modern btn-modern-secondary" style={{ color: 'white' }} onClick={() => setSelectedMaterials(new Set())}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                )}

                {viewMode === 'table' ? (
                    <div className="modern-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '48px', textAlign: 'center' }}>
                                        <label className="checkbox-custom">
                                            <input type="checkbox" checked={selectedMaterials.size === filteredMaterials.length && filteredMaterials.length > 0} onChange={handleSelectAll} />
                                            <span className="checkmark"></span>
                                        </label>
                                    </th>
                                    <th>Material Identifier</th>
                                    <th>Segment</th>
                                    <th style={{ textAlign: 'right' }}>Stock Level</th>
                                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                                    <th style={{ textAlign: 'right' }}>Selling Point</th>
                                    <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMaterials.map(material => {
                                    const isLowStock = material.quantityInStock <= material.minStockLevel;
                                    return (
                                        <tr key={material.id} className={selectedMaterials.has(material.id) ? 'selected' : ''}>
                                            <td style={{ textAlign: 'center' }}>
                                                <label className="checkbox-custom">
                                                    <input type="checkbox" checked={selectedMaterials.has(material.id)} onChange={() => handleToggleSelect(material.id)} />
                                                    <span className="checkmark"></span>
                                                </label>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '900', color: 'var(--primary-600)', fontSize: '15px' }}>{material.name}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginTop: '2px' }}>{material.sku || 'NO SKU RECORDED'}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {(material.categories || (material.category ? [material.category] : [])).slice(0, 2).map((cat, idx) => (
                                                        <span key={idx} className="badge" style={{ fontSize: '10px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{cat}</span>
                                                    ))}
                                                    {(material.categories || []).length > 2 && <span className="badge" style={{ fontSize: '10px' }}>+{(material.categories || []).length - 2}</span>}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: '12px', background: isLowStock ? 'var(--error-50)' : 'var(--success-50)' }}>
                                                    <span style={{ fontWeight: '900', color: isLowStock ? 'var(--error-700)' : 'var(--success-700)' }}>{material.quantityInStock}</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{material.unit}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: '700' }}>${(parseFloat(material.costPrice) || 0).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--primary-700)' }}>${(parseFloat(material.sellingPrice) || 0).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleEdit(material)}><Edit size={16} /></button>
                                                    <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(material.id)}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                        {filteredMaterials.map(material => {
                            const isSelected = selectedMaterials.has(material.id);
                            const isLowStock = material.quantityInStock <= material.minStockLevel;
                            return (
                                <div key={material.id} className="modern-card animate-fadeIn" style={{
                                    padding: '24px',
                                    position: 'relative',
                                    border: isSelected ? '2px solid var(--primary-500)' : '1px solid var(--border-color)',
                                    borderTop: isLowStock ? '4px solid var(--error-500)' : '4px solid var(--success-500)'
                                }}>
                                    <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
                                        <label className="checkbox-custom">
                                            <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(material.id)} />
                                            <span className="checkmark"></span>
                                        </label>
                                    </div>

                                    <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '6px' }} onClick={() => handleEdit(material)}><Edit size={14} /></button>
                                            <button className="btn-modern btn-modern-secondary" style={{ padding: '6px', color: 'var(--error-600)' }} onClick={() => handleDelete(material.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '20px' }}>
                                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{material.name}</h3>
                                        <div style={{ fontSize: '12px', color: 'var(--primary-600)', fontWeight: '900', marginTop: '4px' }}>SKU: {material.sku || 'PENDING SERIAL'}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                                        <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>STOCK STATE</p>
                                            <p style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: isLowStock ? 'var(--error-600)' : 'var(--text-primary)' }}>
                                                {material.quantityInStock} <span style={{ fontSize: '12px', fontWeight: '600' }}>{material.unit}</span>
                                            </p>
                                        </div>
                                        <div style={{ padding: '12px', background: 'var(--primary-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-100)' }}>
                                            <p style={{ color: 'var(--primary-700)', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}>MARKET PRICE</p>
                                            <p style={{ fontSize: '18px', fontWeight: '900', margin: 0, color: 'var(--primary-800)' }}>${(parseFloat(material.sellingPrice) || 0).toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                                        {(material.categories || (material.category ? [material.category] : [])).map((cat, idx) => (
                                            <span key={idx} className="badge" style={{ fontSize: '10px', fontWeight: '700' }}>{cat}</span>
                                        ))}
                                    </div>

                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: '700' }}>Supplier:</span>
                                            <span style={{ fontWeight: '900', color: 'var(--text-primary)' }}>{material.supplier || 'Unspecified'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: '700' }}>Warehouse:</span>
                                            <span style={{ fontWeight: '900', color: 'var(--text-primary)' }}>{material.location || 'Central Inventory'}</span>
                                        </div>
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

                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ marginBottom: '8px', display: 'block' }}>Categories *</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#f9fafb',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e7eb'
                                }}>
                                    {categories.map(cat => (
                                        <label key={cat} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            cursor: 'pointer',
                                            padding: '4px'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.categories.includes(cat)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({
                                                            ...formData,
                                                            categories: [...formData.categories, cat]
                                                        });
                                                    } else {
                                                        setFormData({
                                                            ...formData,
                                                            categories: formData.categories.filter(c => c !== cat)
                                                        });
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '14px' }}>{cat}</span>
                                        </label>
                                    ))}
                                </div>
                                <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
                                    Select one or more categories for this material
                                </p>
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

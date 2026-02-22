import { useState } from 'react';
import { X, Plus, Edit, Trash2 } from 'lucide-react';

export default function CategoryManagerModal({ onClose, categories, onSave }) {
    const [categoryList, setCategoryList] = useState(categories.filter(c => c !== 'All'));
    const [newCategory, setNewCategory] = useState('');
    const [editingIndex, setEditingIndex] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleAdd = () => {
        if (newCategory.trim() && !categoryList.includes(newCategory.trim())) {
            setCategoryList([...categoryList, newCategory.trim()]);
            setNewCategory('');
        }
    };

    const handleEdit = (index) => {
        setEditingIndex(index);
        setEditValue(categoryList[index]);
    };

    const handleSaveEdit = () => {
        if (editValue.trim() && !categoryList.includes(editValue.trim())) {
            const updated = [...categoryList];
            updated[editingIndex] = editValue.trim();
            setCategoryList(updated);
            setEditingIndex(null);
            setEditValue('');
        }
    };

    const handleDelete = (index, event) => {
        event.stopPropagation();
        if (window.confirm('Are you sure you want to delete this category?')) {
            setCategoryList(categoryList.filter((_, i) => i !== index));
        }
    };

    const handleSave = () => {
        onSave(['All', ...categoryList]);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'white', borderRadius: '12px', width: '90%', maxWidth: '600px',
                maxHeight: '80vh', display: 'flex', flexDirection: 'column'
            }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Manage Categories</h2>
                            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                                Add, edit, or remove service categories
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                    {/* Add New Category */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                            Add New Category
                        </label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleAdd()}
                                placeholder="Enter category name..."
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px'
                                }}
                            />
                            <button
                                onClick={handleAdd}
                                className="btn btn-primary"
                                disabled={!newCategory.trim()}
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>
                    </div>

                    {/* Category List */}
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>
                            Existing Categories ({categoryList.length})
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {categoryList.map((cat, index) => (
                                <div
                                    key={index}
                                    style={{
                                        padding: '12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'white'
                                    }}
                                >
                                    {editingIndex === index ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && handleSaveEdit()}
                                                style={{
                                                    flex: 1,
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #d1d5db',
                                                    fontSize: '14px'
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleSaveEdit}
                                                className="btn btn-sm btn-primary"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingIndex(null);
                                                    setEditValue('');
                                                }}
                                                className="btn btn-sm btn-secondary"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                                                {cat}
                                            </div>
                                            <button
                                                onClick={() => handleEdit(index)}
                                                style={{
                                                    padding: '6px 10px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(index, e)}
                                                style={{
                                                    padding: '6px 10px',
                                                    border: '1px solid #fca5a5',
                                                    borderRadius: '6px',
                                                    background: 'white',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSave} className="btn btn-primary">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

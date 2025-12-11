import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Search, Plus, Filter, User, ArrowRight, Trash2, Square, CheckSquare, Download } from 'lucide-react'
import api from '../utils/api'
import logo from '../assets/logo.svg'
import { exportToExcel, formatPropertiesForExcel } from '../utils/excelExport'

export default function Properties() {
    const [properties, setProperties] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProperties, setSelectedProperties] = useState(new Set())
    const [showBulkActions, setShowBulkActions] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        fetchProperties()
    }, [])

    const fetchProperties = async () => {
        try {
            const response = await api.get('/properties')
            setProperties(response.data)
        } catch (error) {
            console.error('Failed to fetch properties:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectAll = () => {
        if (selectedProperties.size === filteredProperties.length) {
            setSelectedProperties(new Set())
            setShowBulkActions(false)
        } else {
            setSelectedProperties(new Set(filteredProperties.map(p => p.id)))
            setShowBulkActions(true)
        }
    }

    const handleToggleSelect = (propertyId) => {
        setSelectedProperties(prev => {
            const next = new Set(prev)
            if (next.has(propertyId)) {
                next.delete(propertyId)
            } else {
                next.add(propertyId)
            }
            setShowBulkActions(next.size > 0)
            return next
        })
    }

    const handleBulkDelete = async () => {
        if (selectedProperties.size === 0) return
        const count = selectedProperties.size
        if (!confirm(`Are you sure you want to delete ${count} propert${count === 1 ? 'y' : 'ies'}?`)) return

        try {
            await Promise.all(Array.from(selectedProperties).map(id => api.delete(`/properties/${id}`)))
            setSelectedProperties(new Set())
            setShowBulkActions(false)
            fetchProperties()
            alert(`Successfully deleted ${count} propert${count === 1 ? 'y' : 'ies'}`)
        } catch (error) {
            console.error('Failed to delete properties:', error)
            alert('Failed to delete some properties')
        }
    }

    const handleDelete = async (propertyId, e) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to delete this property?')) return

        try {
            await api.delete(`/properties/${propertyId}`)
            setSelectedProperties(prev => {
                const next = new Set(prev)
                next.delete(propertyId)
                return next
            })
            fetchProperties()
        } catch (error) {
            console.error('Failed to delete property:', error)
            alert('Failed to delete property')
        }
    }

    const filteredProperties = properties.filter(p =>
        p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.zip?.includes(searchTerm)
    )

    if (loading) return <div className="loading">Loading properties...</div>

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Properties</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ margin: 0 }}>All Properties ({properties.length})</h2>
                        <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Manage all client properties and locations</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary" onClick={() => {
                            const formattedData = formatPropertiesForExcel(properties);
                            exportToExcel(formattedData, `properties-${new Date().toISOString().split('T')[0]}`, 'Properties');
                        }}>
                            <Download size={16} /> Export Excel
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/clients')}>
                            <Plus size={16} /> Add Property (via Client)
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {showBulkActions && selectedProperties.size > 0 && (
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
                            {selectedProperties.size} propert{selectedProperties.size === 1 ? 'y' : 'ies'} selected
                        </span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                                <Trash2 size={16} />
                                Delete Selected
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                setSelectedProperties(new Set())
                                setShowBulkActions(false)
                            }}>
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="search-bar-container" style={{ marginBottom: '24px', position: 'relative' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Search by address, city, or zip..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="search-input"
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                {/* Select All Button */}
                {filteredProperties.length > 0 && (
                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            className="btn btn-link btn-sm"
                            onClick={handleSelectAll}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                        >
                            {selectedProperties.size === filteredProperties.length && filteredProperties.length > 0 ? (
                                <CheckSquare size={18} />
                            ) : (
                                <Square size={18} />
                            )}
                            {selectedProperties.size === filteredProperties.length && filteredProperties.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                )}

                {/* Properties Grid */}
                <div className="properties-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {filteredProperties.length > 0 ? filteredProperties.map(property => {
                        const isSelected = selectedProperties.has(property.id)
                        return (
                            <div key={property.id} className="card" style={{
                                background: 'white',
                                padding: '20px',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                                onClick={() => navigate(`/clients/${property.customerId}`)}
                            >
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
                                        onChange={() => handleToggleSelect(property.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                </div>

                                {/* Delete Button */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    zIndex: 10
                                }}>
                                    <button
                                        className="btn btn-icon"
                                        onClick={(e) => handleDelete(property.id, e)}
                                        title="Delete"
                                        style={{ padding: '4px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingLeft: '32px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                                        color: '#4f46e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <MapPin size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>{property.address}</h3>
                                        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                            {property.city}, {property.state} {property.zip}
                                        </p>

                                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <User size={12} /> View Client
                                            </span>
                                            <ArrowRight size={14} color="#9ca3af" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px' }}>
                            <MapPin size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                            <h3>No Properties Found</h3>
                            <p style={{ color: '#6b7280' }}>{searchTerm ? 'Try adjusting your search terms.' : 'Properties added to clients will appear here.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/AuthContext'
import api from '../utils/api'
import { FileText, Plus, Edit, Trash2, Send, Download, Search, CheckCircle, XCircle, Clock, CheckSquare } from 'lucide-react'
import '../styles/Dashboard.css'

export default function Estimates() {
    const [estimates, setEstimates] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [estimateForm, setEstimateForm] = useState({
        customerId: '',
        items: [{ name: '', description: '', quantity: 1, price: 0 }],
        notes: '',
        validUntil: ''
    })
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [estRes, custRes] = await Promise.all([
                api.get('/estimates'),
                api.get('/customers')
            ])
            setEstimates(estRes.data)
            setCustomers(custRes.data)
        } catch (error) {
            console.error('Failed to fetch data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = () => {
        setEstimateForm({
            customerId: '',
            items: [{ name: '', description: '', quantity: 1, price: 0 }],
            notes: '',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        })
        setShowCreateModal(true)
    }

    const handleSave = async () => {
        try {
            await api.post('/estimates', estimateForm)
            setShowCreateModal(false)
            fetchData()
        } catch (error) {
            console.error('Failed to save estimate:', error)
        }
    }

    const handleConvertToInvoice = async (estimate) => {
        if (!confirm('Convert this estimate to an invoice?')) return
        try {
            // Create invoice from estimate data
            const invoiceData = {
                customerId: estimate.customerId,
                items: estimate.items,
                notes: estimate.notes,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                invoiceNumber: `INV-${Date.now()}`
            }
            await api.post('/invoices', invoiceData)
            // Optionally update estimate status to 'converted'
            await api.put(`/estimates/${estimate.id}`, { ...estimate, status: 'converted' })
            alert('Estimate converted to Invoice successfully!')
            fetchData()
            navigate('/invoices')
        } catch (error) {
            console.error('Failed to convert:', error)
        }
    }

    const filteredEstimates = estimates.filter(est => {
        const customer = customers.find(c => c.id === est.customerId)
        return (
            customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            est.status?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })

    // Basic form components rendering omitted for brevity - using simplified structure
    return (
        <div className="dashboard">
            <div className="container" style={{ paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2>Estimates</h2>
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={18} /> New Estimate
                    </button>
                </div>

                {showCreateModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>New Estimate</h3>
                            <div className="form-group">
                                <label>Customer</label>
                                <select
                                    className="input"
                                    value={estimateForm.customerId}
                                    onChange={e => setEstimateForm({ ...estimateForm, customerId: e.target.value })}
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            {/* Simplified Item Input for Demo */}
                            <div className="form-group">
                                <label>Item Description</label>
                                <input
                                    className="input"
                                    value={estimateForm.items[0].name}
                                    onChange={e => {
                                        const newItems = [...estimateForm.items]
                                        newItems[0].name = e.target.value
                                        setEstimateForm({ ...estimateForm, items: newItems })
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label>Price</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={estimateForm.items[0].price}
                                    onChange={e => {
                                        const newItems = [...estimateForm.items]
                                        newItems[0].price = parseFloat(e.target.value)
                                        setEstimateForm({ ...estimateForm, items: newItems })
                                    }}
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleSave}>Save Estimate</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="forms-grid">
                    {filteredEstimates.map(est => {
                        const customer = customers.find(c => c.id === est.customerId)
                        return (
                            <div key={est.id} className="form-card">
                                <h3>{customer?.name || 'Unknown'}</h3>
                                <p>Status: {est.status}</p>
                                <p>Total: ${(est.items || []).reduce((acc, item) => acc + (item.price * item.quantity), 0)}</p>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button className="btn btn-sm btn-secondary" onClick={() => handleConvertToInvoice(est)}>
                                        <CheckSquare size={16} /> Convert to Invoice
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

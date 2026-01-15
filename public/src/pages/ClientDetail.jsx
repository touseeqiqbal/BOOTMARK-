import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    User, MapPin, Phone, Mail, Calendar, FileText,
    Plus, Edit, Trash2, ArrowLeft, ClipboardList,
    CreditCard, Briefcase, CheckCircle, AlertCircle, DollarSign,
    MessageSquare, Bell
} from 'lucide-react'
import api from '../utils/api'
import { useAuth } from '../utils/AuthContext'
import logo from '../assets/logo.svg'

export default function ClientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [client, setClient] = useState(null)
    const [properties, setProperties] = useState([])
    const [schedules, setSchedules] = useState([])
    const [workOrders, setWorkOrders] = useState([])
    const [invoices, setInvoices] = useState([])
    const [serviceRequests, setServiceRequests] = useState([])
    const [messages, setMessages] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('overview')
    const [newMessage, setNewMessage] = useState('')
    const [sendingMessage, setSendingMessage] = useState(false)
    const [showPropertyModal, setShowPropertyModal] = useState(false)
    const [propertyForm, setPropertyForm] = useState({
        address: '',
        city: '',
        state: '',
        zip: '',
        notes: ''
    })

    useEffect(() => {
        fetchClientData()
    }, [id])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        setSendingMessage(true)
        try {
            await api.post('/clients/messages', {
                message: newMessage,
                fromClient: false,
                customerId: id
            })
            setNewMessage('')
            // Refresh messages
            const messagesRes = await api.get('/messages')
            const clientMessages = messagesRes.data.filter(m => m.customerId === id)
            setMessages(clientMessages || [])
        } catch (error) {
            console.error('Failed to send message:', error)
            alert('Failed to send message. Please try again.')
        } finally {
            setSendingMessage(false)
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('Are you sure you want to delete this message?')) return

        try {
            await api.delete(`/messages/${messageId}`)
            // Remove from local state
            setMessages(messages.filter(m => m.id !== messageId))
        } catch (error) {
            console.error('Failed to delete message:', error)
            alert('Failed to delete message. Please try again.')
        }
    }

    const fetchClientData = async () => {
        try {
            setLoading(true)
            // In a real scenario we would fetch client by ID. 
            // For now if API fails we might mock it or handle error
            const clientRes = await api.get(`/customers/${id}`).catch(err => ({ data: null }))

            // If client not found by ID, maybe it's in the list? 
            // The API endpoint /customers/:id should exist.

            if (clientRes.data) {
                setClient(clientRes.data)
            } else {
                // Fallback if individual fetch fails (legacy API structure?)
                // actually existing customers.js has router.get('/:id', ...) so it should work.
            }

            const propertiesRes = await api.get(`/properties?customerId=${id}`)
            setProperties(propertiesRes.data)

            const schedulesRes = await api.get('/scheduling')
            const clientSchedules = schedulesRes.data.filter(s => s.clientId === id)
            setSchedules(clientSchedules || [])

            const workOrdersRes = await api.get('/work-orders')
            const clientWorkOrders = workOrdersRes.data.filter(wo => wo.clientId === id || wo.customerId === id)
            setWorkOrders(clientWorkOrders || [])

            const invoicesRes = await api.get('/invoices')
            const clientInvoices = invoicesRes.data.filter(inv => inv.customerId === id)
            setInvoices(clientInvoices || [])

            // Fetch service requests
            try {
                const serviceRequestsRes = await api.get('/service-requests')
                const clientRequests = serviceRequestsRes.data.filter(sr => sr.customerId === id)
                setServiceRequests(clientRequests || [])
            } catch (err) {
                console.error('Error fetching service requests:', err)
                setServiceRequests([])
            }

            // Fetch messages
            try {
                const messagesRes = await api.get('/messages')
                console.log('📨 All messages fetched:', messagesRes.data)
                console.log('📨 Client ID:', id)
                const clientMessages = messagesRes.data.filter(m => {
                    console.log('📨 Checking message:', m.id, 'customerId:', m.customerId, 'matches:', m.customerId === id)
                    return m.customerId === id
                })
                console.log('📨 Filtered messages for client:', clientMessages)
                setMessages(clientMessages || [])
            } catch (err) {
                console.error('Error fetching messages:', err)
                setMessages([])
            }
        } catch (error) {
            console.error('Error fetching client details:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddProperty = async (e) => {
        e.preventDefault()
        try {
            await api.post('/properties', {
                ...propertyForm,
                customerId: id
            })
            setShowPropertyModal(false)
            fetchClientData() // Refresh data
            setPropertyForm({ address: '', city: '', state: '', zip: '', notes: '' })
        } catch (error) {
            console.error('Error creating property:', error)
            alert('Failed to create property')
        }
    }

    const handleDeleteProperty = async (propertyId) => {
        if (!confirm('Are you sure you want to remove this property?')) return
        try {
            await api.delete(`/properties/${propertyId}`)
            setProperties(properties.filter(p => p.id !== propertyId))
        } catch (error) {
            console.error('Error deleting property:', error)
            alert('Failed to delete property')
        }
    }

    if (loading) return <div className="loading">Loading client details...</div>

    if (!client) return (
        <div className="dashboard">
            <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
                <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
                <h2>Client Not Found</h2>
                <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={() => navigate('/clients')}>
                    Back to Clients
                </button>
            </div>
        </div>
    )

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Client Profile</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-secondary" onClick={() => navigate('/clients')}>
                                <ArrowLeft size={16} /> Back
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingBottom: '40px' }}>
                {/* Client Header Card */}
                <div className="client-header-card" style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                fontWeight: 'bold'
                            }}>
                                {client.name.charAt(0)}
                            </div>
                            <div>
                                <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 'bold' }}>{client.name}</h1>
                                <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '14px' }}>
                                    {client.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Mail size={16} /> {client.email}
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Phone size={16} /> {client.phone}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={16} /> {new Date(client.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-primary" onClick={() => navigate(`/customer/${client.id}/submissions`)}>
                                View Submissions
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="client-tabs" style={{
                    display: 'flex',
                    gap: '24px',
                    borderBottom: '1px solid #e5e7eb',
                    marginBottom: '24px'
                }}>
                    {['overview', 'properties', 'schedules', 'work-orders', 'invoices', 'service-requests', 'messages'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '12px 4px',
                                borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                                color: activeTab === tab ? '#6366f1' : '#6b7280',
                                fontWeight: activeTab === tab ? '600' : '400',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                fontSize: '16px'
                            }}
                        >
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <div className="overview-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                        <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                            <h3 style={{ marginTop: 0 }}>Client Notes</h3>
                            <p style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>{client.notes || 'No notes available.'}</p>
                        </div>
                        <div className="card" style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                            <h3 style={{ marginTop: 0 }}>Quick Stats</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ color: '#6b7280' }}>Properties</span>
                                    <strong>{properties.length}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                    <span style={{ color: '#6b7280' }}>Submissions</span>
                                    <strong>{client.submissionCount || 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'properties' && (
                    <div className="properties-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Properties ({properties.length})</h3>
                            <button className="btn btn-primary" onClick={() => setShowPropertyModal(true)}>
                                <Plus size={16} /> Add Property
                            </button>
                        </div>

                        <div className="properties-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {properties.length > 0 ? properties.map(property => (
                                <div key={property.id} className="property-card" style={{
                                    background: 'white',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    border: '1px solid #e5e7eb',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                                        <div style={{ padding: '10px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5' }}>
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0' }}>{property.address}</h4>
                                            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                                                {property.city}, {property.state} {property.zip}
                                            </p>
                                        </div>
                                    </div>
                                    {property.notes && (
                                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>{property.notes}</p>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                                        <button className="btn btn-icon" onClick={() => handleDeleteProperty(property.id)} title="Remove property">
                                            <Trash2 size={16} color="#ef4444" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <MapPin size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                    <h3>No Properties</h3>
                                    <p style={{ color: '#6b7280' }}>Add a property to this client to manage their locations.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'schedules' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Scheduled Jobs ({schedules.length})</h3>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/scheduling', {
                                    state: {
                                        fromClient: true,
                                        clientId: id,
                                        clientName: client?.name
                                    }
                                })}
                            >
                                <Plus size={16} /> Schedule Job
                            </button>
                        </div>

                        {schedules.length > 0 ? (
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {schedules.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(schedule => (
                                    <div
                                        key={schedule.id}
                                        onClick={() => navigate('/scheduling')}
                                        style={{
                                            padding: '16px',
                                            background: 'white',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            borderLeft: `4px solid ${schedule.status === 'completed' ? '#10b981' : schedule.status === 'in-progress' ? '#3b82f6' : '#6b7280'}`,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                                                    {schedule.title}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                    <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                                                    {new Date(schedule.scheduledDate).toLocaleDateString()} • {schedule.startTime} - {schedule.endTime}
                                                </div>
                                            </div>
                                            <div style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: schedule.status === 'completed' ? '#d1fae5' : schedule.status === 'in-progress' ? '#dbeafe' : '#f3f4f6',
                                                color: schedule.status === 'completed' ? '#065f46' : schedule.status === 'in-progress' ? '#1e40af' : '#374151',
                                                textTransform: 'capitalize'
                                            }}>
                                                {schedule.status}
                                            </div>
                                        </div>
                                        {schedule.propertyAddress && (
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
                                                <MapPin size={13} style={{ display: 'inline', marginRight: '6px' }} />
                                                {schedule.propertyAddress}
                                            </div>
                                        )}
                                        {schedule.crewNames && schedule.crewNames.length > 0 && (
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                Crew: {schedule.crewNames.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <Calendar size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                <h3>No Scheduled Jobs</h3>
                                <p style={{ color: '#6b7280' }}>Schedule jobs for this client to manage appointments and services.</p>
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: '16px' }}
                                    onClick={() => navigate('/scheduling', {
                                        state: {
                                            fromClient: true,
                                            clientId: id,
                                            clientName: client?.name
                                        }
                                    })}
                                >
                                    <Plus size={16} /> Schedule First Job
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'work-orders' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Work Orders ({workOrders.length})</h3>
                            <button className="btn btn-primary" onClick={() => navigate(`/work-orders/new?clientId=${id}`)}>
                                <Plus size={16} /> Create Work Order
                            </button>
                        </div>

                        {workOrders.length > 0 ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {workOrders.map(wo => (
                                    <div
                                        key={wo.id}
                                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                                        style={{
                                            padding: '20px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                                                    {wo.title || 'Untitled Work Order'}
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                                    {wo.workOrderNumber || `WO-${wo.id?.slice(0, 6)}`}
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: wo.status === 'completed' ? '#d1fae5' : wo.status === 'in-progress' ? '#dbeafe' : '#f3f4f6',
                                                color: wo.status === 'completed' ? '#065f46' : wo.status === 'in-progress' ? '#1e40af' : '#6b7280'
                                            }}>
                                                {wo.status || 'draft'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                                            {wo.scheduledDate && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                                    <Calendar size={14} />
                                                    <span>{new Date(wo.scheduledDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {wo.address && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                                    <MapPin size={14} />
                                                    <span>{wo.address}</span>
                                                </div>
                                            )}
                                            {wo.price && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                                    <DollarSign size={14} />
                                                    <span>${parseFloat(wo.price).toFixed(2)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                <h3>No Work Orders Yet</h3>
                                <p style={{ color: '#6b7280' }}>Create work orders for this client to track jobs and services.</p>
                                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate(`/work-orders/new?clientId=${id}`)}>Create Work Order</button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'invoices' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Invoices ({invoices.length})</h3>
                            <button className="btn btn-primary" onClick={() => navigate(`/invoices/new?clientId=${id}`)}>
                                <Plus size={16} /> Create Invoice
                            </button>
                        </div>

                        {invoices.length > 0 ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {invoices.map(invoice => (
                                    <div
                                        key={invoice.id}
                                        onClick={() => navigate(`/invoices`)}
                                        style={{
                                            padding: '20px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                                                    Invoice #{invoice.invoiceNumber}
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date(invoice.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: invoice.status === 'paid' ? '#d1fae5' : invoice.status === 'sent' ? '#dbeafe' : '#f3f4f6',
                                                color: invoice.status === 'paid' ? '#065f46' : invoice.status === 'sent' ? '#1e40af' : '#6b7280',
                                                textTransform: 'capitalize'
                                            }}>
                                                {invoice.status || 'draft'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                                <DollarSign size={14} />
                                                <span>${invoice.total?.toFixed(2) || '0.00'}</span>
                                            </div>
                                            {invoice.dueDate && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280' }}>
                                                    <Calendar size={14} />
                                                    <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {invoice.items && invoice.items.length > 0 && (
                                                <div style={{ color: '#6b7280' }}>
                                                    {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <CreditCard size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                <h3>No Invoices Yet</h3>
                                <p style={{ color: '#6b7280' }}>Create invoices for services rendered.</p>
                                <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate(`/invoices/new?clientId=${id}`)}>Create Invoice</button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'service-requests' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Service Requests ({serviceRequests.length})</h3>
                        </div>

                        {serviceRequests.length > 0 ? (
                            <div style={{ display: 'grid', gap: '16px' }}>
                                {serviceRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(request => (
                                    <div
                                        key={request.id}
                                        style={{
                                            padding: '20px',
                                            background: 'white',
                                            borderRadius: '12px',
                                            border: '1px solid #e5e7eb',
                                            borderLeft: `4px solid ${request.status === 'completed' ? '#10b981' : request.status === 'in-progress' ? '#3b82f6' : '#f59e0b'}`
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
                                                    {request.serviceType?.replace('-', ' ') || 'Service Request'}
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                                                    {new Date(request.createdAt).toLocaleDateString()} at {new Date(request.createdAt).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                background: request.status === 'completed' ? '#d1fae5' : request.status === 'in-progress' ? '#dbeafe' : '#fef3c7',
                                                color: request.status === 'completed' ? '#065f46' : request.status === 'in-progress' ? '#1e40af' : '#92400e',
                                                textTransform: 'capitalize'
                                            }}>
                                                {request.status || 'pending'}
                                            </span>
                                        </div>
                                        <div style={{ marginBottom: '12px' }}>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                                {request.description}
                                            </p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px', color: '#6b7280' }}>
                                            {request.preferredDate && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={14} />
                                                    <span>Preferred: {new Date(request.preferredDate).toLocaleDateString()}</span>
                                                </div>
                                            )}
                                            {request.priority && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Bell size={14} />
                                                    <span>Priority: {request.priority}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                <ClipboardList size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                <h3>No Service Requests</h3>
                                <p style={{ color: '#6b7280' }}>This client hasn't submitted any service requests yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'messages' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0 }}>Messages ({messages.length})</h3>
                        </div>

                        {/* Message Thread */}
                        <div style={{ marginBottom: '20px', maxHeight: '500px', overflowY: 'auto' }}>
                            {messages.length > 0 ? (
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map(msg => (
                                        <div
                                            key={msg.id}
                                            style={{
                                                padding: '16px',
                                                background: msg.fromClient ? '#eff6ff' : '#f0fdf4',
                                                borderRadius: '12px',
                                                border: '1px solid #e5e7eb',
                                                borderLeft: msg.fromClient ? '4px solid #3b82f6' : '4px solid #10b981',
                                                position: 'relative'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <MessageSquare size={16} color={msg.fromClient ? '#3b82f6' : '#10b981'} />
                                                    <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>
                                                        {msg.fromClient ? client.name : 'You (Business)'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                        {new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString()}
                                                    </span>
                                                    {!msg.fromClient && (
                                                        <button
                                                            onClick={() => handleDeleteMessage(msg.id)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: '#fee2e2',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                color: '#dc2626',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseOver={(e) => e.target.style.background = '#fecaca'}
                                                            onMouseOut={(e) => e.target.style.background = '#fee2e2'}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                                {msg.message}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                                    <MessageSquare size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                                    <h3>No Messages</h3>
                                    <p style={{ color: '#6b7280' }}>No messages have been exchanged with this client yet.</p>
                                </div>
                            )}
                        </div>

                        {/* Message Composer */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#374151' }}>Send Message to {client.name}</h4>
                            <form onSubmit={handleSendMessage}>
                                <textarea
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontFamily: 'inherit',
                                        resize: 'vertical',
                                        marginBottom: '12px'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sendingMessage || !newMessage.trim()}
                                    className="btn-modern btn-modern-primary"
                                    style={{ opacity: sendingMessage || !newMessage.trim() ? 0.5 : 1 }}
                                >
                                    {sendingMessage ? 'Sending...' : 'Send Message'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div >

            {/* Add Property Modal */}
            {
                showPropertyModal && (
                    <div className="modal-overlay" onClick={() => setShowPropertyModal(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2>Add New Property</h2>
                            <form onSubmit={handleAddProperty}>
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label>Address</label>
                                    <input
                                        type="text"
                                        required
                                        value={propertyForm.address}
                                        onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })}
                                        className="form-control"
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        placeholder="Street Address"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <label>City</label>
                                        <input
                                            type="text"
                                            value={propertyForm.city}
                                            onChange={e => setPropertyForm({ ...propertyForm, city: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label>State</label>
                                        <input
                                            type="text"
                                            value={propertyForm.state}
                                            onChange={e => setPropertyForm({ ...propertyForm, state: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                    <div>
                                        <label>Zip</label>
                                        <input
                                            type="text"
                                            value={propertyForm.zip}
                                            onChange={e => setPropertyForm({ ...propertyForm, zip: e.target.value })}
                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: '24px' }}>
                                    <label>Notes (Gate code, pets, etc.)</label>
                                    <textarea
                                        value={propertyForm.notes}
                                        onChange={e => setPropertyForm({ ...propertyForm, notes: e.target.value })}
                                        rows={3}
                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowPropertyModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Property</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    )
}

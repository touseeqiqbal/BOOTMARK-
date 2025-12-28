import { useState, useEffect } from 'react';
import { X, Calendar, Clock, Users, MapPin, User, Repeat } from 'lucide-react';
import api from '../utils/api';

export default function ScheduleModal({ isOpen, onClose, onSave, editingEvent = null, prefilledData = {} }) {
    const [formData, setFormData] = useState({
        workOrderId: '',
        clientId: '',
        clientName: '',
        propertyId: '',
        propertyAddress: '',
        title: '',
        description: '',
        serviceType: '',
        scheduledDate: '',
        startTime: '09:00',
        endTime: '17:00',
        estimatedDuration: 480,
        assignedCrew: [],
        crewNames: [],
        status: 'scheduled',
        isRecurring: false,
        recurrencePattern: {
            frequency: 'weekly',
            interval: 1,
            endDate: '',
            daysOfWeek: []
        }
    });

    const [workOrders, setWorkOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [properties, setProperties] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchData();

            // Prefill data if provided
            if (editingEvent) {
                setFormData({
                    ...editingEvent,
                    recurrencePattern: editingEvent.recurrencePattern || {
                        frequency: 'weekly',
                        interval: 1,
                        endDate: '',
                        daysOfWeek: []
                    }
                });
            } else if (prefilledData.scheduledDate) {
                setFormData(prev => ({
                    ...prev,
                    scheduledDate: prefilledData.scheduledDate
                }));
            }
        }
    }, [isOpen, editingEvent, prefilledData]);

    const fetchData = async () => {
        try {
            const [workOrdersRes, clientsRes, propertiesRes, employeesRes] = await Promise.all([
                api.get('/work-orders'),
                api.get('/customers'),
                api.get('/properties'),
                api.get('/employees')
            ]);

            setWorkOrders(workOrdersRes.data);
            setClients(clientsRes.data);
            setProperties(propertiesRes.data);
            setEmployees(employeesRes.data.filter(e => e.status === 'active'));
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleWorkOrderChange = (workOrderId) => {
        const workOrder = workOrders.find(wo => wo.id === workOrderId);
        if (workOrder) {
            setFormData(prev => ({
                ...prev,
                workOrderId,
                clientId: workOrder.clientId || '',
                clientName: workOrder.clientName || '',
                propertyId: workOrder.propertyId || '',
                propertyAddress: workOrder.address || '',
                title: workOrder.title || '',
                description: workOrder.description || ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                workOrderId: ''
            }));
        }
    };

    const handleClientChange = (clientId) => {
        const client = clients.find(c => c.id === clientId);
        setFormData(prev => ({
            ...prev,
            clientId,
            clientName: client ? client.name : '',
            propertyId: '',
            propertyAddress: ''
        }));
    };

    const handlePropertyChange = (propertyId) => {
        const property = properties.find(p => p.id === propertyId);
        setFormData(prev => ({
            ...prev,
            propertyId,
            propertyAddress: property ? `${property.address}, ${property.city}, ${property.state}` : ''
        }));
    };

    const handleCrewToggle = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        const isSelected = formData.assignedCrew.includes(employeeId);

        if (isSelected) {
            setFormData(prev => ({
                ...prev,
                assignedCrew: prev.assignedCrew.filter(id => id !== employeeId),
                crewNames: prev.crewNames.filter(name => name !== employee.name)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                assignedCrew: [...prev.assignedCrew, employeeId],
                crewNames: [...prev.crewNames, employee.name]
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingEvent) {
                await api.put(`/scheduling/${editingEvent.id}`, formData);
            } else {
                await api.post('/scheduling', formData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving schedule:', error);
            alert('Failed to save schedule');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const clientProperties = properties.filter(p => p.customerId === formData.clientId);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>{editingEvent ? 'Edit Schedule' : 'Schedule New Job'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Work Order Selection */}
                    <div className="form-group">
                        <label>Link to Work Order (Optional)</label>
                        <select
                            value={formData.workOrderId}
                            onChange={e => handleWorkOrderChange(e.target.value)}
                            className="form-control"
                        >
                            <option value="">-- Create New Job --</option>
                            {workOrders.map(wo => (
                                <option key={wo.id} value={wo.id}>
                                    {wo.title} - {wo.clientName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Job Title */}
                    <div className="form-group">
                        <label>Job Title *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="form-control"
                            placeholder="e.g., Lawn Maintenance"
                        />
                    </div>

                    {/* Client & Property */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label>Client *</label>
                            <select
                                required
                                value={formData.clientId}
                                onChange={e => handleClientChange(e.target.value)}
                                className="form-control"
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Property</label>
                            <select
                                value={formData.propertyId}
                                onChange={e => handlePropertyChange(e.target.value)}
                                className="form-control"
                                disabled={!formData.clientId}
                            >
                                <option value="">-- Select Property --</option>
                                {clientProperties.map(property => (
                                    <option key={property.id} value={property.id}>
                                        {property.address}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label>Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.scheduledDate}
                                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>Start Time *</label>
                            <input
                                type="time"
                                required
                                value={formData.startTime}
                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                className="form-control"
                            />
                        </div>

                        <div className="form-group">
                            <label>End Time *</label>
                            <input
                                type="time"
                                required
                                value={formData.endTime}
                                onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                className="form-control"
                            />
                        </div>
                    </div>

                    {/* Crew Assignment */}
                    <div className="form-group">
                        <label>Assign Crew</label>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                            {employees.length > 0 ? (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {employees.map(employee => (
                                        <label key={employee.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '6px', borderRadius: '4px', background: formData.assignedCrew.includes(employee.id) ? '#e0e7ff' : 'transparent' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.assignedCrew.includes(employee.id)}
                                                onChange={() => handleCrewToggle(employee.id)}
                                            />
                                            <span style={{ fontSize: '14px' }}>{employee.name}</span>
                                            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
                                                {employee.role}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ margin: 0, color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>
                                    No active employees. Add employees first.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="form-control"
                            rows={3}
                            placeholder="Job details, special instructions..."
                        />
                    </div>

                    {/* Recurring Options */}
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.isRecurring}
                                onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                            />
                            <Repeat size={16} />
                            <span>Recurring Job</span>
                        </label>
                    </div>

                    {formData.isRecurring && (
                        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>Recurrence Pattern</h4>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '13px' }}>Frequency</label>
                                    <select
                                        value={formData.recurrencePattern.frequency}
                                        onChange={e => setFormData({
                                            ...formData,
                                            recurrencePattern: { ...formData.recurrencePattern, frequency: e.target.value }
                                        })}
                                        className="form-control"
                                        style={{ fontSize: '13px' }}
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '13px' }}>Every</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.recurrencePattern.interval}
                                        onChange={e => setFormData({
                                            ...formData,
                                            recurrencePattern: { ...formData.recurrencePattern, interval: parseInt(e.target.value) || 1 }
                                        })}
                                        className="form-control"
                                        style={{ fontSize: '13px' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontSize: '13px' }}>End Date</label>
                                    <input
                                        type="date"
                                        value={formData.recurrencePattern.endDate}
                                        onChange={e => setFormData({
                                            ...formData,
                                            recurrencePattern: { ...formData.recurrencePattern, endDate: e.target.value }
                                        })}
                                        className="form-control"
                                        style={{ fontSize: '13px' }}
                                    />
                                </div>
                            </div>

                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                This will create multiple scheduled jobs based on the pattern above.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : editingEvent ? 'Update Schedule' : 'Create Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';

// Import business permissions for employee permission management
const EMPLOYEE_PERMISSIONS = [
    // Customer Management
    { value: 'customers.view', label: 'View Customers', category: 'Customers' },
    { value: 'customers.create', label: 'Create Customers', category: 'Customers' },
    { value: 'customers.edit', label: 'Edit Customers', category: 'Customers' },

    // Property Management
    { value: 'properties.view', label: 'View Properties', category: 'Properties' },
    { value: 'properties.create', label: 'Create Properties', category: 'Properties' },
    { value: 'properties.edit', label: 'Edit Properties', category: 'Properties' },

    // Work Order Management
    { value: 'workOrders.view', label: 'View Work Orders', category: 'Work Orders' },
    { value: 'workOrders.create', label: 'Create Work Orders', category: 'Work Orders' },
    { value: 'workOrders.edit', label: 'Edit Work Orders', category: 'Work Orders' },

    // Invoice Management
    { value: 'invoices.view', label: 'View Invoices', category: 'Invoices' },
    { value: 'invoices.create', label: 'Create Invoices', category: 'Invoices' },
    { value: 'invoices.send', label: 'Send Invoices', category: 'Invoices' },

    // Service & Product Management
    { value: 'services.view', label: 'View Services', category: 'Services' },
    { value: 'services.create', label: 'Create Services', category: 'Services' },
    { value: 'products.view', label: 'View Products', category: 'Products' },
    { value: 'products.create', label: 'Create Products', category: 'Products' },

    // Scheduling
    { value: 'scheduling.view', label: 'View Schedules', category: 'Scheduling' },
    { value: 'scheduling.create', label: 'Create Schedules', category: 'Scheduling' },
    { value: 'scheduling.edit', label: 'Edit Schedules', category: 'Scheduling' },

    // Reports
    { value: 'reports.view', label: 'View Reports', category: 'Reports' },
    { value: 'reports.export', label: 'Export Reports', category: 'Reports' },

    // Team Management
    { value: 'team.view', label: 'View Team Members', category: 'Team' },
];


export default function Employees() {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [credentials, setCredentials] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'crew',
        skills: [],
        permissions: [],
        status: 'active'
    });
    const [skillInput, setSkillInput] = useState('');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/employees');
            setEmployees(res.data);
        } catch (error) {
            console.error('Error fetching employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setEditingEmployee(employee);
            setFormData({
                name: employee.name,
                email: employee.email || '',
                phone: employee.phone || '',
                role: employee.role || 'crew',
                skills: employee.skills || [],
                permissions: employee.permissions || [],
                status: employee.status || 'active'
            });
        } else {
            setEditingEmployee(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                role: 'crew',
                skills: [],
                permissions: [],
                status: 'active'
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingEmployee(null);
        setSkillInput('');
    };

    const handleAddSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData(prev => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skill)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingEmployee) {
                await api.put(`/employees/${editingEmployee.id}`, formData);
            } else {
                await api.post('/employees', formData);
            }
            handleCloseModal();
            fetchEmployees();
        } catch (error) {
            console.error('Error saving employee:', error);
            alert('Failed to save employee');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this employee?')) return;
        try {
            await api.delete(`/employees/${id}`);
            fetchEmployees();
        } catch (error) {
            console.error('Error deleting employee:', error);
            alert('Failed to delete employee');
        }
    };

    const handleSendInvite = async (employeeId) => {
        if (!window.confirm('Send invite to this employee? This will create a login account for them.')) return;

        try {
            const res = await api.post(`/employees/${employeeId}/invite`);
            setCredentials(res.data.credentials);
            setShowCredentialsModal(true);
            fetchEmployees(); // Refresh to show updated status
        } catch (error) {
            console.error('Error sending invite:', error);
            const errorMsg = error.response?.data?.error || 'Failed to send invite';
            alert(errorMsg);
        }
    };


    const getLocationText = (employee) => {
        if (!employee.currentLocation) return 'No location data';
        const timestamp = new Date(employee.currentLocation.timestamp);
        const now = new Date();
        const diffMinutes = Math.floor((now - timestamp) / 1000 / 60);

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes} min ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return timestamp.toLocaleDateString();
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'manager': return '#8b5cf6';
            case 'supervisor': return '#3b82f6';
            case 'crew': return '#10b981';
            default: return '#6b7280';
        }
    };

    if (loading) return <div className="loading">Loading employees...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Employees & Crew</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                                <Plus size={16} /> Add Employee
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingBottom: '40px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>
                        Manage your team members and crew assignments
                    </p>
                </div>

                {/* Employee Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {employees.length > 0 ? employees.map(employee => (
                        <div key={employee.id} style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            position: 'relative'
                        }}>
                            {/* Status Badge */}
                            <div style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                background: employee.status === 'active' ? '#d1fae5' : '#fee2e2',
                                color: employee.status === 'active' ? '#065f46' : '#991b1b'
                            }}>
                                {employee.status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                            </div>

                            {/* Employee Info */}
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '20px',
                                        fontWeight: 'bold'
                                    }}>
                                        {employee.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
                                            {employee.name}
                                        </h3>
                                        <div style={{
                                            display: 'inline-block',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            background: getRoleBadgeColor(employee.role) + '20',
                                            color: getRoleBadgeColor(employee.role)
                                        }}>
                                            {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                                    {employee.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                                            <Mail size={14} />
                                            <span>{employee.email}</span>
                                        </div>
                                    )}
                                    {employee.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '14px' }}>
                                            <Phone size={14} />
                                            <span>{employee.phone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Skills */}
                                {employee.skills && employee.skills.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                            <Award size={14} color="#6b7280" />
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>Skills:</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {employee.skills.map((skill, idx) => (
                                                <span key={idx} style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '12px',
                                                    background: '#f3f4f6',
                                                    color: '#374151'
                                                }}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Location */}
                                <div style={{ marginTop: '12px', padding: '8px', background: '#f9fafb', borderRadius: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280' }}>
                                        <MapPin size={14} />
                                        <span>{getLocationText(employee)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                                {!employee.hasAccount && employee.email && (
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%' }}
                                        onClick={() => handleSendInvite(employee.id)}
                                    >
                                        📧 Send Invite
                                    </button>
                                )}
                                {employee.hasAccount && (
                                    <div style={{
                                        padding: '8px',
                                        background: '#d1fae5',
                                        color: '#065f46',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        textAlign: 'center'
                                    }}>
                                        ✅ Has Login Account
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => handleOpenModal(employee)}
                                    >
                                        <Edit size={14} /> Edit
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => handleDelete(employee.id)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                            <Users size={48} color="#d1d5db" style={{ marginBottom: '16px' }} />
                            <h3>No Employees Yet</h3>
                            <p style={{ color: '#6b7280', marginBottom: '20px' }}>Add your first team member to get started with crew management.</p>
                            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                                <Plus size={16} /> Add First Employee
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Employee Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h2>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="form-control"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="form-control"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="form-control"
                                    placeholder="(555) 123-4567"
                                />
                            </div>

                            <div className="form-group">
                                <label>Role *</label>
                                <select
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="crew">Crew Member</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Skills</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <input
                                        type="text"
                                        value={skillInput}
                                        onChange={e => setSkillInput(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                        className="form-control"
                                        placeholder="e.g., Landscaping"
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddSkill}
                                        className="btn btn-secondary"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.skills.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {formData.skills.map((skill, idx) => (
                                            <span key={idx} style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '13px',
                                                background: '#e0e7ff',
                                                color: '#4f46e5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {skill}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSkill(skill)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#4f46e5' }}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Status *</label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="form-control"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Permissions</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '6px', background: '#f9fafb' }}>
                                    {/* Group permissions by category */}
                                    {Object.entries(
                                        EMPLOYEE_PERMISSIONS.reduce((acc, perm) => {
                                            if (!acc[perm.category]) acc[perm.category] = [];
                                            acc[perm.category].push(perm);
                                            return acc;
                                        }, {})
                                    ).map(([category, perms]) => (
                                        <div key={category} style={{ marginBottom: '8px' }}>
                                            <div style={{
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                color: '#374151',
                                                marginBottom: '6px',
                                                paddingBottom: '4px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {category}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                                                {perms.map(permission => (
                                                    <label key={permission.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(permission.value)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        permissions: [...prev.permissions, permission.value]
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        permissions: prev.permissions.filter(p => p !== permission.value)
                                                                    }));
                                                                }
                                                            }}
                                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                        />
                                                        <span style={{ fontSize: '14px', color: '#4b5563' }}>{permission.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                    Select permissions for this employee. These will apply when they log in to their account.
                                </small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingEmployee ? 'Update Employee' : 'Add Employee'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Credentials Modal */}
            {showCredentialsModal && credentials && (
                <div className="modal-overlay" onClick={() => setShowCredentialsModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h2 style={{ marginBottom: '16px', color: '#10b981' }}>✅ Account Created Successfully!</h2>

                        <div style={{
                            padding: '20px',
                            background: '#f0fdf4',
                            borderRadius: '8px',
                            border: '2px solid #10b981',
                            marginBottom: '20px'
                        }}>
                            <p style={{ marginBottom: '16px', fontWeight: '500' }}>
                                Share these login credentials with the employee:
                            </p>

                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                    Email:
                                </label>
                                <div style={{
                                    padding: '12px',
                                    background: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{credentials.email}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(credentials.email);
                                            alert('Email copied to clipboard!');
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                                    Temporary Password:
                                </label>
                                <div style={{
                                    padding: '12px',
                                    background: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #d1d5db',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span>{credentials.temporaryPassword}</span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(credentials.temporaryPassword);
                                            alert('Password copied to clipboard!');
                                        }}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            background: '#3b82f6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '12px',
                            background: '#fffbeb',
                            borderRadius: '6px',
                            border: '1px solid #fbbf24',
                            marginBottom: '20px'
                        }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                                <strong>⚠️ Important:</strong> Save these credentials! The password cannot be retrieved later.
                                The employee should change their password after first login.
                            </p>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    setShowCredentialsModal(false);
                                    setCredentials(null);
                                }}
                                style={{ width: '100%' }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

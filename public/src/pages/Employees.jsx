import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Edit, Trash2, MapPin, Phone, Mail, Award, Clock } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.jpeg';
import PageHeader from '../components/ui/PageHeader';
import FilterTabs from '../components/FilterTabs';

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

// Migration map for old permission values to new standardized values
const PERMISSION_MIGRATION_MAP = {
    'view_reports': 'reports.view',
    'manage_clients': 'customers.view',
    'manage_work_orders': 'workOrders.view',
    'manage_invoices': 'invoices.view',
    'manage_employees': 'team.view',
    'manage_materials': 'products.view',
    'view_scheduling': 'scheduling.view',
    'manage_scheduling': 'scheduling.edit'
};

// Function to migrate old permissions to new format
function migratePermissions(permissions) {
    if (!Array.isArray(permissions)) return [];
    return permissions.map(perm => PERMISSION_MIGRATION_MAP[perm] || perm);
}



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
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await api.get('/employees');
            setEmployees(res.data.items || res.data || []);
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
                permissions: migratePermissions(employee.permissions || []), // Migrate old permissions
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

    const [viewMode, setViewMode] = useState(localStorage.getItem('employeesViewMode') || 'grid');

    // Filter employees based on active filter
    const filteredEmployees = employees.filter(emp => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'active') return emp.status === 'active';
        if (activeFilter === 'inactive') return emp.status === 'inactive';
        if (activeFilter === 'manager') return emp.role === 'manager';
        if (activeFilter === 'field-workers') return emp.role === 'crew' || emp.role === 'supervisor';
        return true;
    });

    // Define filter tabs
    const filterTabs = [
        { id: 'all', label: 'All Employees', count: employees.length },
        { id: 'active', label: 'Active', count: employees.filter(e => e.status === 'active').length },
        { id: 'inactive', label: 'Inactive', count: employees.filter(e => e.status === 'inactive').length },
        { id: 'manager', label: 'Managers', count: employees.filter(e => e.role === 'manager').length },
        { id: 'field-workers', label: 'Field Workers', count: employees.filter(e => e.role === 'crew' || e.role === 'supervisor').length }
    ];

    const handleViewChange = (newView) => {
        setViewMode(newView);
        localStorage.setItem('employeesViewMode', newView);
    };

    if (loading) return (
        <div className="dashboard">
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ marginBottom: '16px' }}></div>
                    <p style={{ color: 'var(--text-tertiary)', fontWeight: '600' }}>Synchronizing Team Data...</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="dashboard animate-fadeIn">
            <PageHeader
                title="Employees & Crew"
                subtitle="Manage your team members, roles, and assignment orchestration"
                actions={
                    <button className="btn-modern btn-modern-primary" onClick={() => handleOpenModal()}>
                        <Plus size={18} /> Add Team Member
                    </button>
                }
            >
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <div className="view-toggles" style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-color)' }}>
                        {[
                            { id: 'grid', icon: Users, label: 'Grid' },
                            { id: 'table', icon: Clock, label: 'Table' }
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
                {viewMode === 'table' ? (
                    <div className="modern-card animate-fadeIn" style={{ padding: 0, overflow: 'hidden' }}>
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '32px' }}>Employee</th>
                                    <th>Role</th>
                                    <th>Contact</th>
                                    <th>Last Seen</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right', paddingRight: '32px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map(employee => (
                                    <tr key={employee.id}>
                                        <td style={{ paddingLeft: '32px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: 'var(--primary-100)',
                                                    color: 'var(--primary-700)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '14px',
                                                    fontWeight: '900'
                                                }}>
                                                    {employee.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ fontWeight: '900', color: 'var(--text-primary)' }}>{employee.name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="badge" style={{
                                                background: getRoleBadgeColor(employee.role) + '15',
                                                color: getRoleBadgeColor(employee.role),
                                                fontSize: '11px',
                                                padding: '2px 10px'
                                            }}>
                                                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>{employee.email || employee.phone || '-'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', fontWeight: '600' }}>{getLocationText(employee)}</div>
                                        </td>
                                        <td>
                                            <div className="badge" style={{
                                                background: employee.status === 'active' ? 'var(--success-50)' : 'var(--error-50)',
                                                color: employee.status === 'active' ? 'var(--success-700)' : 'var(--error-700)',
                                                fontSize: '11px'
                                            }}>
                                                {employee.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '32px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                <button className="btn-modern btn-modern-secondary" style={{ padding: '8px' }} onClick={() => handleOpenModal(employee)}><Edit size={16} /></button>
                                                <button className="btn-modern btn-modern-secondary" style={{ padding: '8px', color: 'var(--error-600)' }} onClick={() => handleDelete(employee.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
                        {filteredEmployees.length > 0 ? filteredEmployees.map(employee => (
                            <div key={employee.id} className="modern-card animate-fadeIn" style={{ padding: '24px', position: 'relative' }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '24px',
                                    right: '24px',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '10px',
                                    fontWeight: '900',
                                    background: employee.status === 'active' ? 'var(--success-100)' : 'var(--error-100)',
                                    color: employee.status === 'active' ? 'var(--success-700)' : 'var(--error-700)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                                </div>

                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: 'var(--radius-lg)',
                                            background: 'linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px',
                                            fontWeight: '900',
                                            boxShadow: 'var(--shadow-md)'
                                        }}>
                                            {employee.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                                {employee.name}
                                            </h3>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '2px 10px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                background: getRoleBadgeColor(employee.role) + '15',
                                                color: getRoleBadgeColor(employee.role),
                                                marginTop: '6px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {employee.role}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                        {employee.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                                <Mail size={14} color="var(--primary-600)" />
                                                <span>{employee.email}</span>
                                            </div>
                                        )}
                                        {employee.phone && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600' }}>
                                                <Phone size={14} color="var(--primary-600)" />
                                                <span>{employee.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {employee.skills && employee.skills.length > 0 && (
                                        <div style={{ marginTop: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                <Award size={14} color="var(--text-tertiary)" />
                                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Specializations</span>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {employee.skills.map((skill, idx) => (
                                                    <span key={idx} className="badge badge-info" style={{ fontSize: '11px', padding: '4px 12px' }}>
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ marginTop: '20px', padding: '10px 16px', background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: 'var(--primary-700)', fontWeight: '700' }}>
                                        <MapPin size={14} />
                                        <span>SYSTEM LAST SEEN: {getLocationText(employee).toUpperCase()}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                                    {!employee.hasAccount && employee.email && (
                                        <button
                                            className="btn-modern btn-modern-primary"
                                            style={{ width: '100%', justifyContent: 'center' }}
                                            onClick={() => handleSendInvite(employee.id)}
                                        >
                                            <Mail size={16} /> Deploy Access Invitation
                                        </button>
                                    )}
                                    {employee.hasAccount && (
                                        <div style={{
                                            padding: '10px',
                                            background: 'var(--success-50)',
                                            color: 'var(--success-700)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            textAlign: 'center',
                                            border: '1px solid var(--success-200)'
                                        }}>
                                            <CheckSquare size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> ACTIVE SYSTEM ACCOUNT
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className="btn-modern btn-modern-secondary"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                            onClick={() => handleOpenModal(employee)}
                                        >
                                            <Edit size={14} /> Configure
                                        </button>
                                        <button
                                            className="btn-modern btn-modern-secondary"
                                            style={{ color: 'var(--error-600)', padding: '10px' }}
                                            onClick={() => handleDelete(employee.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="modern-card animate-fadeIn" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 48px', background: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
                                <Users size={64} color="var(--primary-600)" style={{ marginBottom: '24px', opacity: 0.5 }} />
                                <h2 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 12px 0' }}>No Active Personnel</h2>
                                <p style={{ color: 'var(--text-tertiary)', marginBottom: '32px', fontSize: '16px', fontWeight: '600', maxWidth: '480px', margin: '0 auto 32px auto' }}>Add your first team member to begin orchestrating crew assignments and system permissions.</p>
                                <button className="btn-modern btn-modern-primary" onClick={() => handleOpenModal()}>
                                    <Plus size={18} /> Initialize First Employee
                                </button>
                            </div>
                        )}
                    </div>
                )}
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

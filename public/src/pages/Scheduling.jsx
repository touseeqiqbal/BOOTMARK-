import { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Filter, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../utils/api';
import logo from '../assets/logo.svg';
import ScheduleModal from '../components/ScheduleModal';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Dashboard.css';

const localizer = momentLocalizer(moment);

export default function Scheduling() {
    const navigate = useNavigate();
    const location = useLocation();
    const [events, setEvents] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [clients, setClients] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('month');
    const [date, setDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [prefilledData, setPrefilledData] = useState({});
    const [filters, setFilters] = useState({
        status: 'all',
        crew: 'all',
        client: 'all'
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();

        // Check if navigated from work order
        if (location.state?.fromWorkOrder) {
            setPrefilledData(location.state);
            setShowScheduleModal(true);
            // Clear the state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [eventsRes, employeesRes, clientsRes, propertiesRes] = await Promise.all([
                api.get('/scheduling'),
                api.get('/employees'),
                api.get('/customers'),
                api.get('/properties')
            ]);

            setEvents(eventsRes.data);
            setEmployees(employeesRes.data);
            setClients(clientsRes.data);
            setProperties(propertiesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and search events
    const filteredEvents = events.filter(event => {
        // Status filter
        if (filters.status !== 'all' && event.status !== filters.status) return false;

        // Crew filter
        if (filters.crew !== 'all' && !event.assignedCrew?.includes(filters.crew)) return false;

        // Client filter
        if (filters.client !== 'all' && event.clientId !== filters.client) return false;

        // Search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = event.title?.toLowerCase().includes(query);
            const matchesClient = event.clientName?.toLowerCase().includes(query);
            const matchesProperty = event.propertyAddress?.toLowerCase().includes(query);
            if (!matchesTitle && !matchesClient && !matchesProperty) return false;
        }

        return true;
    });

    // Convert events to calendar format
    const calendarEvents = filteredEvents.map(event => ({
        id: event.id,
        title: event.title || event.clientName,
        start: new Date(`${event.scheduledDate}T${event.startTime || '09:00'}`),
        end: new Date(`${event.scheduledDate}T${event.endTime || '17:00'}`),
        resource: event,
        allDay: false
    }));

    // Get event style based on status
    const eventStyleGetter = (event) => {
        const status = event.resource.status;
        let backgroundColor = '#3b82f6'; // default blue

        switch (status) {
            case 'scheduled':
                backgroundColor = '#3b82f6'; // blue
                break;
            case 'in-progress':
                backgroundColor = '#10b981'; // green
                break;
            case 'completed':
                backgroundColor = '#6b7280'; // gray
                break;
            case 'cancelled':
                backgroundColor = '#ef4444'; // red
                break;
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block'
            }
        };
    };

    const handleSelectEvent = (event) => {
        setSelectedEvent(event.resource);
        setShowModal(true);
    };

    const handleSelectSlot = ({ start }) => {
        setPrefilledData({ scheduledDate: moment(start).format('YYYY-MM-DD') });
        setEditingSchedule(null);
        setShowScheduleModal(true);
    };

    const handleCreateSchedule = () => {
        setPrefilledData({});
        setEditingSchedule(null);
        setShowScheduleModal(true);
    };

    const handleEditSchedule = (event) => {
        setEditingSchedule(event);
        setShowScheduleModal(true);
    };

    const handleScheduleSave = () => {
        fetchData();
        setShowScheduleModal(false);
    };

    const handleNavigate = (newDate) => {
        setDate(newDate);
    };

    const handleViewChange = (newView) => {
        setView(newView);
    };

    const handleStatusUpdate = async (eventId, newStatus) => {
        try {
            await api.put(`/scheduling/${eventId}/status`, { status: newStatus });
            fetchData();
            setShowModal(false);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const handleDelete = async (eventId) => {
        if (!confirm('Are you sure you want to delete this scheduled event?')) return;

        try {
            await api.delete(`/scheduling/${eventId}`);
            fetchData();
            setShowModal(false);
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event');
        }
    };

    // Get today's jobs
    // Get today's jobs (using filtered events)
    const todayJobs = filteredEvents.filter(event => {
        const eventDate = moment(event.scheduledDate).format('YYYY-MM-DD');
        const today = moment().format('YYYY-MM-DD');
        return eventDate === today;
    }).sort((a, b) => {
        return (a.startTime || '').localeCompare(b.startTime || '');
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled': return '#3b82f6';
            case 'in-progress': return '#10b981';
            case 'completed': return '#6b7280';
            case 'cancelled': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'scheduled': return '🔵';
            case 'in-progress': return '🟢';
            case 'completed': return '✅';
            case 'cancelled': return '🔴';
            default: return '⚪';
        }
    };

    if (loading) return <div className="loading">Loading schedule...</div>;

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="dashboard-brand">
                            <img src={logo} alt="BOOTMARK Logo" className="brand-logo" />
                            <div className="brand-text">
                                <h1 className="brand-title">Scheduling & Dispatch</h1>
                            </div>
                        </div>
                        <div className="header-actions">
                            <button className="btn btn-primary" onClick={handleCreateSchedule}>
                                <Plus size={16} /> Schedule Job
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container" style={{ paddingBottom: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                    {/* Main Calendar */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                        {/* Filters */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <input
                                    type="text"
                                    placeholder="Search jobs, clients, addresses..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="form-control"
                                    style={{ height: '40px' }}
                                />
                            </div>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="form-control"
                                style={{ width: '150px', height: '40px' }}
                            >
                                <option value="all">All Statuses</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <select
                                value={filters.crew}
                                onChange={(e) => setFilters({ ...filters, crew: e.target.value })}
                                className="form-control"
                                style={{ width: '150px', height: '40px' }}
                            >
                                <option value="all">All Crews</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                ))}
                            </select>
                            <select
                                value={filters.client}
                                onChange={(e) => setFilters({ ...filters, client: e.target.value })}
                                className="form-control"
                                style={{ width: '150px', height: '40px' }}
                            >
                                <option value="all">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>{client.name}</option>
                                ))}
                            </select>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setFilters({ status: 'all', crew: 'all', client: 'all' });
                                    setSearchQuery('');
                                }}
                                title="Reset Filters"
                            >
                                <Filter size={16} />
                            </button>
                        </div>

                        <div style={{ height: '700px' }}>
                            <Calendar
                                localizer={localizer}
                                events={calendarEvents}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                view={view}
                                onView={handleViewChange}
                                date={date}
                                onNavigate={handleNavigate}
                                onSelectEvent={handleSelectEvent}
                                onSelectSlot={handleSelectSlot}
                                selectable
                                eventPropGetter={eventStyleGetter}
                                views={['month', 'week', 'day', 'agenda']}
                                popup
                                tooltipAccessor={(event) => `${event.title} - ${event.resource.clientName}`}
                            />
                        </div>

                        {/* Legend */}
                        <div style={{ marginTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3b82f6' }}></div>
                                <span>Scheduled</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10b981' }}></div>
                                <span>In Progress</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#6b7280' }}></div>
                                <span>Completed</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#ef4444' }}></div>
                                <span>Cancelled</span>
                            </div>
                        </div>
                    </div>

                    {/* Today's Jobs Sidebar */}
                    <div>
                        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', position: 'sticky', top: '20px' }}>
                            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CalendarIcon size={20} />
                                Today's Schedule
                            </h3>

                            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
                                {moment().format('dddd, MMMM D, YYYY')}
                            </div>

                            {todayJobs.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                                    {todayJobs.map(job => (
                                        <div
                                            key={job.id}
                                            onClick={() => {
                                                setSelectedEvent(job);
                                                setShowModal(true);
                                            }}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                borderLeft: `4px solid ${getStatusColor(job.status)}`
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '16px' }}>{getStatusIcon(job.status)}</span>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                                    {job.title || job.clientName}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                {job.startTime} - {job.endTime}
                                            </div>

                                            {job.clientName && (
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                                    <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                    {job.clientName}
                                                </div>
                                            )}

                                            {job.propertyAddress && (
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                    {job.propertyAddress}
                                                </div>
                                            )}

                                            {job.crewNames && job.crewNames.length > 0 && (
                                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #f3f4f6' }}>
                                                    Crew: {job.crewNames.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af' }}>
                                    <CalendarIcon size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                                    <p style={{ margin: 0, fontSize: '14px' }}>No jobs scheduled for today</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Detail Modal */}
            {showModal && selectedEvent && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2>{selectedEvent.title || selectedEvent.clientName}</h2>

                        <div style={{ display: 'grid', gap: '16px' }}>
                            {/* Status */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Status</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {['scheduled', 'in-progress', 'completed', 'cancelled'].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusUpdate(selectedEvent.id, status)}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: selectedEvent.status === status ? '2px solid' : '1px solid #e5e7eb',
                                                background: selectedEvent.status === status ? getStatusColor(status) + '20' : 'white',
                                                color: selectedEvent.status === status ? getStatusColor(status) : '#6b7280',
                                                borderColor: selectedEvent.status === status ? getStatusColor(status) : '#e5e7eb',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: selectedEvent.status === status ? '600' : '400'
                                            }}
                                        >
                                            {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date & Time */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Date</label>
                                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                                        {moment(selectedEvent.scheduledDate).format('MMM D, YYYY')}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Time</label>
                                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                                        {selectedEvent.startTime} - {selectedEvent.endTime}
                                    </div>
                                </div>
                            </div>

                            {/* Client & Property */}
                            {selectedEvent.clientName && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Client</label>
                                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                                        {selectedEvent.clientName}
                                    </div>
                                </div>
                            )}

                            {selectedEvent.propertyAddress && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Property</label>
                                    <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px' }}>
                                        {selectedEvent.propertyAddress}
                                    </div>
                                </div>
                            )}

                            {/* Crew */}
                            {selectedEvent.crewNames && selectedEvent.crewNames.length > 0 && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Assigned Crew</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {selectedEvent.crewNames.map((name, idx) => (
                                            <span key={idx} style={{
                                                padding: '4px 12px',
                                                borderRadius: '12px',
                                                background: '#e0e7ff',
                                                color: '#4f46e5',
                                                fontSize: '13px'
                                            }}>
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {selectedEvent.description && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '14px' }}>Description</label>
                                    <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                                        {selectedEvent.description}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-actions" style={{ marginTop: '24px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                Close
                            </button>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        handleEditSchedule(selectedEvent);
                                        setShowModal(false);
                                    }}
                                >
                                    Edit Schedule
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(selectedEvent.id)}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                                {selectedEvent.workOrderId && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => navigate(`/work-orders/${selectedEvent.workOrderId}`)}
                                    >
                                        View Work Order
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Creation/Edit Modal */}
            <ScheduleModal
                isOpen={showScheduleModal}
                onClose={() => setShowScheduleModal(false)}
                onSave={handleScheduleSave}
                editingEvent={editingSchedule}
                prefilledData={prefilledData}
            />
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../utils/AuthContext';
import api from '../utils/api';
import GPSTrackingMap from '../components/GPSTrackingMap';
import { MapPin, Clock, Phone, MessageSquare, Navigation, AlertCircle, CheckCircle } from 'lucide-react';
import { initializeSocket, joinUser } from '../utils/socket';
import '../styles/ClientCrewTracking.css';

export default function ClientCrewTracking() {
    const { user } = useAuth();
    const [activeWorkOrders, setActiveWorkOrders] = useState([]);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [crewLocations, setCrewLocations] = useState([]);
    const [eta, setEta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [fullscreenMap, setFullscreenMap] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Initialize Socket.IO for real-time updates
        initializeSocket();
        joinUser(user.uid);

        fetchActiveWorkOrders();

        // Listen for crew location updates
        const socket = initializeSocket();
        socket.on('gps:location-update', handleLocationUpdate);
        socket.on('client:crew-arrived', handleCrewArrived);
        socket.on('client:crew-approaching', handleCrewApproaching);

        return () => {
            socket.off('gps:location-update', handleLocationUpdate);
            socket.off('client:crew-arrived', handleCrewArrived);
            socket.off('client:crew-approaching', handleCrewApproaching);
        };
    }, [user]);

    useEffect(() => {
        if (selectedWorkOrder) {
            fetchCrewLocation();
            fetchETA();

            // Poll for updates every 30 seconds
            const interval = setInterval(() => {
                fetchCrewLocation();
                fetchETA();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [selectedWorkOrder]);

    const fetchActiveWorkOrders = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clients/work-orders');
            const active = response.data.filter(wo =>
                wo.status === 'scheduled' || wo.status === 'in-progress'
            );
            setActiveWorkOrders(active);

            if (active.length > 0 && !selectedWorkOrder) {
                setSelectedWorkOrder(active[0]);
            }
        } catch (err) {
            console.error('Failed to fetch work orders:', err);
            setError('Failed to load work orders');
        } finally {
            setLoading(false);
        }
    };

    const fetchCrewLocation = async () => {
        if (!selectedWorkOrder) return;

        try {
            const response = await api.get(`/gps/client/crew-location/${selectedWorkOrder.id}`);
            setCrewLocations(response.data.crewLocations || []);
        } catch (err) {
            console.error('Failed to fetch crew location:', err);
        }
    };

    const fetchETA = async () => {
        if (!selectedWorkOrder) return;

        try {
            const response = await api.get(`/gps/client/eta/${selectedWorkOrder.id}`);
            setEta(response.data);
        } catch (err) {
            console.error('Failed to fetch ETA:', err);
        }
    };

    const handleLocationUpdate = (data) => {
        // Update crew location in real-time
        setCrewLocations(prev => {
            const index = prev.findIndex(c => c.employeeId === data.employeeId);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = {
                    ...updated[index],
                    lat: data.location.lat,
                    lng: data.location.lng,
                    lastUpdate: data.location.lastUpdate
                };
                return updated;
            }
            return prev;
        });
    };

    const handleCrewArrived = (data) => {
        // Show arrival notification
        alert(`Your crew has arrived! ${data.message || ''}`);
    };

    const handleCrewApproaching = (data) => {
        // Update ETA
        setEta(data);
    };

    const getPropertyLocation = () => {
        if (!selectedWorkOrder || !selectedWorkOrder.property) return null;

        return {
            lat: selectedWorkOrder.property.latitude,
            lng: selectedWorkOrder.property.longitude,
            name: selectedWorkOrder.property.name || 'Service Location',
            address: selectedWorkOrder.property.address
        };
    };

    const formatETA = (minutes) => {
        if (!minutes) return 'Calculating...';
        if (minutes < 60) return `${minutes} minutes`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    if (loading) {
        return (
            <div className="crew-tracking-loading">
                <div className="spinner"></div>
                <p>Loading crew information...</p>
            </div>
        );
    }

    if (activeWorkOrders.length === 0) {
        return (
            <div className="crew-tracking-empty">
                <MapPin size={48} color="#9ca3af" />
                <h2>No Active Services</h2>
                <p>You don't have any scheduled or in-progress services at the moment.</p>
            </div>
        );
    }

    return (
        <div className={`crew-tracking ${fullscreenMap ? 'fullscreen' : ''}`}>
            {!fullscreenMap && (
                <div className="crew-tracking-header">
                    <h1>Track Your Crew</h1>
                    <p>See real-time location of crew members assigned to your service</p>
                </div>
            )}

            {error && (
                <div className="alert alert-error">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {!fullscreenMap && activeWorkOrders.length > 1 && (
                <div className="work-order-selector">
                    <label>Select Service:</label>
                    <select
                        value={selectedWorkOrder?.id || ''}
                        onChange={(e) => {
                            const wo = activeWorkOrders.find(w => w.id === e.target.value);
                            setSelectedWorkOrder(wo);
                        }}
                        className="form-control"
                    >
                        {activeWorkOrders.map(wo => (
                            <option key={wo.id} value={wo.id}>
                                {wo.title} - {new Date(wo.scheduledDate).toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div className="crew-tracking-content">
                {!fullscreenMap && (
                    <div className="crew-info-panel">
                        {/* Service Details */}
                        <div className="info-card">
                            <h3>Service Details</h3>
                            <div className="info-item">
                                <strong>Service:</strong>
                                <span>{selectedWorkOrder?.title}</span>
                            </div>
                            <div className="info-item">
                                <strong>Status:</strong>
                                <span className={`status-badge ${selectedWorkOrder?.status}`}>
                                    {selectedWorkOrder?.status}
                                </span>
                            </div>
                            <div className="info-item">
                                <strong>Scheduled:</strong>
                                <span>{new Date(selectedWorkOrder?.scheduledDate).toLocaleString()}</span>
                            </div>
                            {selectedWorkOrder?.property && (
                                <div className="info-item">
                                    <strong>Location:</strong>
                                    <span>{selectedWorkOrder.property.address}</span>
                                </div>
                            )}
                        </div>

                        {/* ETA Card */}
                        {eta && eta.eta && (
                            <div className="eta-card">
                                <div className="eta-icon">
                                    <Clock size={32} />
                                </div>
                                <div className="eta-content">
                                    <h3>Estimated Arrival</h3>
                                    <div className="eta-time">{formatETA(eta.eta)}</div>
                                    {eta.distanceKm && (
                                        <div className="eta-distance">
                                            <Navigation size={16} />
                                            {eta.distanceKm} km away
                                        </div>
                                    )}
                                    {eta.estimatedArrival && (
                                        <div className="eta-arrival">
                                            Arriving at {new Date(eta.estimatedArrival).toLocaleTimeString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Crew Members */}
                        <div className="crew-members-card">
                            <h3>Crew Members</h3>
                            {crewLocations.length === 0 ? (
                                <p className="no-crew">No crew location available yet</p>
                            ) : (
                                <div className="crew-list">
                                    {crewLocations.map(crew => (
                                        <div key={crew.employeeId} className="crew-member">
                                            <div className="crew-avatar">
                                                {crew.name.charAt(0)}
                                            </div>
                                            <div className="crew-details">
                                                <div className="crew-name">{crew.name}</div>
                                                <div className="crew-update">
                                                    Last updated: {new Date(crew.lastUpdate).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div className="crew-status">
                                                <CheckCircle size={20} color="#10b981" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Actions */}
                        <div className="quick-actions">
                            <button className="btn btn-secondary">
                                <Phone size={18} />
                                Call Crew
                            </button>
                            <button className="btn btn-secondary">
                                <MessageSquare size={18} />
                                Send Message
                            </button>
                        </div>
                    </div>
                )}

                {/* Map */}
                <div className={`map-container ${fullscreenMap ? 'fullscreen' : ''}`}>
                    <GPSTrackingMap
                        employees={crewLocations.map(crew => ({
                            id: crew.employeeId,
                            name: crew.name,
                            lat: crew.lat,
                            lng: crew.lng,
                            status: 'active',
                            lastUpdate: crew.lastUpdate
                        }))}
                        clientLocation={getPropertyLocation()}
                        showETA={true}
                        fullscreenMode={fullscreenMap}
                        onToggleFullscreen={() => setFullscreenMap(!fullscreenMap)}
                    />
                </div>
            </div>
        </div>
    );
}

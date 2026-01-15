import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, Navigation, Battery, Maximize2, Download } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different employee statuses
const createCustomIcon = (color, label) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="position: relative;">
                <div style="
                    background-color: ${color}; 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 50%; 
                    border: 3px solid white; 
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                ">
                    ${label || ''}
                </div>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
};

const activeIcon = createCustomIcon('#10b981', '●'); // Green
const inactiveIcon = createCustomIcon('#ef4444', '●'); // Red
const onBreakIcon = createCustomIcon('#f59e0b', '●'); // Orange
const clientIcon = createCustomIcon('#3b82f6', '★'); // Blue star for client location

// Component to recenter map when employees change
function RecenterMap({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

// Component to fit bounds to all markers
function FitBounds({ bounds }) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [bounds, map]);
    return null;
}

export default function GPSTrackingMap({
    employees = [],
    center = [40.7128, -74.0060],
    zoom = 10,
    showRouteHistory = false,
    routeHistory = [],
    geofences = [],
    clientLocation = null,
    showETA = false,
    onEmployeeClick = null,
    fullscreenMode = false,
    onToggleFullscreen = null
}) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [mapCenter, setMapCenter] = useState(center);
    const [mapBounds, setMapBounds] = useState([]);
    const mapRef = useRef(null);

    // Calculate map center and bounds based on employees and client location
    useEffect(() => {
        const allPoints = [];

        // Add employee locations
        employees.forEach(emp => {
            if (emp.lat && emp.lng) {
                allPoints.push([emp.lat, emp.lng]);
            }
        });

        // Add client location
        if (clientLocation && clientLocation.lat && clientLocation.lng) {
            allPoints.push([clientLocation.lat, clientLocation.lng]);
        }

        // Add route history points
        if (showRouteHistory && routeHistory.length > 0) {
            routeHistory.forEach(point => {
                if (point.lat && point.lng) {
                    allPoints.push([point.lat, point.lng]);
                }
            });
        }

        if (allPoints.length > 0) {
            setMapBounds(allPoints);
            // Calculate center
            const avgLat = allPoints.reduce((sum, p) => sum + p[0], 0) / allPoints.length;
            const avgLng = allPoints.reduce((sum, p) => sum + p[1], 0) / allPoints.length;
            setMapCenter([avgLat, avgLng]);
        } else {
            setMapCenter(center);
        }
    }, [employees, clientLocation, showRouteHistory, routeHistory, center]);

    const getEmployeeIcon = (employee) => {
        if (employee.status === 'active') return activeIcon;
        if (employee.status === 'on-break') return onBreakIcon;
        return inactiveIcon;
    };

    const handleEmployeeClick = (employee) => {
        setSelectedEmployee(employee);
        if (onEmployeeClick) {
            onEmployeeClick(employee);
        }
    };

    const formatLastUpdate = (timestamp) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    };

    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    return (
        <div style={{
            height: fullscreenMode ? '100vh' : '100%',
            width: '100%',
            position: 'relative'
        }}>
            <MapContainer
                ref={mapRef}
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%', borderRadius: fullscreenMode ? '0' : '8px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapBounds.length > 0 && <FitBounds bounds={mapBounds} />}

                {/* Employee Markers */}
                {employees.map((employee) => {
                    if (!employee.lat || !employee.lng) return null;

                    const distance = clientLocation ?
                        calculateDistance(employee.lat, employee.lng, clientLocation.lat, clientLocation.lng) : null;
                    const eta = distance ? Math.round(distance / 40 * 60) : null; // Assuming 40 km/h average speed

                    return (
                        <Marker
                            key={employee.id}
                            position={[employee.lat, employee.lng]}
                            icon={getEmployeeIcon(employee)}
                            eventHandlers={{
                                click: () => handleEmployeeClick(employee)
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '250px', padding: '8px' }}>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                                        {employee.name}
                                    </h3>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '8px'
                                        }}>
                                            <strong>Status:</strong>
                                            <span style={{
                                                color: employee.status === 'active' ? '#10b981' :
                                                    employee.status === 'on-break' ? '#f59e0b' : '#ef4444',
                                                fontWeight: '500'
                                            }}>
                                                {employee.status || 'Unknown'}
                                            </span>
                                        </div>

                                        {employee.currentTask && (
                                            <div style={{ marginBottom: '8px' }}>
                                                <strong>Current Task:</strong> {employee.currentTask}
                                            </div>
                                        )}

                                        {employee.speed !== null && employee.speed !== undefined && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                <Navigation size={14} />
                                                <span>{Math.round(employee.speed)} km/h</span>
                                            </div>
                                        )}

                                        {employee.battery !== null && employee.battery !== undefined && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                <Battery size={14} />
                                                <span>{employee.battery}%</span>
                                            </div>
                                        )}

                                        {showETA && eta && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '12px',
                                                padding: '8px',
                                                background: '#f0f9ff',
                                                borderRadius: '6px'
                                            }}>
                                                <Clock size={14} color="#3b82f6" />
                                                <span style={{ color: '#3b82f6', fontWeight: '500' }}>
                                                    ETA: {eta} min ({distance.toFixed(1)} km away)
                                                </span>
                                            </div>
                                        )}

                                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                                            Last updated: {formatLastUpdate(employee.lastUpdate)}
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Client Location Marker */}
                {clientLocation && clientLocation.lat && clientLocation.lng && (
                    <Marker
                        position={[clientLocation.lat, clientLocation.lng]}
                        icon={clientIcon}
                    >
                        <Popup>
                            <div style={{ padding: '8px' }}>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                                    {clientLocation.name || 'Service Location'}
                                </h3>
                                {clientLocation.address && (
                                    <p style={{ margin: '4px 0', fontSize: '14px', color: '#666' }}>
                                        {clientLocation.address}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Route History Polyline */}
                {showRouteHistory && routeHistory.length > 1 && (
                    <Polyline
                        positions={routeHistory.map(point => [point.lat, point.lng])}
                        color="#3b82f6"
                        weight={3}
                        opacity={0.7}
                    />
                )}

                {/* Geofences */}
                {geofences.map((geofence) => {
                    if (geofence.type === 'circle' && geofence.center) {
                        return (
                            <Circle
                                key={geofence.id}
                                center={[geofence.center.lat, geofence.center.lng]}
                                radius={geofence.radius}
                                pathOptions={{
                                    color: geofence.active ? '#10b981' : '#9ca3af',
                                    fillColor: geofence.active ? '#10b981' : '#9ca3af',
                                    fillOpacity: 0.1,
                                    weight: 2
                                }}
                            >
                                <Popup>
                                    <div style={{ padding: '8px' }}>
                                        <h4 style={{ margin: '0 0 8px 0' }}>{geofence.name}</h4>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                            Radius: {geofence.radius}m
                                        </p>
                                        <p style={{ margin: '4px 0', fontSize: '13px' }}>
                                            Status: {geofence.active ? 'Active' : 'Inactive'}
                                        </p>
                                    </div>
                                </Popup>
                            </Circle>
                        );
                    }
                    return null;
                })}
            </MapContainer>

            {/* Map Controls */}
            <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {onToggleFullscreen && (
                    <button
                        onClick={onToggleFullscreen}
                        style={{
                            background: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        title={fullscreenMode ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        <Maximize2 size={18} />
                    </button>
                )}
            </div>

            {/* Legend */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'white',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '180px'
            }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                    {clientLocation ? 'Crew Status' : 'Employee Status'}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10b981' }}></div>
                        <span style={{ fontSize: '13px' }}>Active</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f59e0b' }}></div>
                        <span style={{ fontSize: '13px' }}>On Break</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ef4444' }}></div>
                        <span style={{ fontSize: '13px' }}>Inactive</span>
                    </div>
                    {clientLocation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#3b82f6' }}></div>
                            <span style={{ fontSize: '13px' }}>Your Location</span>
                        </div>
                    )}
                </div>

                {employees.length > 0 && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            <div>Total Crew: {employees.length}</div>
                            <div>Active: {employees.filter(e => e.status === 'active').length}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useState, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons for different employee statuses
const createCustomIcon = (color) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
};

const activeIcon = createCustomIcon('#10b981'); // Green
const inactiveIcon = createCustomIcon('#ef4444'); // Red
const onBreakIcon = createCustomIcon('#f59e0b'); // Orange

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

export default function EmployeeMap({ employees = [], center = [40.7128, -74.0060], zoom = 10 }) {
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // Calculate map center based on employees
    const mapCenter = employees.length > 0 && employees[0].lat && employees[0].lng
        ? [employees[0].lat, employees[0].lng]
        : center;

    const getEmployeeIcon = (employee) => {
        if (employee.status === 'active') return activeIcon;
        if (employee.status === 'on-break') return onBreakIcon;
        return inactiveIcon;
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RecenterMap center={mapCenter} />

                {employees.map((employee) => {
                    if (!employee.lat || !employee.lng) return null;

                    return (
                        <Marker
                            key={employee.id}
                            position={[employee.lat, employee.lng]}
                            icon={getEmployeeIcon(employee)}
                            eventHandlers={{
                                click: () => setSelectedEmployee(employee)
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '200px' }}>
                                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>{employee.name}</h3>
                                    <div style={{ fontSize: '14px', color: '#666' }}>
                                        <p style={{ margin: '5px 0' }}>
                                            <strong>Status:</strong>{' '}
                                            <span style={{
                                                color: employee.status === 'active' ? '#10b981' :
                                                    employee.status === 'on-break' ? '#f59e0b' : '#ef4444'
                                            }}>
                                                {employee.status || 'Unknown'}
                                            </span>
                                        </p>
                                        {employee.currentTask && (
                                            <p style={{ margin: '5px 0' }}>
                                                <strong>Current Task:</strong> {employee.currentTask}
                                            </p>
                                        )}
                                        {employee.lastUpdate && (
                                            <p style={{ margin: '5px 0', fontSize: '12px', color: '#999' }}>
                                                Last updated: {new Date(employee.lastUpdate).toLocaleTimeString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Legend */}
            <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'white',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000
            }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>Employee Status</h4>
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
                </div>
            </div>
        </div>
    );
}

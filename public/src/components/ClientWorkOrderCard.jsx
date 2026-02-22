import { Calendar, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import '../styles/ClientPortal.css';

export default function ClientWorkOrderCard({ workOrder }) {
    const [expanded, setExpanded] = useState(false);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
                return '#10b981'; // green
            case 'in-progress':
            case 'in progress':
                return '#3b82f6'; // blue
            case 'scheduled':
                return '#f59e0b'; // orange
            case 'pending':
            case 'draft':
                return '#6b7280'; // gray
            case 'cancelled':
                return '#ef4444'; // red
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status) => {
        if (!status) return 'Pending';
        return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return null;
        return timeString;
    };

    return (
        <div className="client-work-order-card">
            <div className="work-order-card-header">
                <div className="work-order-number">
                    <span>Work Order #{workOrder.workOrderNumber || workOrder.id?.substring(0, 8)}</span>
                </div>
                <div
                    className="work-order-status-badge"
                    style={{
                        background: `${getStatusColor(workOrder.status)}20`,
                        color: getStatusColor(workOrder.status),
                        border: `1px solid ${getStatusColor(workOrder.status)}40`
                    }}
                >
                    {getStatusText(workOrder.status)}
                </div>
            </div>

            <div className="work-order-card-body">
                {workOrder.title && (
                    <div className="work-order-title">{workOrder.title}</div>
                )}

                <div className="work-order-info">
                    {workOrder.scheduledDate && (
                        <div className="info-item">
                            <Calendar size={14} />
                            <span>{formatDate(workOrder.scheduledDate)}</span>
                        </div>
                    )}

                    {(workOrder.startTime || workOrder.finishTime) && (
                        <div className="info-item">
                            <Clock size={14} />
                            <span>
                                {formatTime(workOrder.startTime) || 'TBD'}
                                {workOrder.finishTime && ` - ${formatTime(workOrder.finishTime)}`}
                            </span>
                        </div>
                    )}

                    {workOrder.address && (
                        <div className="info-item">
                            <MapPin size={14} />
                            <span>{workOrder.address}</span>
                        </div>
                    )}

                    {workOrder.price && (
                        <div className="work-order-price">
                            <span className="price-label">Price:</span>
                            <span className="price-value">${(workOrder.price || 0).toFixed(2)}</span>
                        </div>
                    )}
                </div>

                {workOrder.description && (
                    <div className="work-order-description">
                        <p>{expanded ? workOrder.description : `${workOrder.description.substring(0, 100)}${workOrder.description.length > 100 ? '...' : ''}`}</p>
                    </div>
                )}
            </div>

            {workOrder.description && workOrder.description.length > 100 && (
                <div className="work-order-card-footer">
                    <button
                        className="btn-text"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? (
                            <>
                                <ChevronUp size={16} />
                                Show Less
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} />
                                Show More
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

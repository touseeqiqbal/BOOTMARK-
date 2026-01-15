import { Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/ClientPortal.css';

export default function ClientInvoiceCard({ invoice }) {
    const navigate = useNavigate();

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'paid':
                return '#10b981'; // green
            case 'sent':
            case 'pending':
                return '#f59e0b'; // orange
            case 'overdue':
                return '#ef4444'; // red
            case 'draft':
                return '#6b7280'; // gray
            default:
                return '#6b7280';
        }
    };

    const getStatusText = (status) => {
        return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Pending';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const isOverdue = () => {
        if (!invoice.dueDate || invoice.status === 'paid') return false;
        return new Date(invoice.dueDate) < new Date();
    };

    return (
        <div className="client-invoice-card">
            <div className="invoice-card-header">
                <div className="invoice-number">
                    <DollarSign size={18} />
                    <span>Invoice #{invoice.invoiceNumber || invoice.id?.substring(0, 8)}</span>
                </div>
                <div
                    className="invoice-status-badge"
                    style={{
                        background: `${getStatusColor(isOverdue() ? 'overdue' : invoice.status)}20`,
                        color: getStatusColor(isOverdue() ? 'overdue' : invoice.status),
                        border: `1px solid ${getStatusColor(isOverdue() ? 'overdue' : invoice.status)}40`
                    }}
                >
                    {isOverdue() ? 'Overdue' : getStatusText(invoice.status)}
                </div>
            </div>

            <div className="invoice-card-body">
                <div className="invoice-amount">
                    <span className="amount-label">Amount</span>
                    <span className="amount-value">${(invoice.total || 0).toFixed(2)}</span>
                </div>

                <div className="invoice-dates">
                    {invoice.createdAt && (
                        <div className="invoice-date">
                            <Calendar size={14} />
                            <span>Issued: {formatDate(invoice.createdAt)}</span>
                        </div>
                    )}
                    {invoice.dueDate && (
                        <div className="invoice-date">
                            <Calendar size={14} />
                            <span style={{ color: isOverdue() ? '#ef4444' : 'inherit' }}>
                                Due: {formatDate(invoice.dueDate)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="invoice-card-footer">
                {invoice.status !== 'paid' && invoice.paymentToken && (
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/pay/${invoice.paymentToken}`)}
                    >
                        Pay Now
                    </button>
                )}
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                        // TODO: View invoice details modal or page
                        console.log('View invoice:', invoice.id);
                    }}
                >
                    <ExternalLink size={14} />
                    View Details
                </button>
            </div>
        </div>
    );
}

# Notification System Implementation Guide

## Quick Start

### 1. Using the Notification Service

```javascript
import { notify, notifyWorkOrder, notifyInvoice, notifyContract, notifyTeam, notifySecurity } from '../utils/notificationService';

// Simple notification
await notify({
  type: 'success',
  priority: 'high',
  category: 'work_orders',
  title: 'Work Order Completed',
  message: 'Work order #123 has been completed successfully.',
  actionUrl: '/work-orders/123',
  actionLabel: 'View Work Order',
  userIds: ['user-id-1', 'user-id-2'],
  businessId: 'business-id',
  channels: ['in_app', 'email']
});

// Work Order notification (convenience function)
await notifyWorkOrder({
  event: 'completed',
  workOrder: { id: '123', title: 'Lawn Maintenance', workOrderNumber: 'WO-001' },
  userIds: ['user-id'],
  businessId: 'business-id',
  clientId: 'client-id'
});

// Invoice notification
await notifyInvoice({
  event: 'paid',
  invoice: { id: '456', invoiceNumber: 'INV-001' },
  userIds: ['user-id'],
  businessId: 'business-id',
  clientId: 'client-id'
});

// Contract notification
await notifyContract({
  event: 'signed',
  contract: { id: '789', title: 'Service Agreement' },
  userIds: ['user-id'],
  businessId: 'business-id',
  clientId: 'client-id'
});

// Team notification
await notifyTeam({
  event: 'invited',
  user: { id: 'user-id', email: 'newuser@example.com', businessName: 'Acme Corp' },
  businessId: 'business-id',
  userIds: ['user-id']
});

// Security notification
await notifySecurity({
  event: 'password_changed',
  userId: 'user-id',
  metadata: { ip: '192.168.1.1', device: 'Chrome on Windows' }
});
```

### 2. Using Status Constants

```javascript
import { 
  WORK_ORDER_STATUS, 
  INVOICE_STATUS, 
  CONTRACT_STATUS,
  getStatusColor,
  getStatusLabel,
  isSuccessStatus,
  isWarningStatus,
  isErrorStatus
} from '../utils/statusConstants';

// Use status constants
const status = WORK_ORDER_STATUS.COMPLETED;

// Get status color
const color = getStatusColor(status); // Returns '#10b981'

// Get status label
const label = getStatusLabel(status); // Returns 'Completed'

// Check status type
if (isSuccessStatus(status)) {
  // Handle success state
}

// In components
<span style={{ backgroundColor: getStatusColor(status), color: 'white' }}>
  {getStatusLabel(status)}
</span>
```

## Integration Examples

### Work Order Status Change

```javascript
// In WorkOrderForm.jsx or WorkOrderDetail.jsx
import { notifyWorkOrder } from '../utils/notificationService';
import { WORK_ORDER_STATUS } from '../utils/statusConstants';

const handleStatusChange = async (newStatus) => {
  try {
    await api.put(`/work-orders/${id}`, { status: newStatus });
    setWorkOrder(prev => ({ ...prev, status: newStatus }));
    
    // Notify relevant users
    const userIds = [];
    if (workOrder.assignedTo) {
      userIds.push(...workOrder.assignedTo);
    }
    if (workOrder.clientId) {
      // Get client user ID
      const client = await api.get(`/clients/${workOrder.clientId}`);
      if (client.data.userId) {
        userIds.push(client.data.userId);
      }
    }
    
    await notifyWorkOrder({
      event: 'status_changed',
      workOrder: { ...workOrder, status: newStatus },
      userIds,
      businessId: user.businessId,
      clientId: workOrder.clientId
    });
    
    toast.success(`Work order status updated to ${getStatusLabel(newStatus)}`);
  } catch (error) {
    toast.error('Failed to update status');
  }
};
```

### Invoice Payment

```javascript
// In Invoices.jsx or payment handler
import { notifyInvoice } from '../utils/notificationService';

const handlePayment = async (invoiceId, paymentData) => {
  try {
    await api.post(`/invoices/${invoiceId}/pay`, paymentData);
    
    const invoice = await api.get(`/invoices/${invoiceId}`);
    
    // Notify business owner
    await notifyInvoice({
      event: 'paid',
      invoice: invoice.data,
      userIds: [user.uid], // Business owner
      businessId: user.businessId,
      clientId: invoice.data.clientId
    });
    
    toast.success('Payment processed successfully');
  } catch (error) {
    toast.error('Payment failed');
  }
};
```

### Contract Signature

```javascript
// In ContractDetail.jsx or signature handler
import { notifyContract } from '../utils/notificationService';

const handleSignContract = async (contractId, signature) => {
  try {
    await api.post(`/contracts/${contractId}/sign`, { signature });
    
    const contract = await api.get(`/contracts/${contractId}`);
    
    // Notify business owner
    await notifyContract({
      event: 'signed',
      contract: contract.data,
      userIds: [user.businessId], // Business owner
      businessId: user.businessId,
      clientId: contract.data.clientId
    });
    
    toast.success('Contract signed successfully');
  } catch (error) {
    toast.error('Failed to sign contract');
  }
};
```

## Best Practices

1. **Always include action URLs** - Make notifications actionable
2. **Use appropriate priority** - Don't mark everything as HIGH
3. **Respect user preferences** - Check preferences before sending
4. **Include relevant metadata** - Store IDs for reference
5. **Handle errors gracefully** - Don't fail user actions if notification fails
6. **Use convenience functions** - Use `notifyWorkOrder` instead of raw `notify`
7. **Consistent status usage** - Always use status constants

## Notification Preferences

Users can manage their preferences via:
- API: `GET /api/notifications/preferences`
- API: `PUT /api/notifications/preferences`
- UI: Account Settings → Notification Preferences (to be implemented)

## Status Display Components

Create reusable status badge components:

```javascript
import { getStatusColor, getStatusLabel } from '../utils/statusConstants';

function StatusBadge({ status }) {
  return (
    <span 
      style={{ 
        backgroundColor: getStatusColor(status), 
        color: 'white',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}
    >
      {getStatusLabel(status)}
    </span>
  );
}
```

## Testing

Test notifications in development:
1. Use browser console to check Socket.IO connection
2. Check Network tab for `/api/notifications/send` requests
3. Verify email delivery (check SMTP logs)
4. Test notification center UI

## Troubleshooting

**Notifications not appearing:**
- Check Socket.IO connection status
- Verify user is in correct business/user rooms
- Check browser console for errors
- Verify backend `/api/notifications/send` endpoint

**Emails not sending:**
- Check SMTP configuration
- Verify user has email channel enabled
- Check server logs for email errors

**Status colors not showing:**
- Import status constants correctly
- Use `getStatusColor()` function
- Check status value matches constant


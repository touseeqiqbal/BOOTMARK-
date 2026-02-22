/**
 * Global Notification Service
 * Centralized notification system for the entire application
 */

import api from './api';
import { initializeSocket, sendNotification } from './socket';

// ============================================
// NOTIFICATION TYPES
// ============================================
export const NOTIFICATION_TYPE = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SECURITY: 'security'
};

// ============================================
// NOTIFICATION PRIORITY
// ============================================
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// ============================================
// NOTIFICATION CHANNELS
// ============================================
export const NOTIFICATION_CHANNEL = {
  IN_APP: 'in_app',
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms'
};

// ============================================
// NOTIFICATION CATEGORIES
// ============================================
export const NOTIFICATION_CATEGORY = {
  WORK_ORDERS: 'work_orders',
  INVOICES: 'invoices',
  CONTRACTS: 'contracts',
  FORMS: 'forms',
  TEAM: 'team',
  SECURITY: 'security',
  SYSTEM: 'system',
  CLIENT: 'client',
  SCHEDULING: 'scheduling'
};

/**
 * Create a notification object
 */
function createNotification({
  type = NOTIFICATION_TYPE.INFO,
  priority = NOTIFICATION_PRIORITY.MEDIUM,
  category,
  title,
  message,
  actionUrl,
  actionLabel,
  metadata = {},
  userIds = [],
  businessId,
  channels = [NOTIFICATION_CHANNEL.IN_APP]
}) {
  return {
    type,
    priority,
    category,
    title,
    message,
    actionUrl,
    actionLabel,
    metadata,
    userIds,
    businessId,
    channels,
    timestamp: new Date().toISOString()
  };
}

/**
 * Send notification via API (backend handles delivery)
 */
async function sendNotificationToBackend(notification) {
  try {
    const response = await api.post('/notifications/send', notification);
    return response.data;
  } catch (error) {
    console.error('[NotificationService] Failed to send notification:', error);
    throw error;
  }
}

/**
 * Send notification via Socket.IO (real-time)
 * Backend handles Socket.IO emission via /notifications/send endpoint
 */
function sendNotificationRealtime(notification) {
  // Real-time notifications are handled by backend
  // The backend will emit via Socket.IO after receiving the notification
  // This function is kept for future direct Socket.IO usage if needed
}

/**
 * Main notification sender
 */
export async function notify({
  type = NOTIFICATION_TYPE.INFO,
  priority = NOTIFICATION_PRIORITY.MEDIUM,
  category,
  title,
  message,
  actionUrl,
  actionLabel,
  metadata = {},
  userIds = [],
  businessId,
  channels = [NOTIFICATION_CHANNEL.IN_APP]
}) {
  const notification = createNotification({
    type,
    priority,
    category,
    title,
    message,
    actionUrl,
    actionLabel,
    metadata,
    userIds,
    businessId,
    channels
  });

  // Send real-time notification (Socket.IO)
  if (channels.includes(NOTIFICATION_CHANNEL.IN_APP)) {
    sendNotificationRealtime(notification);
  }

  // Send to backend for email/push/SMS delivery
  if (channels.some(ch => ch !== NOTIFICATION_CHANNEL.IN_APP)) {
    try {
      await sendNotificationToBackend(notification);
    } catch (error) {
      // Log but don't fail - real-time notification already sent
      console.warn('[NotificationService] Backend notification failed, but real-time sent');
    }
  }

  return notification;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Notify about work order events
 */
export async function notifyWorkOrder({
  event,
  workOrder,
  userIds = [],
  businessId,
  clientId
}) {
  const events = {
    created: {
      title: 'New Work Order Created',
      message: `Work order "${workOrder.title || workOrder.workOrderNumber}" has been created.`,
      actionUrl: `/work-orders/${workOrder.id}`,
      actionLabel: 'View Work Order',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    assigned: {
      title: 'Work Order Assigned',
      message: `You have been assigned to work order "${workOrder.title || workOrder.workOrderNumber}".`,
      actionUrl: `/work-orders/${workOrder.id}`,
      actionLabel: 'View Work Order',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    status_changed: {
      title: 'Work Order Status Updated',
      message: `Work order "${workOrder.title || workOrder.workOrderNumber}" status changed to ${workOrder.status}.`,
      actionUrl: `/work-orders/${workOrder.id}`,
      actionLabel: 'View Work Order',
      priority: NOTIFICATION_PRIORITY.MEDIUM
    },
    completed: {
      title: 'Work Order Completed',
      message: `Work order "${workOrder.title || workOrder.workOrderNumber}" has been completed.`,
      actionUrl: `/work-orders/${workOrder.id}`,
      actionLabel: 'View Work Order',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.SUCCESS
    },
    cancelled: {
      title: 'Work Order Cancelled',
      message: `Work order "${workOrder.title || workOrder.workOrderNumber}" has been cancelled.`,
      actionUrl: `/work-orders/${workOrder.id}`,
      actionLabel: 'View Work Order',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.WARNING
    }
  };

  const eventConfig = events[event];
  if (!eventConfig) {
    console.warn(`[NotificationService] Unknown work order event: ${event}`);
    return;
  }

  return notify({
    type: eventConfig.type || NOTIFICATION_TYPE.INFO,
    priority: eventConfig.priority,
    category: NOTIFICATION_CATEGORY.WORK_ORDERS,
    title: eventConfig.title,
    message: eventConfig.message,
    actionUrl: eventConfig.actionUrl,
    actionLabel: eventConfig.actionLabel,
    userIds,
    businessId,
    channels: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
    metadata: {
      workOrderId: workOrder.id,
      event,
      clientId
    }
  });
}

/**
 * Notify about invoice events
 */
export async function notifyInvoice({
  event,
  invoice,
  userIds = [],
  businessId,
  clientId
}) {
  const events = {
    created: {
      title: 'New Invoice Created',
      message: `Invoice #${invoice.invoiceNumber} has been created.`,
      actionUrl: `/invoices/${invoice.id}`,
      actionLabel: 'View Invoice',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    sent: {
      title: 'Invoice Sent',
      message: `Invoice #${invoice.invoiceNumber} has been sent.`,
      actionUrl: `/invoices/${invoice.id}`,
      actionLabel: 'View Invoice',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    paid: {
      title: 'Invoice Paid',
      message: `Invoice #${invoice.invoiceNumber} has been paid.`,
      actionUrl: `/invoices/${invoice.id}`,
      actionLabel: 'View Invoice',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.SUCCESS
    },
    overdue: {
      title: 'Invoice Overdue',
      message: `Invoice #${invoice.invoiceNumber} is now overdue.`,
      actionUrl: `/invoices/${invoice.id}`,
      actionLabel: 'View Invoice',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.WARNING
    }
  };

  const eventConfig = events[event];
  if (!eventConfig) {
    console.warn(`[NotificationService] Unknown invoice event: ${event}`);
    return;
  }

  return notify({
    type: eventConfig.type || NOTIFICATION_TYPE.INFO,
    priority: eventConfig.priority,
    category: NOTIFICATION_CATEGORY.INVOICES,
    title: eventConfig.title,
    message: eventConfig.message,
    actionUrl: eventConfig.actionUrl,
    actionLabel: eventConfig.actionLabel,
    userIds,
    businessId,
    channels: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
    metadata: {
      invoiceId: invoice.id,
      event,
      clientId
    }
  });
}

/**
 * Notify about contract events
 */
export async function notifyContract({
  event,
  contract,
  userIds = [],
  businessId,
  clientId
}) {
  const events = {
    created: {
      title: 'New Contract Created',
      message: `Contract "${contract.title}" has been created.`,
      actionUrl: `/contracts/${contract.id}`,
      actionLabel: 'View Contract',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    sent: {
      title: 'Contract Sent for Signature',
      message: `Contract "${contract.title}" has been sent for your signature.`,
      actionUrl: `/contracts/${contract.id}/sign`,
      actionLabel: 'Sign Contract',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    signed: {
      title: 'Contract Signed',
      message: `Contract "${contract.title}" has been signed.`,
      actionUrl: `/contracts/${contract.id}`,
      actionLabel: 'View Contract',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.SUCCESS
    },
    expired: {
      title: 'Contract Expired',
      message: `Contract "${contract.title}" has expired.`,
      actionUrl: `/contracts/${contract.id}`,
      actionLabel: 'View Contract',
      priority: NOTIFICATION_PRIORITY.MEDIUM,
      type: NOTIFICATION_TYPE.WARNING
    }
  };

  const eventConfig = events[event];
  if (!eventConfig) {
    console.warn(`[NotificationService] Unknown contract event: ${event}`);
    return;
  }

  return notify({
    type: eventConfig.type || NOTIFICATION_TYPE.INFO,
    priority: eventConfig.priority,
    category: NOTIFICATION_CATEGORY.CONTRACTS,
    title: eventConfig.title,
    message: eventConfig.message,
    actionUrl: eventConfig.actionUrl,
    actionLabel: eventConfig.actionLabel,
    userIds,
    businessId,
    channels: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
    metadata: {
      contractId: contract.id,
      event,
      clientId
    }
  });
}

/**
 * Notify about team events
 */
export async function notifyTeam({
  event,
  user,
  businessId,
  userIds = []
}) {
  const events = {
    invited: {
      title: 'Team Invitation',
      message: `You have been invited to join ${user.businessName || 'the team'}.`,
      actionUrl: '/accept-invite',
      actionLabel: 'Accept Invitation',
      priority: NOTIFICATION_PRIORITY.HIGH
    },
    added: {
      title: 'Team Member Added',
      message: `${user.name || user.email} has been added to the team.`,
      actionUrl: '/user-management',
      actionLabel: 'View Team',
      priority: NOTIFICATION_PRIORITY.MEDIUM
    },
    removed: {
      title: 'Team Member Removed',
      message: `${user.name || user.email} has been removed from the team.`,
      actionUrl: '/user-management',
      actionLabel: 'View Team',
      priority: NOTIFICATION_PRIORITY.MEDIUM,
      type: NOTIFICATION_TYPE.WARNING
    },
    permission_changed: {
      title: 'Permissions Updated',
      message: 'Your permissions have been updated.',
      actionUrl: '/account-settings',
      actionLabel: 'View Settings',
      priority: NOTIFICATION_PRIORITY.MEDIUM
    }
  };

  const eventConfig = events[event];
  if (!eventConfig) {
    console.warn(`[NotificationService] Unknown team event: ${event}`);
    return;
  }

  return notify({
    type: eventConfig.type || NOTIFICATION_TYPE.INFO,
    priority: eventConfig.priority,
    category: NOTIFICATION_CATEGORY.TEAM,
    title: eventConfig.title,
    message: eventConfig.message,
    actionUrl: eventConfig.actionUrl,
    actionLabel: eventConfig.actionLabel,
    userIds,
    businessId,
    channels: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
    metadata: {
      userId: user.id || user.uid,
      event
    }
  });
}

/**
 * Notify about security events
 */
export async function notifySecurity({
  event,
  userId,
  metadata = {}
}) {
  const events = {
    password_changed: {
      title: 'Password Changed',
      message: 'Your password has been changed successfully.',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.SUCCESS
    },
    password_reset: {
      title: 'Password Reset Requested',
      message: 'A password reset has been requested for your account.',
      priority: NOTIFICATION_PRIORITY.HIGH,
      type: NOTIFICATION_TYPE.WARNING
    },
    login_new_device: {
      title: 'Login from New Device',
      message: `Login detected from a new device: ${metadata.device || 'Unknown'}.`,
      priority: NOTIFICATION_PRIORITY.MEDIUM,
      type: NOTIFICATION_TYPE.WARNING
    },
    suspicious_activity: {
      title: 'Suspicious Activity Detected',
      message: 'Unusual activity has been detected on your account.',
      priority: NOTIFICATION_PRIORITY.URGENT,
      type: NOTIFICATION_TYPE.ERROR
    }
  };

  const eventConfig = events[event];
  if (!eventConfig) {
    console.warn(`[NotificationService] Unknown security event: ${event}`);
    return;
  }

  return notify({
    type: eventConfig.type,
    priority: eventConfig.priority,
    category: NOTIFICATION_CATEGORY.SECURITY,
    title: eventConfig.title,
    message: eventConfig.message,
    actionUrl: '/account-settings',
    actionLabel: 'View Settings',
    userIds: [userId],
    channels: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
    metadata: {
      event,
      ...metadata
    }
  });
}


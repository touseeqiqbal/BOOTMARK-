/**
 * Global Status Constants
 * Ensures consistent status naming across the entire application
 */

// ============================================
// LIFECYCLE STATES
// ============================================
export const LIFECYCLE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived',
  DELETED: 'deleted'
};

// ============================================
// APPROVAL STATES
// ============================================
export const APPROVAL_STATUS = {
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UNDER_REVIEW: 'under_review'
};

// ============================================
// PAYMENT STATES
// ============================================
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  PENDING: 'pending'
};

// ============================================
// CONTRACT STATES
// ============================================
export const CONTRACT_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  SIGNED: 'signed',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
  CANCELLED: 'cancelled'
};

// ============================================
// WORK ORDER STATES
// ============================================
export const WORK_ORDER_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  INVOICED: 'invoiced',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
  PENDING: 'pending'
};

// ============================================
// INVOICE STATES
// ============================================
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

// ============================================
// ACCOUNT STATES
// ============================================
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  PENDING_REVIEW: 'pending_review',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
  REJECTED: 'rejected'
};

// ============================================
// ESTIMATE STATES
// ============================================
export const ESTIMATE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CONVERTED: 'converted'
};

// ============================================
// STATUS COLOR MAPPING
// ============================================
export const STATUS_COLORS = {
  // Success states (green)
  [LIFECYCLE_STATUS.COMPLETED]: '#10b981',
  [APPROVAL_STATUS.APPROVED]: '#10b981',
  [PAYMENT_STATUS.PAID]: '#10b981',
  [CONTRACT_STATUS.SIGNED]: '#10b981',
  [ACCOUNT_STATUS.ACTIVE]: '#10b981',
  [WORK_ORDER_STATUS.COMPLETED]: '#10b981',
  [WORK_ORDER_STATUS.PAID]: '#10b981',
  [INVOICE_STATUS.PAID]: '#10b981',
  [ESTIMATE_STATUS.ACCEPTED]: '#10b981',
  
  // Warning states (amber)
  [LIFECYCLE_STATUS.PENDING]: '#f59e0b',
  [APPROVAL_STATUS.PENDING_APPROVAL]: '#f59e0b',
  [WORK_ORDER_STATUS.SCHEDULED]: '#f59e0b',
  [PAYMENT_STATUS.OVERDUE]: '#f59e0b',
  [PAYMENT_STATUS.PARTIALLY_PAID]: '#f59e0b',
  [INVOICE_STATUS.OVERDUE]: '#f59e0b',
  [INVOICE_STATUS.PARTIALLY_PAID]: '#f59e0b',
  [CONTRACT_STATUS.EXPIRED]: '#f59e0b',
  [ESTIMATE_STATUS.EXPIRED]: '#f59e0b',
  
  // Info states (blue/gray)
  [LIFECYCLE_STATUS.DRAFT]: '#6b7280',
  [WORK_ORDER_STATUS.IN_PROGRESS]: '#3b82f6',
  [CONTRACT_STATUS.SENT]: '#3b82f6',
  [INVOICE_STATUS.SENT]: '#3b82f6',
  [ESTIMATE_STATUS.SENT]: '#3b82f6',
  [WORK_ORDER_STATUS.INVOICED]: '#3b82f6',
  
  // Error states (red)
  [LIFECYCLE_STATUS.CANCELLED]: '#ef4444',
  [APPROVAL_STATUS.REJECTED]: '#ef4444',
  [PAYMENT_STATUS.FAILED]: '#ef4444',
  [CONTRACT_STATUS.CANCELLED]: '#ef4444',
  [CONTRACT_STATUS.TERMINATED]: '#ef4444',
  [WORK_ORDER_STATUS.CANCELLED]: '#ef4444',
  [INVOICE_STATUS.CANCELLED]: '#ef4444',
  [ACCOUNT_STATUS.SUSPENDED]: '#ef4444',
  [ACCOUNT_STATUS.REJECTED]: '#ef4444',
  [ESTIMATE_STATUS.REJECTED]: '#ef4444',
  
  // Neutral states
  [LIFECYCLE_STATUS.ARCHIVED]: '#9ca3af',
  [WORK_ORDER_STATUS.ON_HOLD]: '#9ca3af',
  [ACCOUNT_STATUS.INACTIVE]: '#9ca3af',
  [ACCOUNT_STATUS.PENDING_REVIEW]: '#9ca3af'
};

// ============================================
// STATUS LABELS (Human-readable)
// ============================================
export const STATUS_LABELS = {
  // Lifecycle
  [LIFECYCLE_STATUS.DRAFT]: 'Draft',
  [LIFECYCLE_STATUS.PENDING]: 'Pending',
  [LIFECYCLE_STATUS.ACTIVE]: 'Active',
  [LIFECYCLE_STATUS.IN_PROGRESS]: 'In Progress',
  [LIFECYCLE_STATUS.COMPLETED]: 'Completed',
  [LIFECYCLE_STATUS.CANCELLED]: 'Cancelled',
  [LIFECYCLE_STATUS.ARCHIVED]: 'Archived',
  
  // Approval
  [APPROVAL_STATUS.PENDING_APPROVAL]: 'Pending Approval',
  [APPROVAL_STATUS.APPROVED]: 'Approved',
  [APPROVAL_STATUS.REJECTED]: 'Rejected',
  
  // Payment
  [PAYMENT_STATUS.UNPAID]: 'Unpaid',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.PARTIALLY_PAID]: 'Partially Paid',
  [PAYMENT_STATUS.OVERDUE]: 'Overdue',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  
  // Contract
  [CONTRACT_STATUS.DRAFT]: 'Draft',
  [CONTRACT_STATUS.SENT]: 'Sent',
  [CONTRACT_STATUS.SIGNED]: 'Signed',
  [CONTRACT_STATUS.EXPIRED]: 'Expired',
  [CONTRACT_STATUS.TERMINATED]: 'Terminated',
  [CONTRACT_STATUS.CANCELLED]: 'Cancelled',
  
  // Work Order
  [WORK_ORDER_STATUS.DRAFT]: 'Draft',
  [WORK_ORDER_STATUS.SCHEDULED]: 'Scheduled',
  [WORK_ORDER_STATUS.IN_PROGRESS]: 'In Progress',
  [WORK_ORDER_STATUS.COMPLETED]: 'Completed',
  [WORK_ORDER_STATUS.INVOICED]: 'Invoiced',
  [WORK_ORDER_STATUS.PAID]: 'Paid',
  [WORK_ORDER_STATUS.CANCELLED]: 'Cancelled',
  [WORK_ORDER_STATUS.ON_HOLD]: 'On Hold',
  
  // Invoice
  [INVOICE_STATUS.DRAFT]: 'Draft',
  [INVOICE_STATUS.SENT]: 'Sent',
  [INVOICE_STATUS.PAID]: 'Paid',
  [INVOICE_STATUS.PARTIALLY_PAID]: 'Partially Paid',
  [INVOICE_STATUS.OVERDUE]: 'Overdue',
  [INVOICE_STATUS.CANCELLED]: 'Cancelled',
  [INVOICE_STATUS.REFUNDED]: 'Refunded',
  
  // Account
  [ACCOUNT_STATUS.ACTIVE]: 'Active',
  [ACCOUNT_STATUS.PENDING_REVIEW]: 'Pending Review',
  [ACCOUNT_STATUS.SUSPENDED]: 'Suspended',
  [ACCOUNT_STATUS.INACTIVE]: 'Inactive',
  [ACCOUNT_STATUS.REJECTED]: 'Rejected',
  
  // Estimate
  [ESTIMATE_STATUS.DRAFT]: 'Draft',
  [ESTIMATE_STATUS.SENT]: 'Sent',
  [ESTIMATE_STATUS.ACCEPTED]: 'Accepted',
  [ESTIMATE_STATUS.REJECTED]: 'Rejected',
  [ESTIMATE_STATUS.EXPIRED]: 'Expired',
  [ESTIMATE_STATUS.CONVERTED]: 'Converted'
};

/**
 * Get status color
 */
export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#6b7280';
}

/**
 * Get status label
 */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

/**
 * Check if status is a success state
 */
export function isSuccessStatus(status) {
  const successStatuses = [
    LIFECYCLE_STATUS.COMPLETED,
    APPROVAL_STATUS.APPROVED,
    PAYMENT_STATUS.PAID,
    CONTRACT_STATUS.SIGNED,
    ACCOUNT_STATUS.ACTIVE,
    WORK_ORDER_STATUS.COMPLETED,
    WORK_ORDER_STATUS.PAID,
    INVOICE_STATUS.PAID,
    ESTIMATE_STATUS.ACCEPTED
  ];
  return successStatuses.includes(status);
}

/**
 * Check if status is a warning state
 */
export function isWarningStatus(status) {
  const warningStatuses = [
    LIFECYCLE_STATUS.PENDING,
    APPROVAL_STATUS.PENDING_APPROVAL,
    WORK_ORDER_STATUS.SCHEDULED,
    PAYMENT_STATUS.OVERDUE,
    PAYMENT_STATUS.PARTIALLY_PAID,
    INVOICE_STATUS.OVERDUE,
    INVOICE_STATUS.PARTIALLY_PAID,
    CONTRACT_STATUS.EXPIRED,
    ESTIMATE_STATUS.EXPIRED
  ];
  return warningStatuses.includes(status);
}

/**
 * Check if status is an error state
 */
export function isErrorStatus(status) {
  const errorStatuses = [
    LIFECYCLE_STATUS.CANCELLED,
    APPROVAL_STATUS.REJECTED,
    PAYMENT_STATUS.FAILED,
    CONTRACT_STATUS.CANCELLED,
    CONTRACT_STATUS.TERMINATED,
    WORK_ORDER_STATUS.CANCELLED,
    INVOICE_STATUS.CANCELLED,
    ACCOUNT_STATUS.SUSPENDED,
    ACCOUNT_STATUS.REJECTED,
    ESTIMATE_STATUS.REJECTED
  ];
  return errorStatuses.includes(status);
}


# Global Notification & Status System Architecture

## Overview

This document defines the comprehensive notification and status system for BOOTMARK, ensuring users receive the right notifications at the right time through the right channels.

## 1. Event → Notification Matrix

### User Actions

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **User Registration** | New User | Email | High | Info | Verify email |
| **Email Verified** | User | In-App | Medium | Success | None |
| **Password Reset Requested** | User | Email | High | Security | Reset password |
| **Password Changed** | User | Email + In-App | High | Security | None |
| **2FA Enabled** | User | Email + In-App | High | Security | None |
| **Login from New Device** | User | Email | Medium | Security | None |
| **Account Locked** | User | Email | High | Security | Contact support |

### Business & Team Management

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Business Registration** | Business Owner | Email | High | Info | Complete setup |
| **Business Approved** | Business Owner | Email + In-App | High | Success | Access granted |
| **Business Rejected** | Business Owner | Email | High | Warning | Review requirements |
| **Team Member Invited** | Invited User | Email | High | Info | Accept invitation |
| **Team Member Added** | Team Members | In-App | Low | Info | None |
| **Team Member Removed** | Removed User | Email | Medium | Warning | None |
| **Permission Changed** | Affected User | Email + In-App | Medium | Info | Review permissions |
| **Role Changed** | Affected User | Email + In-App | Medium | Info | Review access |

### Client Management

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Client Created** | Business Owner, Admins | In-App | Low | Info | None |
| **Client Invited to Portal** | Client | Email | High | Info | Set up account |
| **Client Portal Access Granted** | Client | Email | High | Success | Access portal |
| **Client Property Added** | Business Owner, Admins | In-App | Low | Info | None |
| **Client Message Sent** | Recipient | In-App + Email | Medium | Info | View message |
| **Client Profile Updated** | Client | In-App | Low | Info | None |

### Work Orders

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Work Order Created** | Assigned Employees, Client | In-App + Email | High | Info | Review work order |
| **Work Order Assigned** | Assigned Employee | In-App + Email | High | Info | Accept assignment |
| **Work Order Status Changed** | Client, Business Owner | In-App + Email | Medium | Info | View update |
| **Work Order Scheduled** | Assigned Employees, Client | In-App + Email | High | Info | Confirm schedule |
| **Work Order Started** | Client, Business Owner | In-App + Email | Medium | Info | Track progress |
| **Work Order Completed** | Client, Business Owner | In-App + Email | High | Success | Review completion |
| **Work Order Cancelled** | Client, Assigned Employees | In-App + Email | High | Warning | Review cancellation |
| **Work Order Overdue** | Assigned Employees, Business Owner | In-App + Email | High | Warning | Complete work order |
| **Work Order Comment Added** | All Participants | In-App | Medium | Info | View comment |

### Invoices

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Invoice Created** | Client | Email | High | Info | Review invoice |
| **Invoice Sent** | Client | Email | High | Info | Pay invoice |
| **Invoice Paid** | Business Owner, Client | Email + In-App | High | Success | None |
| **Invoice Overdue** | Client, Business Owner | Email + In-App | High | Warning | Pay invoice |
| **Invoice Cancelled** | Client | Email | Medium | Info | None |
| **Payment Received** | Business Owner | In-App + Email | High | Success | None |
| **Payment Failed** | Client, Business Owner | Email + In-App | High | Error | Update payment method |

### Contracts

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Contract Created** | Client | Email | High | Info | Review contract |
| **Contract Sent for Signature** | Client | Email | High | Info | Sign contract |
| **Contract Signed** | Business Owner, Client | Email + In-App | High | Success | Download copy |
| **Contract Expiring Soon** | Client, Business Owner | Email + In-App | Medium | Warning | Renew contract |
| **Contract Expired** | Client, Business Owner | Email + In-App | High | Warning | Renew contract |
| **Contract Cancelled** | Client | Email | Medium | Info | None |

### Forms & Submissions

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Form Submitted** | Form Owner | In-App + Email | High | Info | Review submission |
| **Form Submission Approved** | Submitter | Email + In-App | Medium | Success | None |
| **Form Submission Rejected** | Submitter | Email + In-App | Medium | Warning | Review feedback |
| **Form Shared** | Recipient | Email | High | Info | Fill out form |
| **Form Template Created** | Form Owner | In-App | Low | Info | None |

### Scheduling

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **Event Scheduled** | Assigned Employees, Client | In-App + Email | High | Info | Confirm attendance |
| **Event Reminder (24h)** | Assigned Employees, Client | In-App + Email | Medium | Info | Prepare for event |
| **Event Reminder (1h)** | Assigned Employees | In-App + Push | High | Info | Get ready |
| **Event Cancelled** | Assigned Employees, Client | In-App + Email | High | Warning | None |
| **Event Rescheduled** | Assigned Employees, Client | In-App + Email | High | Info | Confirm new time |
| **Check-in Required** | Assigned Employee | In-App + Push | High | Info | Check in |
| **Check-out Reminder** | Assigned Employee | In-App | Medium | Info | Check out |

### System & Security

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **API Rate Limit Exceeded** | User | In-App | Medium | Warning | Wait before retry |
| **Suspicious Activity Detected** | User, Admins | Email + In-App | High | Security | Review activity |
| **Data Export Requested** | User | Email | Medium | Info | Download data |
| **Backup Completed** | Business Owner | Email | Low | Info | None |
| **System Maintenance Scheduled** | All Users | Email + In-App | Medium | Info | Plan accordingly |
| **Integration Error** | Business Owner | Email + In-App | High | Error | Fix integration |

### Integrations

| Event | Who Gets Notified | Channel | Priority | Type | Action Required |
|-------|------------------|---------|----------|------|-----------------|
| **QuickBooks Connected** | Business Owner | In-App + Email | Medium | Success | None |
| **QuickBooks Disconnected** | Business Owner | Email + In-App | High | Warning | Reconnect |
| **QuickBooks Sync Failed** | Business Owner | Email + In-App | High | Error | Fix sync |
| **QuickBooks Sync Success** | Business Owner | In-App | Low | Success | None |
| **Payment Gateway Connected** | Business Owner | In-App | Medium | Success | None |
| **Payment Gateway Error** | Business Owner | Email + In-App | High | Error | Fix gateway |

## 2. Notification Channels

### Channel Definitions

1. **In-App Notifications**
   - Real-time via Socket.IO
   - Persistent in notification center
   - Read/unread states
   - Action buttons/links
   - **Use for**: All events, primary channel

2. **Email Notifications**
   - SMTP-based (per-user config)
   - HTML templates
   - Action links
   - **Use for**: Important events, external users, summaries

3. **Push Notifications** (Future)
   - Browser push API
   - Mobile app (if implemented)
   - **Use for**: Urgent/time-sensitive events

4. **SMS** (Optional/Critical Only)
   - Twilio or similar
   - **Use for**: Critical security events only

5. **Webhooks** (Optional)
   - External integrations
   - **Use for**: Third-party system integrations

### Channel Selection Rules

- **High Priority + Action Required** → All channels (In-App + Email + Push)
- **High Priority + No Action** → In-App + Email
- **Medium Priority** → In-App + Email (if user preference)
- **Low Priority** → In-App only
- **Security Events** → Always Email + In-App

## 3. Global Status System

### Status Naming Convention

**Format**: `{entity}_{status}`

**Standard Statuses** (applied consistently):

```javascript
// Lifecycle States
DRAFT = 'draft'
PENDING = 'pending'
ACTIVE = 'active'
IN_PROGRESS = 'in_progress'
COMPLETED = 'completed'
CANCELLED = 'cancelled'
ARCHIVED = 'archived'

// Approval States
PENDING_APPROVAL = 'pending_approval'
APPROVED = 'approved'
REJECTED = 'rejected'

// Payment States
UNPAID = 'unpaid'
PAID = 'paid'
PARTIALLY_PAID = 'partially_paid'
OVERDUE = 'overdue'
REFUNDED = 'refunded'

// Contract States
DRAFT = 'draft'
SENT = 'sent'
SIGNED = 'signed'
EXPIRED = 'expired'
TERMINATED = 'terminated'

// Work Order States
DRAFT = 'draft'
SCHEDULED = 'scheduled'
IN_PROGRESS = 'in_progress'
COMPLETED = 'completed'
INVOICED = 'invoiced'
CANCELLED = 'cancelled'
ON_HOLD = 'on_hold'

// Account States
ACTIVE = 'active'
PENDING_REVIEW = 'pending_review'
SUSPENDED = 'suspended'
INACTIVE = 'inactive'
```

### Status Color Mapping

```javascript
const STATUS_COLORS = {
  // Success states
  completed: '#10b981',
  approved: '#10b981',
  paid: '#10b981',
  signed: '#10b981',
  active: '#10b981',
  
  // Warning states
  pending: '#f59e0b',
  pending_approval: '#f59e0b',
  scheduled: '#f59e0b',
  overdue: '#f59e0b',
  partially_paid: '#f59e0b',
  
  // Info states
  draft: '#6b7280',
  in_progress: '#3b82f6',
  sent: '#3b82f6',
  
  // Error states
  cancelled: '#ef4444',
  rejected: '#ef4444',
  expired: '#ef4444',
  suspended: '#ef4444',
  unpaid: '#ef4444',
}
```

## 4. Notification Preferences

### User Preferences Structure

```javascript
{
  userId: string,
  businessId: string,
  preferences: {
    channels: {
      inApp: boolean,
      email: boolean,
      push: boolean,
      sms: boolean
    },
    frequency: 'realtime' | 'digest' | 'disabled',
    digestSchedule: 'daily' | 'weekly' | null,
    categories: {
      workOrders: { inApp: boolean, email: boolean },
      invoices: { inApp: boolean, email: boolean },
      contracts: { inApp: boolean, email: boolean },
      forms: { inApp: boolean, email: boolean },
      team: { inApp: boolean, email: boolean },
      security: { inApp: boolean, email: boolean },
      system: { inApp: boolean, email: boolean }
    },
    quietHours: {
      enabled: boolean,
      start: string, // "22:00"
      end: string,    // "08:00"
      timezone: string
    }
  }
}
```

## 5. Notification Delivery Guarantees

### Retry Logic

- **Email**: 3 retries with exponential backoff (1min, 5min, 30min)
- **In-App**: Immediate, no retry (Socket.IO handles reconnection)
- **Push**: 2 retries (1min, 5min)

### Failure Handling

- Log all failures
- Fallback to email if in-app fails
- Alert admins after 3 consecutive failures
- Store failed notifications for manual review

## 6. Security & Compliance

### Data Masking

- Mask sensitive data in notifications (SSN, credit cards)
- Show only necessary information
- Full details available via secure links

### Access Control

- Tenant isolation (never cross-tenant)
- Role-based notification content
- Client notifications only show client-visible data

### Audit Logging

- Log all notifications sent
- Track delivery status
- Store for compliance (GDPR, etc.)
- Retention: 90 days (configurable)

## 7. Performance & Scalability

### Architecture

- **Event Queue**: Redis/Bull for async processing
- **Socket.IO**: Real-time delivery
- **Email Queue**: Separate queue for email delivery
- **Database**: Firestore for notification history

### Optimization

- Batch notifications when possible
- Deduplicate similar notifications
- Group notifications in UI
- Lazy load notification history

## 8. Implementation Priority

### Phase 1: Core System (Week 1)
1. ✅ Event → Notification mapping
2. ✅ Status constants
3. ✅ Notification service utility
4. ✅ Enhanced NotificationCenter

### Phase 2: Integration (Week 2)
1. ✅ Work Order notifications
2. ✅ Invoice notifications
3. ✅ Contract notifications
4. ✅ Client portal notifications

### Phase 3: Preferences & Polish (Week 3)
1. ✅ Notification preferences UI
2. ✅ Digest notifications
3. ✅ Quiet hours
4. ✅ Notification history

### Phase 4: Advanced Features (Week 4)
1. ⏳ Push notifications
2. ⏳ SMS (critical only)
3. ⏳ Webhooks
4. ⏳ Advanced analytics


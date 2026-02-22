import React from 'react';
import { FileText, Users, ClipboardList, Package, Calendar, CreditCard } from 'lucide-react';
import Button from './Button';
import '../../styles/EmptyState.css';

/**
 * Empty State Component
 * Engaging empty states for list pages with CTAs and helpful tips
 */

const defaultIcons = {
  workOrders: ClipboardList,
  clients: Users,
  invoices: CreditCard,
  estimates: FileText,
  materials: Package,
  schedule: Calendar,
  default: FileText,
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  type = 'default',
  className = '',
}) {
  const IconComponent = icon || defaultIcons[type] || defaultIcons.default;

  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        <IconComponent size={64} aria-hidden="true" />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      <div className="empty-state-actions">
        {actionLabel && onAction && (
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant="ghost" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

// Pre-configured empty states for common types
export function EmptyWorkOrders({ onCreate }) {
  return (
    <EmptyState
      type="workOrders"
      title="No Work Orders Yet"
      description="Get started by creating your first work order. Track jobs, assign crews, and manage your field service operations."
      actionLabel="Create Work Order"
      onAction={onCreate}
    />
  );
}

export function EmptyClients({ onAdd }) {
  return (
    <EmptyState
      type="clients"
      title="No Clients Yet"
      description="Add your first client to start managing relationships, properties, and service history."
      actionLabel="Add Client"
      onAction={onAdd}
    />
  );
}

export function EmptyInvoices({ onCreate }) {
  return (
    <EmptyState
      type="invoices"
      title="No Invoices Yet"
      description="Create invoices from completed work orders or generate them manually. Track payments and manage your finances."
      actionLabel="Create Invoice"
      onAction={onCreate}
    />
  );
}

export function EmptyEstimates({ onCreate }) {
  return (
    <EmptyState
      type="estimates"
      title="No Estimates Yet"
      description="Create professional estimates for potential jobs. Convert them to work orders when approved."
      actionLabel="Create Estimate"
      onAction={onCreate}
    />
  );
}

export function EmptyMaterials({ onAdd }) {
  return (
    <EmptyState
      type="materials"
      title="No Materials Yet"
      description="Add materials and inventory items to track usage, costs, and availability across your jobs."
      actionLabel="Add Material"
      onAction={onAdd}
    />
  );
}

export function EmptySchedule({ onCreate }) {
  return (
    <EmptyState
      type="schedule"
      title="No Scheduled Jobs"
      description="Schedule work orders, assign crews, and manage your calendar. Set up recurring jobs for regular clients."
      actionLabel="Schedule Job"
      onAction={onCreate}
    />
  );
}

